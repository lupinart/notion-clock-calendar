import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const files = { 'todo.html': 'text/html', 'widgets.css': 'text/css', 'todo.css': 'text/css',
  'todo.mjs': 'text/javascript', 'todo-store.mjs': 'text/javascript' };
const server = createServer(async (req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1);
  if (name === 'harness') {
    const base = process.env.SITE_BASE_URL || `http://localhost:${server.address().port}/`;
    const source = new URL('todo.html', base).href;
    res.setHeader('Content-Type', 'text/html');
    res.end(`<style>body{margin:0}iframe{border:0;margin:20px;width:320px;height:460px}</style><iframe id="widget" title="todo" src="${source}"></iframe>`);
    return;
  }
  if (!files[name]) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', files[name]);
  res.end(await readFile(new URL(name, import.meta.url)));
});
function contrast(a, b) {
  const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
    .map(n => n / 255 <= .04045 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4)
    .reduce((total, n, i) => total + n * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 380, height: 520 }, colorScheme: null });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const harness = `http://127.0.0.1:${server.address().port}/harness`;
  await page.goto(harness);
  const frame = page.frameLocator('#widget');
  const input = frame.locator('#task-input');
  await input.waitFor();
  assert.equal(await input.isEnabled(), true);
  const add = async text => { await input.fill(text); await frame.getByRole('button', { name: '新增', exact: true }).click(); };
  const literal = '<img src=x onerror=alert(1)> 測試文字';
  await input.fill(literal);
  await input.press('Enter');
  await add('記下下一個小步驟');
  assert.equal(await frame.locator('.task-row').count(), 2);
  assert.equal(await frame.locator('.task-text').first().textContent(), literal);
  assert.equal(await frame.locator('.task-list img').count(), 0);
  await frame.getByRole('checkbox').first().check();
  assert.equal(await frame.getByRole('checkbox').first().evaluate(el => el === document.activeElement), true);
  await page.reload();
  await input.waitFor();
  assert.equal(await frame.locator('.task-row').count(), 2);
  assert.equal(await frame.getByRole('checkbox').first().isChecked(), true);
  assert.equal(await frame.locator('#task-count').textContent(), '1 件待辦');
  for (const [scheme, background, pixel] of [
    ['light', '#f5e8dd', [245, 232, 221]], ['dark', '#123456', [18, 52, 86]], ['light', '#f5e8dd', [245, 232, 221]],
  ]) {
    await page.evaluate(({ scheme, background }) => {
      document.documentElement.style.colorScheme = scheme;
      document.body.style.background = background;
    }, { scheme, background });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const shot = await page.screenshot();
    const decoded = spawnSync(process.env.PYTHON || 'python3', ['-c',
      'import io,json,sys;from PIL import Image;im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB");print(json.dumps(list(im.getpixel((22,22)))))'], { input: shot });
    assert.equal(decoded.status, 0, decoded.stderr.toString());
    assert.deepEqual(JSON.parse(decoded.stdout.toString()), pixel, `${scheme}: outer iframe must remain transparent`);
    const colors = await frame.locator('.card').evaluate(el => ({
      bg: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el).color,
      muted: getComputedStyle(document.querySelector('.todo-footer')).color,
    }));
    assert.equal(colors.bg, scheme === 'dark' ? 'rgb(56, 56, 54)' : 'rgb(249, 248, 247)');
    assert.ok(contrast(colors.bg, colors.ink) >= 4.5);
    assert.ok(contrast(colors.bg, colors.muted) >= 4.5);
    if (process.env.QA_DIR) {
      await mkdir(process.env.QA_DIR, { recursive: true });
      await writeFile(`${process.env.QA_DIR}/todo-${scheme}.png`, shot);
    }
    console.log(`todo/${scheme}: transparent outer canvas, clock-matching card, readable text`);
  }
  await frame.getByRole('button', { name: '清除已完成', exact: true }).click();
  assert.equal(await frame.locator('.task-row').count(), 1);
  assert.equal(await frame.locator('.task-text').textContent(), '記下下一個小步驟');
  await frame.getByRole('button', { name: '刪除：記下下一個小步驟', exact: true }).click();
  assert.equal(await frame.locator('.task-row').count(), 0);
  // Two embeds in one browser must not overwrite one another's list.
  const peer = await context.newPage();
  await peer.goto(harness);
  const peerFrame = peer.frameLocator('#widget');
  await peerFrame.locator('#task-input').fill('另一個分頁的待辦');
  await peerFrame.getByRole('button', { name: '新增', exact: true }).click();
  await frame.getByText('另一個分頁的待辦', { exact: true }).waitFor({ timeout: 2000 });
  await add('這個分頁的待辦');
  await peerFrame.getByText('這個分頁的待辦', { exact: true }).waitFor({ timeout: 2000 });
  // Simulate an update not yet reflected in this page's in-memory list.
  await frame.locator('body').evaluate(() => {
    const tasks = JSON.parse(localStorage.getItem('lupin.todo.v1'));
    tasks.push({ id: 'other-page', text: '不能被覆蓋的待辦', completed: false });
    localStorage.setItem('lupin.todo.v1', JSON.stringify(tasks));
  });
  await input.fill('稍後重試');
  await frame.getByRole('button', { name: '新增', exact: true }).click();
  assert.equal(await frame.locator('.task-row').count(), 3);
  assert.equal(await input.inputValue(), '稍後重試');
  assert.equal(await frame.locator('#save-status').isVisible(), true);
  await frame.getByRole('button', { name: '新增', exact: true }).click();
  assert.equal(await frame.locator('.task-row').count(), 4);
  await peer.close();
  while (await frame.locator('.task-row').count()) await frame.locator('.delete-task').first().click();
  await add('這是一段很長的待辦文字'.repeat(10));
  await page.locator('#widget').evaluate(el => { el.style.width = '240px'; });
  assert.equal(await frame.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  // A write failure must leave both old tasks and the user's new input intact.
  await frame.locator('body').evaluate(() => {
    window.testOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new Error('Test storage denied'); };
  });
  await input.fill('這次不能保存');
  await frame.getByRole('button', { name: '新增', exact: true }).click();
  assert.equal(await frame.locator('.task-row').count(), 1);
  assert.equal(await input.inputValue(), '這次不能保存');
  assert.equal(await frame.locator('#save-status').isVisible(), true);
  await frame.locator('body').evaluate(() => {
    Storage.prototype.setItem = window.testOriginalSetItem;
    localStorage.setItem('lupin.todo.v1', 'invalid JSON');
  });
  await page.reload();
  await input.waitFor();
  assert.equal(await input.isDisabled(), true);
  assert.equal(await frame.locator('#save-status').isVisible(), true);
  assert.equal(await frame.locator('body').evaluate(() => localStorage.getItem('lupin.todo.v1')), 'invalid JSON');
  assert.deepEqual(errors, []);
  console.log('Add, Enter, complete, keyboard focus, reload persistence, clear completed, delete, narrow width, and storage failure checks passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
