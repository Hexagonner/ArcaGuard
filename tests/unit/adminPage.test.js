import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTestPanel, unmountTestPanel } from '../../src/ui/testPanel.js';
import { createUiPreferences } from '../../src/adapters/runtime/uiPreferences.js';
import { registerAdminMenu } from '../../src/adapters/runtime/adminMenu.js';

const KEY = 'arcaguard.ui.preferences.v1';
afterEach(() => {
  unmountTestPanel(document);
  document.body.replaceChildren();
  vi.restoreAllMocks();
  localStorage.clear();
});

function shortcut(options = {}) {
  const event = new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true,
    code: 'KeyG', key: 'G', altKey: true, shiftKey: true, ...options });
  document.dispatchEvent(event);
  return event;
}

function toggle(shadow, selector, value) {
  const input = shadow.querySelector(selector);
  input.checked = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('administrator appearance page', () => {
  it('starts closed, opens only on user request and restores focus without navigation or network', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const open = vi.spyOn(window, 'open');
    const href = location.href;
    const host = mountTestPanel(document);
    const shadow = host.shadowRoot;
    const page = shadow.querySelector('.admin-page');
    expect(page.hidden).toBe(true);
    shadow.querySelector('.launcher').click();
    shadow.querySelector('.open-admin').click();
    expect(page.hidden).toBe(false);
    expect(shadow.querySelector('.panel').hidden).toBe(true);
    expect(shadow.activeElement).toBe(shadow.querySelector('.admin-close'));
    shadow.querySelector('.admin-close').click();
    expect(page.hidden).toBe(true);
    expect(shadow.activeElement).toBe(shadow.querySelector('.launcher'));
    expect(fetch).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(location.href).toBe(href);
  });

  it('persists hidden state and reopens the administrator page via keyboard after remount', () => {
    let host = mountTestPanel(document);
    shortcut();
    toggle(host.shadowRoot, '.toggle-visible', false);
    expect(host.shadowRoot.querySelector('.launcher').hidden).toBe(true);
    expect(host.shadowRoot.querySelector('.admin-page').hidden).toBe(false);
    host.shadowRoot.querySelector('.admin-close').click();
    unmountTestPanel(document);
    host = mountTestPanel(document);
    expect(host.shadowRoot.querySelector('.launcher').hidden).toBe(true);
    expect(shortcut().defaultPrevented).toBe(true);
    expect(host.shadowRoot.querySelector('.admin-page').hidden).toBe(false);
    toggle(host.shadowRoot, '.toggle-visible', true);
    expect(host.shadowRoot.querySelector('.launcher').hidden).toBe(false);
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ version: 1, visible: true, locked: false });
  });

  it('locks drag, keyboard movement and reset while keeping launcher clicks usable', () => {
    const host = mountTestPanel(document);
    const shadow = host.shadowRoot;
    const launcher = shadow.querySelector('.launcher');
    shortcut();
    toggle(shadow, '.toggle-locked', true);
    const position = host.style.left;
    expect(shadow.querySelector('.admin-reset').disabled).toBe(true);
    expect(shadow.querySelector('.admin-adjust').disabled).toBe(true);
    shadow.querySelector('.admin-close').click();
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, cancelable: true });
    launcher.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(true);
    for (const [type, x] of [['pointerdown', 900], ['pointermove', 100], ['pointerup', 100]]) {
      launcher.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: 100 }));
    }
    expect(host.style.left).toBe(position);
    expect(localStorage.getItem('arcaguard.ui.position.v1')).toBe(null);
    launcher.click();
    expect(shadow.querySelector('.panel').hidden).toBe(false);
    expect(shadow.querySelector('.reset-position').disabled).toBe(true);
    unmountTestPanel(document);
    expect(mountTestPanel(document).shadowRoot.querySelector('.launcher').dataset.locked).toBe('true');
  });

  it('enables adjusting after unlocking and preserves the launcher position when hiding', () => {
    const host = mountTestPanel(document);
    const shadow = host.shadowRoot;
    const launcher = shadow.querySelector('.launcher');
    launcher.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true }));
    const position = host.style.left;
    const stored = localStorage.getItem('arcaguard.ui.position.v1');
    shortcut();
    toggle(shadow, '.toggle-visible', false);
    expect(shadow.querySelector('.admin-adjust').disabled).toBe(true);
    toggle(shadow, '.toggle-visible', true);
    expect(host.style.left).toBe(position);
    expect(localStorage.getItem('arcaguard.ui.position.v1')).toBe(stored);
    shadow.querySelector('.admin-adjust').click();
    expect(shadow.querySelector('.admin-page').hidden).toBe(true);
    expect(shadow.activeElement).toBe(launcher);
    launcher.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true }));
    expect(parseFloat(host.style.left)).toBe(parseFloat(position) - 10);
  });

  it('restores a page input after closing, traps Tab and ignores the shortcut during IME composition', () => {
    const input = document.createElement('input');
    input.value = '작성 중인 내용';
    document.body.append(input);
    const shadow = mountTestPanel(document).shadowRoot;
    input.focus();
    shortcut({ isComposing: true });
    expect(shadow.querySelector('.admin-page').hidden).toBe(true);
    expect(document.activeElement).toBe(input);
    shortcut();
    const close = shadow.querySelector('.admin-close');
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, composed: true, cancelable: true }));
    expect(shadow.activeElement).toBe(shadow.querySelector('.admin-reset'));
    shadow.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true, cancelable: true }));
    expect(shadow.activeElement).toBe(close);
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('작성 중인 내용');
  });

  it('applies settings even when saving is denied and clearly reports the limitation', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    const shadow = mountTestPanel(document).shadowRoot;
    shortcut();
    toggle(shadow, '.toggle-visible', false);
    expect(shadow.querySelector('.launcher').hidden).toBe(true);
    expect(shadow.querySelector('.admin-status').textContent).toContain('이 화면에서만');
    shortcut();
    shortcut();
    expect(shadow.querySelector('.admin-page').hidden).toBe(false);
  });

  it('removes global keyboard listeners on teardown', () => {
    mountTestPanel(document);
    unmountTestPanel(document);
    expect(shortcut().defaultPrevented).toBe(false);
  });
});

describe('appearance preferences and recovery menu adapter', () => {
  it.each(['broken', 'null', '{"version":2,"visible":false,"locked":true}',
    '{"version":1,"visible":"false","locked":true}', '{"version":1,"visible":false}'])('uses safe defaults for %s', (value) => {
    localStorage.setItem(KEY, value);
    expect(createUiPreferences(window).load()).toEqual({ visible: true, locked: false });
  });
  it('uses safe defaults when preference reading is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(createUiPreferences(window).load()).toEqual({ visible: true, locked: false });
  });
  it('registers a menu callback without opening automatically', () => {
    const open = vi.fn();
    const register = vi.fn();
    expect(registerAdminMenu(open, register)).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(register.mock.calls[0][0]).toBe('ArcaGuard 관리자 설정');
    register.mock.calls[0][1]();
    expect(open).toHaveBeenCalledExactlyOnceWith();
  });
  it('tolerates missing and failed menu APIs', () => {
    expect(registerAdminMenu(vi.fn(), null)).toBe(false);
    expect(registerAdminMenu(vi.fn(), () => { throw new Error('unavailable'); })).toBe(false);
  });
});
