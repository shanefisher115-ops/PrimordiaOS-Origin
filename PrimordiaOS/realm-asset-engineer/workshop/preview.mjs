// Headless WebGL previewer: a hidden Chrome/Edge page (puppeteer-core, no browser download) renders each
// candidate .glb with the genre's slot looks and lighting preset: a hero WebP, an 8-frame turntable strip
// (WebP) and a JPEG for the vision judge. Seconds per piece instead of Unreal's minutes.
//
// No server: every request from the page is answered from disk by request interception, so nothing listens.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { PATHS, within } from './paths.mjs';

const ORIGIN = 'http://rae.preview';
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary' };

export function findBrowser(explicit) {
  const candidates = [
    explicit,
    process.env.RAE_BROWSER,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

const fromDataUrl = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

export class Previewer {
  constructor({ browserPath, log = () => {}, restartEvery = 150, timeoutMs = 90_000 } = {}) {
    this.browserPath = findBrowser(browserPath);
    this.log = log;
    this.restartEvery = restartEvery;
    this.timeoutMs = timeoutMs;
    this.files = new Map(); // /glb/<key> -> file path
    this.renders = 0;
    this.gl = null;
  }

  get available() { return !!this.browserPath; }

  async #start() {
    if (!this.browserPath) throw new Error('no Chrome or Edge found for the WebGL previewer (set RAE_BROWSER)');
    this.browser = await puppeteer.launch({
      executablePath: this.browserPath,
      headless: true,
      args: ['--no-first-run', '--no-default-browser-check', '--mute-audio', '--disable-extensions',
        '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=800,600'],
    });
    this.page = await this.browser.newPage();
    this.page.on('console', (m) => { if (m.type() === 'error') this.log(`preview page: ${m.text()}`); });
    this.page.on('pageerror', (e) => this.log(`preview page error: ${e.message}`));
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => this.#serve(req).catch((e) => {
      this.log(`preview: ${req.url()} failed: ${e.message}`);
      req.respond({ status: 404, contentType: 'text/plain', body: 'not found' }).catch(() => {});
    }));
    await this.page.goto(`${ORIGIN}/preview/render.html`, { waitUntil: 'load' });
    await this.page.waitForFunction('window.previewReady === true', { timeout: 30_000 });
    this.renders = 0;
  }

  async #serve(req) {
    const url = new URL(req.url());
    if (url.origin !== ORIGIN) return req.respond({ status: 403, contentType: 'text/plain', body: 'offline' });
    if (url.pathname === '/favicon.ico') return req.respond({ status: 204, body: '' });
    let file = null;
    if (url.pathname.startsWith('/preview/')) file = within(PATHS.preview, url.pathname.slice('/preview/'.length));
    else if (url.pathname.startsWith('/vendor/three/')) file = within(PATHS.three, url.pathname.slice('/vendor/three/'.length));
    else if (url.pathname.startsWith('/glb/')) file = this.files.get(url.pathname);
    if (!file) return req.respond({ status: 404, contentType: 'text/plain', body: 'not found' });
    const body = await readFile(file);
    return req.respond({ status: 200, contentType: TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', body });
  }

  /** Renders one .glb. Returns { hero, strip, vision } Buffers (WebP, WebP, JPEG) plus size and timing. */
  async render(glbPath, pack, opts = {}) {
    if (!this.page || this.renders >= this.restartEvery) { await this.stop(); await this.#start(); }
    const key = `/glb/${this.renders}-${Date.now().toString(36)}.glb`;
    this.files.set(key, glbPath);
    try {
      const out = await Promise.race([
        this.page.evaluate((args) => window.renderAsset(args), { glbUrl: key, pack, ...opts }),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`preview timed out after ${this.timeoutMs} ms`)), this.timeoutMs)),
      ]);
      this.renders++;
      this.gl = out.gl;
      return { hero: fromDataUrl(out.hero), strip: fromDataUrl(out.strip), vision: fromDataUrl(out.vision), size: out.size, ms: out.ms, gl: out.gl };
    } catch (e) {
      await this.stop(); // a wedged or crashed page restarts on the next render
      throw e;
    } finally {
      this.files.delete(key);
    }
  }

  async stop() {
    const b = this.browser;
    this.browser = null; this.page = null;
    if (b) await b.close().catch(() => {});
  }
}
