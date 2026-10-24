/** Build the appearance-only administrator page; no site permissions or moderation writes.
 * @param {Document} document Owning document.
 * @param {{onClose: Function, onChange: Function, onReset: Function, onAdjust: Function}} actions UI callbacks.
 * @returns {{element: HTMLElement, close: HTMLButtonElement, update: Function,
 * announce: Function, setMenuAvailable: Function}} Page controls.
 */
export function createAdminPage(document, actions) {
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const page = node('section', undefined, 'admin-page');
  page.hidden = true;
  page.setAttribute('role', 'dialog');
  page.setAttribute('aria-modal', 'true');
  page.setAttribute('aria-labelledby', 'arcaguard-admin-title');
  const shell = node('div', undefined, 'admin-shell');
  const header = node('header', undefined, 'admin-header');
  const brand = node('div');
  brand.append(node('span', 'ARCAGUARD / 관리자 설정', 'eyebrow'));
  const title = node('h1', '내 화면에 맞게 설정하세요');
  title.id = 'arcaguard-admin-title';
  brand.append(title);
  const close = node('button', '사이트로 돌아가기', 'admin-close');
  close.type = 'button';
  close.addEventListener('click', actions.onClose);
  header.append(brand, close);

  const layout = node('div', undefined, 'admin-layout');
  const aside = node('aside', undefined, 'admin-aside');
  aside.append(node('span', '화면 설정', 'admin-current'),
    node('p', '사용할 때만 보이고, 원하는 곳에 머무르게.', 'admin-aside-copy'),
    node('p', '이 설정은 버튼 모양과 위치에만 적용됩니다.', 'note'));
  const main = node('div', undefined, 'admin-content');
  const appearance = node('section', undefined, 'admin-card');
  appearance.append(node('h2', '버튼 표시와 위치'),
    node('p', '변경 사항은 즉시 적용되며 같은 사이트에서 기억합니다.', 'intro'));
  const toggle = (labelText, description, className, name) => {
    const label = node('label', undefined, 'preference-row');
    const text = node('span');
    text.append(node('strong', labelText), node('span', description, 'preference-description'));
    const input = node('input', undefined, className);
    input.type = 'checkbox';
    input.setAttribute('aria-label', labelText);
    input.addEventListener('change', () => actions.onChange(name, input.checked));
    label.append(text, input);
    appearance.append(label);
    return input;
  };
  const visible = toggle('ArcaGuard 버튼 표시', '끄면 사이트에서 버튼이 완전히 숨겨집니다.', 'toggle-visible', 'visible');
  const locked = toggle('버튼 위치 고정', '드래그와 Alt + 방향키 이동을 잠급니다.', 'toggle-locked', 'locked');
  const buttons = node('div', undefined, 'admin-actions');
  const adjust = node('button', '화면에서 위치 조정하기', 'admin-adjust');
  adjust.type = 'button';
  adjust.addEventListener('click', actions.onAdjust);
  const reset = node('button', '기본 위치로 되돌리기', 'admin-reset');
  reset.type = 'button';
  reset.addEventListener('click', actions.onReset);
  buttons.append(adjust, reset);
  appearance.append(buttons, node('p', '위치를 바꾸려면 버튼 표시를 켜고 위치 고정을 해제하세요.', 'note'));
  const status = node('p', '', 'admin-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  appearance.append(status);
  const recovery = node('section', undefined, 'admin-card recovery-card');
  recovery.append(node('h2', '버튼을 숨겼을 때'),
    node('p', 'Alt + Shift + G를 누르거나 Tampermonkey 메뉴에서 ‘ArcaGuard 관리자 설정’을 선택하세요.'),
    node('p', '단축키는 설치된 스크립트가 실행 중인 아카라이브 페이지에서 사용할 수 있습니다. 입력 조합 중에는 작동하지 않습니다.', 'note'));
  const menuStatus = node('p', '', 'note');
  recovery.append(menuStatus);
  const runtime = node('section', undefined, 'admin-runtime');
  runtime.append(node('span', 'Simulation', 'mode'),
    node('p', '신고 감시 꺼짐 · 자동 이동 꺼짐 · 관리자 권한 미검증', 'note'),
    node('p', '현재는 화면 설정만 사용할 수 있습니다. 채널 관리·광고 탐지·글 이동 기능은 아직 연결되지 않았습니다.', 'note'));
  main.append(appearance, recovery, runtime);
  layout.append(aside, main);
  shell.append(header, layout);
  page.append(shell);
  return {
    element: page,
    close,
    update(preferences) {
      visible.checked = preferences.visible;
      locked.checked = preferences.locked;
      adjust.disabled = !preferences.visible || preferences.locked;
      reset.disabled = preferences.locked;
    },
    announce(message) { status.textContent = message; },
    setMenuAvailable(available) {
      menuStatus.textContent = available ? 'Tampermonkey 메뉴가 연결되었습니다.'
        : '현재 화면에는 Tampermonkey 메뉴가 연결되지 않았습니다. 단축키를 사용하세요. 설치한 스크립트에서 메뉴가 보이지 않으면 스크립트를 업데이트해 주세요.';
    },
  };
}
