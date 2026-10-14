/* eslint-disable no-console -- command-line script: printing the report is its job */
/*
 * Performance snapshot of a production build, with the API mocked in the browser (same mock as
 * the E2E tests), so the numbers measure the frontend only.
 *
 * Usage: start a production server, then
 *   node tests/perf/measure.mjs http://localhost:3100
 * It emulates a mid-range phone: 4x CPU slowdown + "4G" network (9 Mbps, 85 ms RTT).
 */
import { chromium } from '@playwright/test';
import { mockApi } from '../e2e/support/mock-api.js';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const PAGES = [
  '/login',
  '/dashboard',
  '/reports/tasks',
  '/users',
  '/inventories',
  '/master?tab=vendors',
];

const browser = await chromium.launch();

async function measure(path) {
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  if (path !== '/login') await mockApi(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 85,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (1.5 * 1024 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  let jsBytes = 0;
  let cssBytes = 0;
  cdp.on('Network.loadingFinished', (e) => {
    const type = types.get(e.requestId);
    if (type === 'Script') jsBytes += e.encodedDataLength;
    if (type === 'Stylesheet') cssBytes += e.encodedDataLength;
  });
  const types = new Map();
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));

  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: 0 };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.longTasks += Math.max(0, e.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  });

  const response = await page.goto(path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return {
      ttfb: nav.responseStart,
      fcp: fcp?.startTime ?? 0,
      lcp: window.__perf.lcp,
      tbt: window.__perf.longTasks,
      cls: window.__perf.cls,
      domContentLoaded: nav.domContentLoadedEventEnd,
    };
  });
  await context.close();
  return {
    path,
    status: response?.status(),
    ...metrics,
    jsKB: jsBytes / 1024,
    cssKB: cssBytes / 1024,
  };
}

const rows = [];
for (const path of PAGES) rows.push(await measure(path));
await browser.close();

const ms = (n) => `${Math.round(n)} ms`;
console.log('\nMobile emulation (4x CPU, 4G), cold cache:\n');
console.log('page                 TTFB    FCP      LCP      TBT     CLS    JS (transfer)  CSS');
for (const r of rows) {
  console.log(
    `${r.path.padEnd(20)} ${ms(r.ttfb).padEnd(7)} ${ms(r.fcp).padEnd(8)} ${ms(r.lcp).padEnd(8)} ${ms(r.tbt).padEnd(7)} ${r.cls.toFixed(3).padEnd(6)} ${`${r.jsKB.toFixed(0)} KB`.padEnd(14)} ${r.cssKB.toFixed(0)} KB`,
  );
}

// Server throughput: every page is rendered per request (CSP nonce).
async function load(path, total, concurrency) {
  const times = [];
  let next = 0;
  const worker = async () => {
    while (next < total) {
      next += 1;
      const start = performance.now();
      const res = await fetch(`${BASE}${path}`, { headers: { cookie: 'safeops_session=perf' } });
      await res.arrayBuffer();
      times.push(performance.now() - start);
    }
  };
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const elapsed = (performance.now() - t0) / 1000;
  times.sort((a, b) => a - b);
  const pct = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];
  return { path, rps: total / elapsed, p50: pct(0.5), p95: pct(0.95) };
}

console.log('\nServer (HTML render per request), 300 requests, 10 concurrent:\n');
for (const path of ['/login', '/dashboard']) {
  const r = await load(path, 300, 10);
  console.log(`${path.padEnd(12)} ${r.rps.toFixed(0)} req/s   p50 ${ms(r.p50)}   p95 ${ms(r.p95)}`);
}
