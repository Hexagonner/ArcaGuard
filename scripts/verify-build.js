import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const code = readFileSync(new URL('../dist/ArcaGuard.user.js', import.meta.url), 'utf8');
const header = code.match(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/u)?.[0];
assert.ok(header, 'Userscript metadata is missing');
for (const entry of [
  /@name\s+ArcaGuard/u,
  /@version\s+0\.0\.0/u,
  /@match\s+https:\/\/arca\.live\/\*/u,
  /@grant\s+GM_registerMenuCommand/u,
  /@run-at\s+document-idle/u,
  /@noframes/u,
]) assert.match(header, entry);
assert.doesNotMatch(header, /@(connect|require|resource)\s/u);
assert.equal((header.match(/@match\s/gu) ?? []).length, 1);
assert.equal((header.match(/@grant\s/gu) ?? []).length, 1);
const bundle = new vm.Script(code, { filename: 'ArcaGuard.user.js' });
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  runScripts: 'outside-only',
  url: 'https://arca.live/b/synthetic',
});
try {
  let menu;
  dom.window.GM_registerMenuCommand = (label, callback) => { menu = { label, callback }; };
  bundle.runInContext(dom.getInternalVMContext());
  const shadow = dom.window.document.getElementById('arcaguard-root')?.shadowRoot;
  assert.ok(shadow, 'Built script did not mount its UI');
  assert.ok(shadow.querySelector('style').textContent.includes(':host'));
  assert.equal(shadow.querySelector('section').hidden, true);
  shadow.querySelector('.launcher').click();
  assert.equal(shadow.querySelector('section').hidden, false);
  shadow.querySelector('.check').click();
  assert.match(shadow.querySelector('[role="status"]').textContent, /화면 응답 정상/u);
  assert.equal(menu.label, 'ArcaGuard 관리자 설정');
  menu.callback();
  const admin = shadow.querySelector('.admin-page');
  assert.equal(admin.hidden, false);
  const visible = shadow.querySelector('.toggle-visible');
  visible.checked = false;
  visible.dispatchEvent(new dom.window.Event('change'));
  assert.equal(shadow.querySelector('.launcher').hidden, true);
  shadow.querySelector('.admin-close').click();
  assert.equal(admin.hidden, true);
  menu.callback();
  assert.equal(admin.hidden, false, 'Menu must reopen settings while the launcher is hidden');
} finally {
  dom.window.close();
}
console.log('Userscript metadata, scope, syntax and bundled UI execution verified.');
