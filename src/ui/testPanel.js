import { PHASE_STATUS } from '../core/phase.js';
import styles from './styles.css?inline';
import { createPositionStore } from '../adapters/runtime/positionStore.js';
import { bindPosition } from './position.js';
import { createAdminPage } from './adminPage.js';
import { createUiPreferences } from '../adapters/runtime/uiPreferences.js';

const HOST_ID = 'arcaguard-root';
const sessions = new WeakMap();

/** Remove UI and global listeners, for explicit teardown and isolated tests.
 * @param {Document} document Owning document.
 */
export function unmountTestPanel(document) {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  sessions.get(host)?.abort();
  sessions.delete(host);
  host.remove();
}

/**
 * Mount a local-only smoke-test panel, isolated from the host page's styles.
 * @param {Document} document Page document (injectable for tests).
 * @param {{registerMenu?: Function}} options Runtime injection for the recovery menu.
 * @returns {HTMLElement} Existing or newly mounted UI host.
 */
export function mountTestPanel(document, { registerMenu = () => false } = {}) {
  const existing = document.getElementById(HOST_ID);
  if (existing) return existing;

  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const controller = new document.defaultView.AbortController();
  sessions.set(host, controller);
  const preferenceStore = createUiPreferences(document.defaultView);
  let preferences = preferenceStore.load();
  let returnFocus = null;
  const style = document.createElement('style');
  style.textContent = styles;

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  const launcher = element('button', 'ArcaGuard', 'launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'arcaguard-panel');
  launcher.title = '드래그로 위치 이동 · Alt + 방향키로 10px 이동';

  const panel = element('section', undefined, 'panel');
  panel.id = 'arcaguard-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'arcaguard-title');

  const header = element('header');
  const eyebrow = element('span', `PHASE ${PHASE_STATUS.phase} · 개발 미리보기`, 'eyebrow');
  const close = element('button', '닫기', 'close');
  close.type = 'button';
  header.append(eyebrow, close);

  const title = element('h2', '개발 환경 준비됨');
  title.id = 'arcaguard-title';
  const intro = element('p', '기본 화면의 동작을 확인할 수 있습니다. 신고 감시와 광고 분석은 후속 단계에서 연결합니다.', 'intro');
  const mode = element('div', '시뮬레이션 모드', 'mode');
  const list = element('dl', undefined, 'statuses');
  for (const [label, value] of [
    ['신고 감시', '꺼짐'],
    ['자동 이동', '꺼짐'],
    ['관리자 권한', '미검증'],
  ]) {
    const row = element('div');
    row.append(element('dt', label), element('dd', value));
    list.append(row);
  }

  const note = element('p', '아직 연결된 채널이 없습니다. 이 화면에서는 게시글이나 신고를 읽거나 변경하지 않습니다.', 'note');
  const check = element('button', '화면 동작 확인', 'check');
  check.type = 'button';
  const result = element('p', '버튼을 눌러 화면 응답을 확인하세요.', 'result');
  result.setAttribute('role', 'status');
  result.setAttribute('aria-live', 'polite');

  const positionHelp = element('p', '버튼을 드래그해 옮기세요. 버튼에 초점을 맞추고 Alt + 방향키로도 이동할 수 있습니다.', 'position-help');
  const reset = element('button', '기본 위치로 되돌리기', 'reset-position');
  reset.type = 'button';
  const positionStatus = element('p', '', 'position-status');
  positionStatus.setAttribute('role', 'status');
  positionStatus.setAttribute('aria-live', 'polite');

  const adminButton = element('button', '관리자 설정 열기', 'open-admin');
  adminButton.type = 'button';
  const shortcutHelp = element('p', '버튼 숨김/위치 고정: 관리자 설정 · Alt + Shift + G', 'note');
  const applyPreferences = () => {
    launcher.hidden = !preferences.visible;
    launcher.dataset.locked = String(preferences.locked);
    launcher.title = preferences.locked ? '위치 고정됨 · 클릭하여 패널 열기'
      : '드래그로 위치 이동 · Alt + 방향키로 10px 이동';
    reset.disabled = preferences.locked;
    admin.update(preferences);
    if (!preferences.visible) {
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
    }
    positioning.layout();
  };
  const closeAdmin = () => {
    admin.element.hidden = true;
    if (returnFocus?.isConnected && returnFocus !== host && !returnFocus.closest('[hidden]')) returnFocus.focus({ preventScroll: true });
    else if (preferences.visible) launcher.focus({ preventScroll: true });
  };
  const openAdmin = () => {
    if (!host.isConnected || !admin.element.hidden) return;
    returnFocus = shadow.activeElement ?? document.activeElement;
    positioning.cancel();
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    admin.element.hidden = false;
    admin.update(preferences);
    admin.close.focus({ preventScroll: true });
  };
  const admin = createAdminPage(document, {
    onClose: closeAdmin,
    onChange(name, checked) {
      positioning.cancel();
      preferences = { ...preferences, [name]: checked };
      const saved = preferenceStore.save(preferences);
      applyPreferences();
      admin.announce(saved ? '설정을 저장했습니다.' : '설정을 적용했습니다. 저장할 수 없어 이 화면에서만 유지됩니다.');
    },
    onAdjust() { closeAdmin(); launcher.focus({ preventScroll: true }); },
    onReset() {
      const saved = positioning.resetPosition();
      admin.announce(saved ? '기본 위치로 되돌렸습니다.' : positionStatus.textContent);
    },
  });
  adminButton.addEventListener('click', openAdmin);

  const setOpen = (open) => {
    if (open && (!preferences.visible || !admin.element.hidden)) return;
    panel.hidden = !open;
    positioning.layout();
    launcher.setAttribute('aria-expanded', String(open));
    if (open) close.focus();
    else launcher.focus();
  };
  launcher.addEventListener('click', (event) => {
    if (!positioning.consumeClick(event)) setOpen(panel.hidden);
  });
  close.addEventListener('click', () => setOpen(false));
  shadow.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !admin.element.hidden) {
      event.stopPropagation();
      closeAdmin();
    } else if (event.key === 'Escape' && !panel.hidden) {
      event.stopPropagation();
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!host.isConnected) return;
    if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.isComposing
      && (event.code === 'KeyG' || event.key?.toLowerCase() === 'g')) {
      event.preventDefault();
      event.stopPropagation();
      if (admin.element.hidden) openAdmin();
      else closeAdmin();
    } else if (event.key === 'Tab' && !admin.element.hidden) {
      const controls = [...admin.element.querySelectorAll('*')]
        .filter((node) => ['BUTTON', 'INPUT'].includes(node.tagName) && !node.disabled);
      const first = controls[0];
      const last = controls.at(-1);
      if (!admin.element.contains(shadow.activeElement) || (event.shiftKey && shadow.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (!event.shiftKey && shadow.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
  }, { capture: true, signal: controller.signal });
  check.addEventListener('click', () => {
    result.textContent = '화면 응답 정상 · 사이트 요청 없이 확인했습니다.';
  });

  panel.append(header, title, intro, mode, list, note, check, result, positionHelp, reset, positionStatus, adminButton, shortcutHelp);
  shadow.append(style, panel, launcher, admin.element);
  document.body.append(host);
  const positioning = bindPosition({ host, launcher, panel, reset, status: positionStatus,
    store: createPositionStore(document.defaultView), isLocked: () => preferences.locked, signal: controller.signal });
  applyPreferences();
  const menuAvailable = registerMenu(openAdmin);
  admin.setMenuAvailable(menuAvailable);
  if (!menuAvailable) shortcutHelp.textContent = '관리자 설정: Alt + Shift + G (이 화면에는 Tampermonkey 메뉴가 연결되지 않았습니다.)';
  return host;
}
