import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPositionStore } from '../../src/adapters/runtime/positionStore.js';
import { mountTestPanel, unmountTestPanel } from '../../src/ui/testPanel.js';

const KEY = 'arcaguard.ui.position.v1';
afterEach(() => {
  unmountTestPanel(document);
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function setup() {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () {
    return this.classList.contains('launcher') ? 120 : 380;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
    return this.classList.contains('launcher') ? 48 : 300;
  });
  const host = mountTestPanel(document);
  const shadow = host.shadowRoot;
  const launcher = shadow.querySelector('.launcher');
  return { host, shadow, launcher, panel: shadow.querySelector('.panel') };
}

function pointer(target, type, x, y, pointerId = 1) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId, button: 0, isPrimary: true }));
}

describe('custom launcher position', () => {
  it('persists keyboard movement, restores it on remount and resets the preference', () => {
    const { host, launcher } = setup();
    const original = host.style.left;
    launcher.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true }));
    expect(parseFloat(host.style.left)).toBe(parseFloat(original) - 10);
    const savedLeft = host.style.left;
    expect(JSON.parse(localStorage.getItem(KEY)).version).toBe(1);
    unmountTestPanel(document);
    const restored = mountTestPanel(document);
    expect(restored.style.left).toBe(savedLeft);
    restored.shadowRoot.querySelector('.reset-position').click();
    expect(localStorage.getItem(KEY)).toBe(null);
    expect(restored.style.left).toBe(original);
  });

  it('drags without opening, ignores other pointers and suppresses the release click', () => {
    const { host, launcher, panel } = setup();
    const original = parseFloat(host.style.left);
    pointer(launcher, 'pointerdown', 900, 700);
    pointer(launcher, 'pointermove', 800, 600, 2);
    expect(parseFloat(host.style.left)).toBe(original);
    pointer(launcher, 'pointermove', 700, 500);
    pointer(launcher, 'pointerup', 700, 500);
    launcher.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    expect(panel.hidden).toBe(true);
    expect(parseFloat(host.style.left)).toBe(original - 200);
    expect(localStorage.getItem(KEY)).not.toBe(null);
    launcher.click();
    expect(panel.hidden).toBe(false);
  });

  it('allows a normal click after a small pointer movement without saving', () => {
    const { launcher, panel } = setup();
    pointer(launcher, 'pointerdown', 100, 100);
    pointer(launcher, 'pointermove', 102, 102);
    pointer(launcher, 'pointerup', 102, 102);
    launcher.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    expect(panel.hidden).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(null);
  });

  it.each(['pointercancel', 'lostpointercapture'])('rolls back an interrupted drag (%s)', (event) => {
    const { host, launcher } = setup();
    const original = host.style.left;
    pointer(launcher, 'pointerdown', 900, 700);
    pointer(launcher, 'pointermove', 700, 500);
    pointer(launcher, event, 700, 500);
    expect(host.style.left).toBe(original);
    expect(localStorage.getItem(KEY)).toBe(null);
  });

  it('clamps edge drags and places the panel below an upper launcher and above a lower one', () => {
    const { host, launcher, panel } = setup();
    pointer(launcher, 'pointerdown', 900, 700);
    pointer(launcher, 'pointermove', -2000, -2000);
    pointer(launcher, 'pointerup', -2000, -2000);
    expect(host.style.left).toBe('8px');
    expect(host.style.top).toBe('8px');
    launcher.click();
    expect(parseFloat(panel.style.top)).toBeGreaterThan(0);
    pointer(launcher, 'pointerdown', 10, 10);
    pointer(launcher, 'pointermove', 5000, 5000);
    pointer(launcher, 'pointerup', 5000, 5000);
    expect(parseFloat(host.style.left) + 120).toBeLessThanOrEqual(innerWidth - 8);
    expect(parseFloat(panel.style.top)).toBeLessThan(0);
    expect(parseFloat(panel.style.left)).toBeLessThan(0);
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 500);
    window.dispatchEvent(new Event('resize'));
    expect(parseFloat(host.style.left) + 120).toBeLessThanOrEqual(382);
    expect(parseFloat(host.style.top) + 48).toBeLessThanOrEqual(492);
  });

  it('still moves and reports when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    const { launcher, shadow } = setup();
    launcher.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }));
    expect(shadow.querySelector('.position-status').textContent).toContain('이 화면');
    shadow.querySelector('.reset-position').click();
    expect(shadow.querySelector('.position-status').textContent).toContain('새로고침');
  });
});

describe('position preference validation', () => {
  it.each(['broken', 'null', '{"version":2,"x":0.5,"y":0.5}',
    '{"version":1,"x":-1,"y":0}', '{"version":1,"x":1.1,"y":0}',
    '{"version":1,"x":"0.5","y":0}', '{"version":1,"x":0}'])('ignores invalid data: %s', (value) => {
    localStorage.setItem(KEY, value);
    expect(createPositionStore(window).load()).toBe(null);
  });

  it('only reads the named position key and returns the validated coordinates', () => {
    localStorage.setItem(KEY, '{"version":1,"x":0.2,"y":0.7,"ignored":"text"}');
    const read = vi.spyOn(Storage.prototype, 'getItem');
    expect(createPositionStore(window).load()).toEqual({ x: 0.2, y: 0.7 });
    expect(read).toHaveBeenCalledExactlyOnceWith(KEY);
  });
});
