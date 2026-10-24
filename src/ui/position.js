const clamp = (value, max) => Math.min(Math.max(0, value), max);

/** Bind launcher dragging, keyboard movement and viewport-safe panel placement.
 * @param {{host: HTMLElement, launcher: HTMLButtonElement, panel: HTMLElement,
 * reset: HTMLButtonElement, status: HTMLElement, store: object, isLocked?: Function,
 * signal?: AbortSignal}} options UI dependencies.
 * @returns {{layout: Function, consumeClick: Function, cancel: Function, resetPosition: Function}} Position controls.
 */
export function bindPosition({ host, launcher, panel, reset, status, store, isLocked = () => false, signal }) {
  const window = host.ownerDocument.defaultView;
  let position = store.load();
  let gesture = null;
  let suppressClick = false;
  const bounds = () => ({
    x: Math.max(0, window.innerWidth - launcher.offsetWidth - 16),
    y: Math.max(0, window.innerHeight - launcher.offsetHeight - 16),
  });
  const coordinates = () => {
    const max = bounds();
    return position ? { x: 8 + position.x * max.x, y: 8 + position.y * max.y }
      : { x: Math.max(8, max.x - 8), y: Math.max(8, max.y - 8) };
  };
  const layout = () => {
    if (launcher.hidden) return;
    const { x, y } = coordinates();
    host.style.left = `${x}px`;
    host.style.top = `${y}px`;
    if (panel.hidden) return;
    const below = window.innerHeight - y - launcher.offsetHeight - 8;
    const above = y - 8;
    const openBelow = below > above;
    panel.style.maxHeight = `${Math.max(0, (openBelow ? below : above) - 12)}px`;
    panel.style.left = `${clamp(x, Math.max(0, window.innerWidth - panel.offsetWidth - 8)) - x}px`;
    panel.style.top = `${openBelow ? launcher.offsetHeight + 12 : -panel.offsetHeight - 12}px`;
  };
  const move = (x, y) => {
    const max = bounds();
    position = { x: max.x ? clamp(x - 8, max.x) / max.x : 0,
      y: max.y ? clamp(y - 8, max.y) / max.y : 0 };
    layout();
  };
  const save = () => {
    status.textContent = store.save(position)
      ? '위치를 저장했습니다.' : '위치를 옮겼습니다. 저장할 수 없어 이 화면에서만 유지됩니다.';
    layout();
  };
  launcher.addEventListener('pointerdown', (event) => {
    if (isLocked() || event.button !== 0 || event.isPrimary === false) return;
    suppressClick = false;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      ...coordinates(), previous: position, moved: false };
    launcher.setPointerCapture?.(event.pointerId);
  });
  launcher.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
    gesture.moved = true;
    launcher.classList.add('dragging');
    move(gesture.x + dx, gesture.y + dy);
  });
  const finish = (event, cancelled) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const current = gesture;
    gesture = null;
    launcher.classList.remove('dragging');
    if (current.moved) {
      suppressClick = true;
      if (cancelled) { position = current.previous; layout(); }
      else save();
    }
    if (launcher.hasPointerCapture?.(event.pointerId)) launcher.releasePointerCapture(event.pointerId);
  };
  launcher.addEventListener('pointerup', (event) => finish(event, false));
  launcher.addEventListener('pointercancel', (event) => finish(event, true));
  launcher.addEventListener('lostpointercapture', (event) => finish(event, true));
  launcher.addEventListener('keydown', (event) => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!event.altKey || !Object.hasOwn(directions, event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (isLocked()) return;
    const [dx, dy] = directions[event.key];
    const { x, y } = coordinates();
    move(x + dx * 10, y + dy * 10);
    save();
  });
  const resetPosition = () => {
    if (isLocked()) return false;
    position = null;
    layout();
    const saved = store.reset();
    status.textContent = saved ? '기본 위치로 되돌렸습니다.'
      : '기본 위치로 되돌렸습니다. 저장된 위치를 지울 수 없어 새로고침하면 이전 위치가 복원될 수 있습니다.';
    layout();
    return saved;
  };
  reset.addEventListener('click', resetPosition);
  window.addEventListener('resize', layout, { signal });
  layout();
  return {
    layout,
    resetPosition,
    cancel() { if (gesture) finish({ pointerId: gesture.id }, true); },
    consumeClick(event) {
      const consumed = suppressClick && event.detail !== 0;
      suppressClick = false;
      return consumed;
    },
  };
}
