// Standalone localhost experiment, never imported into the distributed userscript.
const button = document.getElementById('run');
const delayedButton = document.getElementById('delayed');
const draft = document.getElementById('draft');
const status = document.getElementById('status');
const summary = document.getElementById('summary');
const totals = document.getElementById('totals');
const output = document.getElementById('results');
const cases = [
  { id: 'move-only', name: '신고 완료 OFF', resolve: false, expected: ['moved', 'quarantine', 'pending', 1, 1, 0, 0] },
  { id: 'resolve', name: '신고 완료 ON', resolve: true, expected: ['completed', 'quarantine', 'completed', 1, 1, 1, 1] },
  { id: 'duplicates', name: '중복 알림 3회', resolve: true, expected: ['completed', 'quarantine', 'completed', 1, 1, 1, 1] },
  { id: 'already-moved', name: '이미 격리된 글', resolve: true, expected: ['skipped', 'quarantine', 'pending', 0, 0, 0, 0] },
  { id: 'move-denied', name: '이동 권한 거절', resolve: true, expected: ['held', 'ordinary', 'pending', 1, 0, 0, 0] },
  { id: 'unchanged', name: '200 응답 뒤 글머리 미변경', resolve: true, expected: ['held', 'ordinary', 'pending', 1, 0, 0, 0] },
  { id: 'resolve-failed', name: '이동 성공 · 신고 전송 실패', resolve: true, expected: ['partial', 'quarantine', 'pending', 1, 1, 1, 0] },
  { id: 'below-threshold', name: '신고 수 미달', resolve: true, expected: ['skipped', 'ordinary', 'pending', 0, 0, 0, 0] },
];

