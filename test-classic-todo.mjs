import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const original = 'https://embeds.widgetsfornotion.com/sleek-blue-todo-list/v1.9d1c23e5c942f5c8.4965b8f073efb5adeee2621f9150fecf';
const files = { 'todo.html': 'text/html', 'classic-todo.css': 'text/css', 'classic-todo.mjs': 'text/javascript', 'todo-store.mjs': 'text/javascript' };
const server = createServer(async (req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1);
  if (name === 'harness') {
    const base = process.env.SITE_BASE_URL || `http://localhost:${server.address().port}/`;
    res.setHeader('Content-Type', 'text/html');
    res.end(`<style>body{margin:0}iframe{border:0;width:320px;height:440px;margin:20px}</style><iframe title="todo" id="widget" src="${new URL('todo.html', base).href}"></iframe>`);
  } else if (files[name]) {
    res.setHeader('Content-Type', files[name]);
    res.end(await readFile(new URL(name, import.meta.url)));
  } else res.writeHead(404).end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 460 }, colorScheme: null });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.SITE_BASE_URL || `http://localhost:${server.address().port}/`;
  await page.goto(new URL('todo.html', base).href);
  await page.getByRole('heading', { name: 'Today Tasks', exact: true }).waitFor();
  assert.equal(page.frames().length, 1, 'Must be an independent implementation, not a remote iframe');
  assert.equal(await page.getByText('Customize', { exact: true }).count(), 0);
  const input = page.getByRole('textbox', { name: 'New task' });
  const add = async text => { await input.fill(text); await page.getByRole('button', { name: 'Add', exact: true }).click(); };
  await input.fill('整理今天的待辦');
  await input.press('Enter');
  await add('回覆一封信');
  const ownShots = {};
  const setOwnTheme = async theme => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: theme, exact: true }).click();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  };
  for (const theme of ['Light', 'Dark']) {
    await setOwnTheme(theme);
    await page.getByRole('heading', { name: 'Today Tasks' }).click();
    ownShots[theme.toLowerCase()] = await page.screenshot({ animations: 'disabled' });
    if (process.env.QA_DIR) {
      await mkdir(process.env.QA_DIR, { recursive: true });
      await writeFile(`${process.env.QA_DIR}/classic-${theme.toLowerCase()}.png`, ownShots[theme.toLowerCase()]);
    }
  }
  if (process.env.COMPARE_ORIGINAL === '1') {
    const reference = await context.newPage();
    await reference.goto(original);
    await reference.locator('#taskInput').fill('整理今天的待辦');
    await reference.getByRole('button', { name: 'Add', exact: true }).click();
    await reference.locator('#taskInput').fill('回覆一封信');
    await reference.getByRole('button', { name: 'Add', exact: true }).click();
    for (const theme of ['Light', 'Dark']) {
      await reference.getByRole('button', { name: 'Settings', exact: true }).click();
      await reference.getByRole('button', { name: theme, exact: true }).click();
      await reference.getByRole('button', { name: 'Close settings', exact: true }).click();
      await reference.locator('.wf-sheet').waitFor({ state: 'hidden' });
      await reference.getByRole('heading', { name: 'Today Tasks' }).click();
      const shot = await reference.screenshot({ animations: 'disabled' });
      if (process.env.QA_DIR) await writeFile(`${process.env.QA_DIR}/reference-${theme.toLowerCase()}.png`, shot);
      const own = ownShots[theme.toLowerCase()];
      const header = Buffer.alloc(4); header.writeUInt32BE(own.length);
      const result = spawnSync(process.env.PYTHON || 'python3', ['-c',
        'import sys,io,json;from PIL import Image,ImageChops,ImageStat;d=sys.stdin.buffer.read();n=int.from_bytes(d[:4],"big");a=Image.open(io.BytesIO(d[4:4+n])).convert("RGB").crop((16,16,344,444));b=Image.open(io.BytesIO(d[4+n:])).convert("RGB").crop((16,16,344,444));diff=ImageChops.difference(a,b);p=list(diff.getdata());print(json.dumps({"mean":sum(ImageStat.Stat(diff).mean)/3,"fraction":sum(max(v)>16 for v in p)/len(p)}))'],
        { input: Buffer.concat([header, own, shot]) });
      assert.equal(result.status, 0, result.stderr.toString());
      const metrics = JSON.parse(result.stdout.toString());
      console.log(`Reference comparison ${theme}:`, metrics);
      assert.ok(metrics.mean <= 2 && metrics.fraction <= .02, `${theme}: main-card image should closely match the reference`);
    }
    await reference.close();
  }
  await page.getByRole('button', { name: 'Mark as done', exact: true }).first().click();
  await page.reload();
  assert.equal(await page.getByRole('button', { name: 'Mark as not done', exact: true }).count(), 1);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.getByRole('button', { name: 'Reset all tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  assert.equal(await page.locator('.task').count(), 2);
  await page.getByRole('button', { name: 'Reset all tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  assert.equal(await page.locator('.task').count(), 0);
  await add('<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('.task img').count(), 0);
  await page.getByRole('button', { name: 'Delete this task', exact: true }).click();
  assert.equal(await page.locator('.task').count(), 0);
  await add('長文字測試'.repeat(120));
  await page.setViewportSize({ width: 240, height: 460 });
  assert.equal(await page.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#settings').isHidden(), true);
  await page.getByRole('button', { name: 'Reset all tasks', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#reset-dialog').isHidden(), true);
  const peer = await context.newPage();
  await peer.goto(new URL('todo.html', base).href);
  await peer.getByRole('textbox', { name: 'New task' }).fill('另一個分頁新增');
  await peer.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText('另一個分頁新增', { exact: true }).waitFor();
  await page.locator('body').evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('lupin.todo.v1'));
    saved.push({ id: 'pending-update', text: '不能被舊頁覆蓋', completed: false });
    localStorage.setItem('lupin.todo.v1', JSON.stringify(saved));
  });
  await input.fill('保留輸入重試');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  assert.equal(await input.inputValue(), '保留輸入重試');
  assert.equal(await page.locator('#save-status').isVisible(), true);
  assert.equal(await page.locator('.task').count(), 3);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  assert.equal(await page.locator('.task').count(), 4);
  await peer.close();
  await page.locator('body').evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new Error('Test storage denied'); };
  });
  await add('保存失敗的輸入');
  assert.equal(await input.inputValue(), '保存失敗的輸入');
  assert.equal(await page.locator('.task').count(), 4);
  assert.equal(await page.locator('#save-status').isVisible(), true);
  await page.locator('body').evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
    localStorage.setItem('lupin.todo.v1', 'invalid JSON');
  });
  await page.reload();
  await input.waitFor();
  assert.equal(await input.isDisabled(), true);
  assert.equal(await page.locator('body').evaluate(() => localStorage.getItem('lupin.todo.v1')), 'invalid JSON');
  await page.locator('body').evaluate(() => { localStorage.setItem('lupin.todo.v1', '[]'); });
  // Check theme following and transparent iframe canvas with no saved manual theme.
  await page.locator('body').evaluate(() => { localStorage.removeItem('lupin.todo.theme.v1'); });
  await page.setViewportSize({ width: 380, height: 520 });
  await page.goto(`http://127.0.0.1:${server.address().port}/harness`);
  const frame = page.frameLocator('#widget');
  await frame.locator('.task-card').waitFor();
  for (const [theme, background, pixel, card] of [
    ['light', '#f5e8dd', [245,232,221], 'rgb(255, 255, 255)'],
    ['dark', '#123456', [18,52,86], 'rgb(24, 24, 39)'],
    ['light', '#f5e8dd', [245,232,221], 'rgb(255, 255, 255)'],
  ]) {
    await page.evaluate(({theme,background}) => { document.documentElement.style.colorScheme=theme;document.body.style.background=background; }, {theme,background});
    await frame.locator('.task-card').evaluate(el => getComputedStyle(el).backgroundColor);
    const shot = await page.screenshot({ animations: 'disabled' });
    const decoded = spawnSync(process.env.PYTHON || 'python3', ['-c',
      'import sys,io,json;from PIL import Image;im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB");print(json.dumps(list(im.getpixel((22,22)))))'], {input:shot});
    assert.equal(decoded.status, 0, decoded.stderr.toString());
    assert.deepEqual(JSON.parse(decoded.stdout.toString()), pixel);
    assert.equal(await frame.locator('.task-card').evaluate(el => getComputedStyle(el).backgroundColor), card);
  }
  assert.deepEqual(errors, []);
  console.log('Original-style UI, storage, reset confirmation, settings, safe text, narrow width, multi-page conflicts, failure protection, and transparent live themes passed.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
