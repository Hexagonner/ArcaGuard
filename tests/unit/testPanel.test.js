import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTestPanel, unmountTestPanel } from '../../src/ui/testPanel.js';

afterEach(() => {
  unmountTestPanel(document);
  document.body.replaceChildren();
  localStorage.clear();
});

describe('Phase 0 test panel', () => {
  it('starts closed and only mounts once', () => {
    const host = mountTestPanel(document);
    expect(mountTestPanel(document)).toBe(host);
    expect(document.querySelectorAll('#arcaguard-root')).toHaveLength(1);
    expect(host.shadowRoot.querySelector('section').hidden).toBe(true);
  });

  it('opens, closes and restores keyboard focus', () => {
    const shadow = mountTestPanel(document).shadowRoot;
    const launcher = shadow.querySelector('.launcher');
    const close = shadow.querySelector('.close');
    const panel = shadow.querySelector('section');
    launcher.click();
    expect(panel.hidden).toBe(false);
    expect(launcher.getAttribute('aria-expanded')).toBe('true');
    expect(shadow.activeElement).toBe(close);
    close.click();
    expect(panel.hidden).toBe(true);
    expect(shadow.activeElement).toBe(launcher);
    launcher.click();
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hidden).toBe(true);
    expect(launcher.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps safe status labels and performs a UI check without network or storage calls', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const shadow = mountTestPanel(document).shadowRoot;
    shadow.querySelector('.launcher').click();
    expect([...shadow.querySelectorAll('dd')].map((el) => el.textContent))
      .toEqual(['꺼짐', '꺼짐', '미검증']);
    shadow.querySelector('.check').click();
    expect(shadow.querySelector('[role="status"]').textContent).toContain('화면 응답 정상');
    expect(fetch).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    expect(shadow.querySelectorAll('script, iframe, form')).toHaveLength(0);
  });
});
