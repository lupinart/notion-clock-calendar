import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const files = { 'index.html': 'text/html', 'calendar.html': 'text/html',
  'widgets.css': 'text/css', 'widgets.mjs': 'text/javascript', 'dates.mjs': 'text/javascript' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const name = url.pathname.slice(1);
  if (name === 'harness') {
    const kind = url.searchParams.get('kind');
    const base = process.env.SITE_BASE_URL || `http://localhost:${server.address().port}/`;
    const source = new URL(kind === 'calendar' ? 'calendar.html' : 'index.html', base).href;
    res.setHeader('Content-Type', 'text/html');
    res.end(`<style>body{margin:0}iframe{border:0;margin:20px;width:320px;height:460px}</style><iframe title="widget" id="widget" src="${source}"></iframe>`);
    return;
  }
  if (!files[name]) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', files[name]);
  res.end(await readFile(new URL(name, import.meta.url)));
});

function contrast(a, b) {
  const luminance = value => {
    const [r, g, b] = value.match(/[\d.]+/g).slice(0, 3).map(n => {
      const s = +n / 255;
      return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 380, height: 520 }, colorScheme: null, timezoneId: 'America/New_York' });
  await page.clock.install({ time: new Date('2026-11-09T15:59:00Z') });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const kind of ['clock', 'calendar']) {
    await page.goto(`http://127.0.0.1:${server.address().port}/harness?kind=${kind}`);
    const frame = page.frameLocator('#widget');
    await frame.locator(kind === 'clock' ? '#clock-time' : '#calendar-days td').first().waitFor();
    if (kind === 'clock') {
      assert.equal(await frame.locator('#clock-time').textContent(), '23:59');
      assert.ok((await frame.locator('#clock-date').textContent()).includes('NOV 09'));
    } else {
      assert.equal(await frame.locator('#calendar-days td').count(), 42);
      assert.equal(await frame.locator('[aria-current="date"]').getAttribute('datetime'), '2026-11-09');
      await frame.locator('#next').click();
      assert.equal(await frame.locator('#month-title').textContent(), 'DECEMBER 2026');
      await frame.locator('#next').click();
      assert.equal(await frame.locator('#month-title').textContent(), 'JANUARY 2027');
      await frame.locator('#previous').click();
      assert.equal(await frame.locator('#month-title').textContent(), 'DECEMBER 2026');
      await frame.locator('#today').click();
      assert.equal(await frame.locator('#month-title').textContent(), 'NOVEMBER 2026');
    }
    for (const [scheme, background, pixel] of [
      ['light', '#f5e8dd', [245, 232, 221]],
      ['dark', '#123456', [18, 52, 86]],
      ['light', '#f5e8dd', [245, 232, 221]],
    ]) {
      await page.evaluate(({ scheme, background }) => {
        document.documentElement.style.colorScheme = scheme;
        document.body.style.background = background;
      }, { scheme, background });
      await page.clock.runFor(100);
      const screenshot = await page.screenshot();
      const decoded = spawnSync(process.env.PYTHON || 'python3', ['-c',
        'import io,json,sys;from PIL import Image;im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB");print(json.dumps(list(im.getpixel((22,22)))))'],
        { input: screenshot });
      assert.equal(decoded.status, 0, decoded.stderr.toString());
      assert.deepEqual(JSON.parse(decoded.stdout.toString()), pixel, `${kind}/${scheme}: outer iframe pixel must equal parent`);
      const colors = await frame.locator('.card').evaluate(element => {
        const style = getComputedStyle(element);
        const root = getComputedStyle(document.documentElement);
        const muted = getComputedStyle(document.querySelector('p,th'));
        return { bg: style.backgroundColor, ink: style.color, muted: muted.color,
          canvas: root.backgroundColor, body: getComputedStyle(document.body).backgroundColor };
      });
      assert.equal(colors.bg, scheme === 'dark' ? 'rgb(56, 56, 54)' : 'rgb(249, 248, 247)');
      assert.equal(colors.canvas, 'rgba(0, 0, 0, 0)');
      assert.equal(colors.body, 'rgba(0, 0, 0, 0)');
      assert.ok(contrast(colors.bg, colors.ink) >= 4.5);
      assert.ok(contrast(colors.bg, colors.muted) >= 4.5);
      if (process.env.QA_DIR) {
        await mkdir(process.env.QA_DIR, { recursive: true });
        await writeFile(`${process.env.QA_DIR}/${kind}-${scheme}.png`, screenshot);
      }
      console.log(`${kind}/${scheme}: transparent outer canvas, themed card, readable text`);
    }
    await page.locator('#widget').evaluate(element => { element.style.width = '240px'; });
    const fits = await frame.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth);
    assert.ok(fits, `${kind}: no horizontal overflow at 240px`);
  }
  // While already loaded, Taiwan midnight must advance the calendar highlight.
  await page.clock.setFixedTime(new Date('2026-11-09T16:00:00Z'));
  await page.clock.runFor(1100);
  assert.equal(await page.frameLocator('#widget').locator('[aria-current="date"]').getAttribute('datetime'), '2026-11-10');
  assert.deepEqual(errors, []);
  console.log('Month navigation, return to today, Taiwan midnight, narrow width, and no page errors passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