const snapshot = () => ({
  url: location.href, historyLength: history.length, focusId: document.activeElement?.id,
  draft: draft.value, selectionStart: draft.selectionStart, selectionEnd: draft.selectionEnd, scrollX, scrollY,
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function request(path, payload, asText = false) {
  const url = new URL(path, location.origin);
  if (url.origin !== location.origin || !url.pathname.startsWith('/lab/')) throw new Error('Non-local experiment URL');
  const response = await fetch(url, {
    method: payload ? 'POST' : 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(3000),
    ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return asText ? response.text() : response.json();
}

async function report(id) {
  const html = await request(`/lab/report/${id}`, undefined, true);
  // Fixed resource-free synthetic markup only. Not a general untrusted HTML parser.
  const root = new DOMParser().parseFromString(html, 'text/html');
  const main = root.querySelector('main[data-report]');
  const target = main?.querySelector('[data-target]')?.getAttribute('href');
  const count = Number(main?.querySelector('[data-total]')?.textContent);
  const reason = main?.querySelector('[data-reason]')?.textContent;
  const state = main?.querySelector('[data-status]')?.textContent;
  const reply = main?.querySelector('[data-reply]')?.textContent;
  if (main?.getAttribute('data-report') !== id || target !== `/lab/article/${id}`
      || !Number.isSafeInteger(count) || count < 1 || !reason || !state || reply === undefined) {
    throw new Error('Invalid synthetic report');
  }
  return { target, count, reason, state, reply };
}

async function processCandidate(id, resolveReport) {
  let moved = false;
  try {
    const currentReport = await report(id);
    if (currentReport.state !== 'pending' || currentReport.count < 2 || !currentReport.reason.includes('광고')) return { status: 'skipped' };
    const article = await request(currentReport.target);
    if (article.id !== id || article.canModerate !== true) throw new Error('Unverified synthetic permission');
    if (article.category === 'quarantine') return { status: 'skipped' };
    await request(`/lab/move/${id}`, { destination: 'quarantine', expectedRevision: article.revision });
    const afterMove = await request(currentReport.target);
    if (afterMove.id !== id || afterMove.category !== 'quarantine' || afterMove.body !== article.body) throw new Error('Move result not verified');
    moved = true;
    if (!resolveReport) return { status: 'moved' };
    const latestReport = await report(id);
    if (latestReport.state !== 'pending') return { status: 'partial', reason: 'Report state changed' };
    await request(`/lab/resolve/${id}`, { action: 'synthetic-review', reply: '합성 처리 답변' });
    const afterResolve = await report(id);
    if (afterResolve.state !== 'completed' || afterResolve.reply !== '합성 처리 답변') throw new Error('Report result not verified');
    return { status: 'completed' };
  } catch (error) {
    return { status: moved ? 'partial' : 'held', reason: error.message };
  }
}

async function execute(test) {
  const { id } = await request('/lab/run', { caseId: test.id });
  if (!/^[0-9a-f-]{36}$/u.test(id)) throw new Error('Invalid synthetic run ID');
  const before = snapshot();
  const stream = new EventSource(`/lab/events/${id}`);
  let events = 0;
  let claimed = false;
  let outcome;
  const timeline = [];
  const eventVisibility = [];
  const eventFocus = [];
  const eventTimes = [];
  const visibilityAtStart = document.visibilityState;
  const startedAt = new Date().toISOString();
  const transientChanges = [];
  const onFocus = () => { if (document.activeElement?.id !== before.focusId) transientChanges.push('focus'); };
  const onScroll = () => { if (scrollX !== before.scrollX || scrollY !== before.scrollY) transientChanges.push('scroll'); };
  document.addEventListener('focusin', onFocus);
  window.addEventListener('scroll', onScroll);
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Synthetic notification timeout')), 5000);
      stream.addEventListener('report', async (event) => {
        const data = JSON.parse(event.data);
        if (data.id !== id) { clearTimeout(timeout); reject(new Error('Unexpected synthetic event')); return; }
        events += 1;
        eventVisibility.push(document.visibilityState);
        eventFocus.push(document.hasFocus());
        eventTimes.push(new Date().toISOString());
        timeline.push('notification-received');
        if (claimed) return;
        claimed = true;
        timeline.push('processing-start');
        outcome = await processCandidate(id, test.resolve);
        timeline.push('processing-finished');
        clearTimeout(timeout);
        resolve();
      });
      stream.onerror = () => { clearTimeout(timeout); reject(new Error('Synthetic event stream failed')); };
    });
    const serverState = await request(`/lab/state/${id}`);
    const after = snapshot();
    const actual = [outcome.status, serverState.category, serverState.reportStatus,
      serverState.moveRequests, serverState.moveMutations, serverState.resolveRequests, serverState.resolveMutations];
    const resolveIndex = serverState.audit.indexOf('resolve-request');
    const appliedIndex = serverState.audit.indexOf('move-applied');
    const notificationCountCorrect = events === (test.id === 'duplicates' ? 3 : 1) && events === serverState.notifications;
    const orderVerified = resolveIndex < 0 || (appliedIndex >= 0 && resolveIndex > appliedIndex
      && serverState.audit.slice(appliedIndex + 1, resolveIndex).includes('article-read'));
    const pageStatePreserved = same(before, after) && transientChanges.length === 0;
    return {
      caseId: test.id, name: test.name, resolveReport: test.resolve,
      pass: same(actual, test.expected) && notificationCountCorrect && orderVerified && pageStatePreserved,
      expected: test.expected, actual, outcome, eventsReceived: events, notificationCountCorrect, orderVerified,
      startedAt, finishedAt: new Date().toISOString(), visibilityAtStart, eventVisibility, eventFocus, eventTimes,
      visibilityAtFinish: document.visibilityState,
      pageStatePreserved, transientChanges, before, after, timeline, serverState,
    };
  } finally {
    stream.close(); document.removeEventListener('focusin', onFocus); window.removeEventListener('scroll', onScroll);
  }
}

async function runSuite(delayMs) {
  button.disabled = true;
  delayedButton.disabled = true;
  summary.replaceChildren();
  output.textContent = '진행 중 · 이전 실행 결과를 재사용하지 않습니다.';
  totals.textContent = '새 실행을 기다리고 있습니다.';
  status.textContent = '실험 중 · 서버 알림을 기다리고 있습니다.';
  const observations = [];
  let error;
  try {
    if (delayMs > 0) {
      status.textContent = '5초 뒤 시작 · 다른 로컬 탭에서 합성 초안을 입력해도 됩니다.';
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    status.textContent = '실험 중 · 서버 알림을 기다리고 있습니다.';
    // Initial focus/selection/scroll setup belongs to the test, before processing starts.
    if (delayMs === 0) {
      draft.focus({ preventScroll: true });
      draft.setSelectionRange(2, 6);
      window.scrollTo(0, 80);
    }
    // requestAnimationFrame may stop in hidden tabs; do not depend on rendering.
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const test of cases) {
      const result = await execute(test);
      observations.push(result);
      const row = document.createElement('li');
      row.textContent = `${result.pass ? '통과' : '실패'} · ${test.name} · ${result.outcome.status} · 화면/초안 ${result.pageStatePreserved ? '보존' : '변경'}`;
      summary.append(row);
    }
  } catch (caught) { error = caught.message; }
  const report = {
    scope: 'localhost-synthetic-workflow-only', observedAt: new Date().toISOString(), userAgent: navigator.userAgent,
    notificationTransport: 'local SSE, not the Arca notification protocol', observationCount: observations.length,
    passed: observations.filter((item) => item.pass).length, observations,
    ...(error ? { error } : {}),
    limitations: ['실제 아카라이브 DOM/알림/권한/저장·전송 미검증', '합성 신고 기준 정책이며 광고 분류/AI 검증 아님',
      'Chrome 일반 페이지 실험이며 실제 Tampermonkey sandbox 실행 검증 아님', '단일 탭의 제한된 사례이며 탭 정지/종료/IME 입력/다중 관리자 보장 아님',
      '합성 서버의 revision 조건 지원을 실제 사이트 지원으로 가정할 수 없음'],
  };
  output.textContent = JSON.stringify(report, null, 2);
  status.textContent = !error && report.passed === cases.length ? '실험 완료 · 8/8 통과 · 실사이트 검증은 별도' : `실험 결과 · ${report.passed}/8 통과${error ? ` · ${error}` : ''}`;
  totals.textContent = `관측 ${report.observationCount}개 · 통과 ${report.passed}개 · 실사이트 요청 0건 (실험 코드에 대상 사이트 주소/연결 경로 없음)`;
  button.disabled = false;
  delayedButton.disabled = false;
}

button.addEventListener('click', () => runSuite(0));
delayedButton.addEventListener('click', () => runSuite(5000));
