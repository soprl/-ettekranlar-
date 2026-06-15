#!/usr/bin/env node
/**
 * 38inc.html (458) animasyonunu MP4 olarak kaydeder.
 * Kullanım: npm run record:38inc
 * Önce: npm start
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EXPORT_DIR = path.join(ROOT, 'export');
const URL = 'http://127.0.0.1:3000/38inc.html';
/** 10 durak tam tur (~93 sn) + pay */
const RECORD_SEC = Number(process.env.RECORD_SEC || 100);
const PORT = process.env.PORT || '3000';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

function hasFfmpeg() {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    p.on('error', () => resolve(false));
    p.on('close', (code) => resolve(code === 0));
  });
}

async function waitForServer(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(800) });
      if (res.ok) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Sunucu yanıt vermiyor: ${url}\nÖnce: npm start`);
}

async function main() {
  const pageUrl = URL.replace('3000', PORT);
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  console.log('Sunucu kontrol ediliyor…');
  await waitForServer(pageUrl);

  console.log(`Kayıt: ${RECORD_SEC}s · 1920×674 · ${pageUrl}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 674 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: EXPORT_DIR,
      size: { width: 1920, height: 674 },
    },
  });

  const page = await context.newPage();
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.waitForTimeout(RECORD_SEC * 1000);

  await context.close();
  await browser.close();

  const webms = fs
    .readdirSync(EXPORT_DIR)
    .filter((f) => f.endsWith('.webm'))
    .map((f) => ({ f, t: fs.statSync(path.join(EXPORT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);

  if (!webms.length) {
    console.error('Video dosyası oluşmadı.');
    process.exit(1);
  }

  const webmPath = path.join(EXPORT_DIR, webms[0].f);
  const mp4Path = path.join(EXPORT_DIR, '38inc.mp4');

  if (await hasFfmpeg()) {
    console.log('MP4 dönüştürülüyor (ffmpeg)…');
    await run('ffmpeg', [
      '-y',
      '-i',
      webmPath,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '18',
      '-preset',
      'medium',
      mp4Path,
    ]);
    console.log(`\nTamam: ${mp4Path}`);
  } else {
    console.log(`\nffmpeg yok — WebM: ${webmPath}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
