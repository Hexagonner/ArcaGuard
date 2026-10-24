// Standalone localhost experiment, never imported into the userscript.
const runButton = document.getElementById('run');
const draft = document.getElementById('draft');
const status = document.getElementById('status');
const results = document.getElementById('results');
const summary = document.getElementById('summary');
const runId = crypto.randomUUID();
globalThis.__labExecutions = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const snapshot = () => ({
  url: location.href, historyLength: history.length, focusId: document.activeElement?.id,
  value: draft.value, selectionStart: draft.selectionStart, selectionEnd: draft.selectionEnd,
  scrollX, scrollY,
});
const read = async (path, mode, type = 'text') => {
  const query = new URLSearchParams({ run: runId, mode });
  const response = await fetch(`${path}?${query}`, { signal: AbortSignal.timeout(3000), redirect: 'error' });
  if (!response.ok) throw new Error(`로컬 응답 오류: ${response.status}`);
  return type === 'json' ? response.json() : response.text();
};

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  summary.replaceChildren();
  status.textContent = '합성 응답을 읽고 있습니다.';
  const observations = [];
  try {
    // Positive control: ensure the local resource request recorder is working.
    const image = new Image();
    const query = new URLSearchParams({ run: runId, mode: 'control' });
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('관측 대조 이미지 로딩 실패'));
      image.src = `/probe/control.png?${query}`;
    });
    const control = await read('/stats', 'control', 'json');
    draft.focus({ preventScroll: true });
    draft.setSelectionRange(2, 6);
    for (const mode of ['text', 'domparser', 'template']) {
      const before = snapshot();
      const initialExecutions = globalThis.__labExecutions;
      const html = await read('/sample', mode);
      let root;
      if (mode === 'domparser') root = new DOMParser().parseFromString(html, 'text/html');
      if (mode === 'template') {
        const template = document.createElement('template');
        template.innerHTML = html;
        root = template.content;
      }
      const extractedText = root?.querySelector('[data-lab="text"]')?.textContent ?? null;
      const extractedHref = root?.querySelector('a')?.getAttribute('href')?.split('?')[0] ?? null;
      const extractedImage = root?.querySelector('img')?.getAttribute('src')?.split('?')[0] ?? null;
      await sleep(700);
      const resources = await read('/stats', mode, 'json');
      const after = snapshot();
      observations.push({
        mode, extractedText, extractedHref, extractedImage,
        resourceRequests: resources.map((probe) => probe.resource),
        scriptOrHandlerExecutions: globalThis.__labExecutions - initialExecutions,
        pageStatePreserved: JSON.stringify(before) === JSON.stringify(after), before, after,
      });
    }
    const report = {
      scope: 'localhost-synthetic-only', observedAt: new Date().toISOString(), userAgent: navigator.userAgent,
      observationWindowMsPerCase: 700, positiveControlRequests: control.length, observations,
      limitations: ['한 브라우저의 소규모 합성 사례', '실사이트 DOM/권한/읽음 부작용 미검증', '모든 입력의 안전성·성능·IME 보존을 보장하지 않음'],
    };
    results.textContent = JSON.stringify(report, null, 2);
    for (const observation of observations) {
      const item = document.createElement('li');
      item.textContent = `${observation.mode}: 관측용 추가 요청 ${observation.resourceRequests.length}건, `
        + `스크립트 실행 ${observation.scriptOrHandlerExecutions}건, `
        + `화면·초안 보존 ${observation.pageStatePreserved ? '확인' : '실패'}`;
      summary.append(item);
    }
    status.textContent = '실험 완료 · 실제 사이트 연동 검증은 아닙니다.';
  } catch (error) {
    status.textContent = `실험 중단: ${error.message}`;
  } finally {
    runButton.disabled = false;
  }
});
