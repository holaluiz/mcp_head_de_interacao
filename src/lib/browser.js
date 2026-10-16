// Localiza um Chrome/Edge/Chromium instalado e abre via puppeteer-core
// (sem baixar navegador). CHROME_PATH força um executável.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let _path;
export function findBrowser() {
  if (_path !== undefined) return _path;
  const env = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  const c = [];
  if (env) c.push(env);
  if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const r of roots) c.push(path.join(r, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    for (const r of roots) c.push(path.join(r, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    for (const r of roots) c.push(path.join(r, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'));
    for (const r of roots) c.push(path.join(r, 'Chromium', 'Application', 'chrome.exe'));
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser');
  } else {
    for (const b of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser']) {
      const r = spawnSync('which', [b], { encoding: 'utf8' });
      if (r.status === 0 && r.stdout.trim()) c.push(r.stdout.trim());
    }
  }
  _path = c.find((p) => p && existsSync(p)) || null;
  return _path;
}

export function comoInstalarNavegador() {
  return 'Nenhum Chrome/Edge/Chromium encontrado. Instale o Google Chrome ou defina CHROME_PATH com o caminho do executável.';
}

export async function abrirNavegador() {
  const exe = findBrowser();
  if (!exe) throw new Error(comoInstalarNavegador());
  let puppeteer;
  try { puppeteer = (await import('puppeteer-core')).default; } catch { throw new Error('puppeteer-core não está instalado. Rode: npm install puppeteer-core (na pasta do MCP).'); }
  return puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
    defaultViewport: null,
  });
}
