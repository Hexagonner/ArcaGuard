import { PHASE_STATUS } from '../core/phase.js';
import styles from './styles.css?inline';
import { createPositionStore } from '../adapters/runtime/positionStore.js';
import { bindPosition } from './position.js';

const HOST_ID = 'arcaguard-root';

/**
 * Mount a local-only smoke-test panel, isolated from the host page's styles.
 * @param {Document} document Page document (injectable for tests).
 * @returns {HTMLElement} Existing or newly mounted UI host.
 */
export function mountTestPanel(document) {
  const existing = document.getElementById(HOST_ID);
  if (existing) return existing;

  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
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

  const setOpen = (open) => {
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
    if (event.key === 'Escape' && !panel.hidden) {
      event.stopPropagation();
      setOpen(false);
    }
  });
  check.addEventListener('click', () => {
    result.textContent = '화면 응답 정상 · 사이트 요청 없이 확인했습니다.';
  });

  panel.append(header, title, intro, mode, list, note, check, result, positionHelp, reset, positionStatus);
  shadow.append(style, panel, launcher);
  document.body.append(host);
  const positioning = bindPosition({ host, launcher, panel, reset, status: positionStatus,
    store: createPositionStore(document.defaultView) });
  return host;
}
