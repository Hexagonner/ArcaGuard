import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Independent Phase 1 feasibility experiment. No Arca endpoints or credentials.
const origin = 'http://127.0.0.1:5185';
const page = readFileSync(new URL('../tests/manual/workflow-lab.html', import.meta.url));
const script = readFileSync(new URL('../tests/manual/workflowLab.js', import.meta.url));
const cases = new Set(['move-only', 'resolve', 'duplicates', 'already-moved', 'move-denied', 'unchanged', 'resolve-failed', 'below-threshold']);
const runs = new Map();
const streams = new Set();

async function body(request) {
  let value = '';
  for await (const chunk of request) {
    value += chunk;
    if (value.length > 1024) throw new Error('Request too large');
  }
  return JSON.parse(value);
}

function send(response, status, value, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type });
  response.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, origin);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (url.origin !== origin || request.headers.host !== '127.0.0.1:5185'
      || !['GET', 'POST'].includes(request.method)
      || (request.method === 'POST' && request.headers.origin !== origin)) {
    send(response, 403, { error: 'Local experiment only' });
    return;
  }
  try {
    if (request.method === 'GET' && url.pathname === '/') return send(response, 200, page, 'text/html; charset=utf-8');
    if (request.method === 'GET' && url.pathname === '/lab.js') return send(response, 200, script, 'text/javascript; charset=utf-8');
    if (request.method === 'GET' && url.pathname === '/favicon.ico') return response.writeHead(204).end();
    if (request.method === 'POST' && url.pathname === '/lab/run') {
      const input = await body(request);
      if (!cases.has(input.caseId) || Object.keys(input).length !== 1) return send(response, 400, { error: 'Invalid case' });
      if (runs.size >= 64) return send(response, 429, { error: 'Restart the bounded lab' });
      const id = randomUUID();
      runs.set(id, {
        id, caseId: input.caseId, category: input.caseId === 'already-moved' ? 'quarantine' : 'ordinary',
        reportStatus: 'pending', reply: '', revision: 1, body: '합성 본문 · 서버에서 보존 여부를 대조합니다.',
        total: input.caseId === 'below-threshold' ? 1 : 3,
        moveRequests: 0, moveMutations: 0, resolveRequests: 0, resolveMutations: 0, notifications: 0, audit: [],
      });
      return send(response, 201, { id });
    }
    const match = /^\/lab\/(events|report|article|move|resolve|state)\/([0-9a-f-]{36})$/u.exec(url.pathname);
    const run = match && runs.get(match[2]);
    if (!run) return send(response, 404, { error: 'Unknown synthetic run' });
    const operation = match[1];
    if (request.method === 'GET' && operation === 'events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
      response.write('event: ready\ndata: {}\n\n');
      streams.add(response);
      const timers = [];
      for (let index = 0; index < (run.caseId === 'duplicates' ? 3 : 1); index += 1) {
        timers.push(setTimeout(() => {
          run.notifications += 1;
          run.audit.push('notification');
          response.write(`event: report\ndata: ${JSON.stringify({ id: run.id })}\n\n`);
        }, 350 + index * 20));
      }
      request.on('close', () => { timers.forEach(clearTimeout); streams.delete(response); });
      return;
    }
    if (request.method === 'GET' && operation === 'report') {
      run.audit.push('report-read');
      return send(response, 200, `<!doctype html><main data-report="${run.id}">
        <a data-target href="/lab/article/${run.id}">합성 대상</a>
        <p data-total>${run.total}</p><p data-reason>광고 의심 신고 · 합성 자료</p>
        <p data-status>${run.reportStatus}</p><p data-reply>${run.reply}</p>
        </main>`, 'text/html; charset=utf-8');
    }
    if (request.method === 'GET' && operation === 'article') {
      run.audit.push('article-read');
      return send(response, 200, { id: run.id, category: run.category, revision: run.revision, body: run.body, canModerate: true });
    }
    if (request.method === 'GET' && operation === 'state') return send(response, 200, run);
    if (request.method === 'POST' && operation === 'move') {
      const input = await body(request);
      run.moveRequests += 1;
      run.audit.push('move-request');
      if (run.caseId === 'move-denied') return send(response, 403, { error: 'Synthetic permission denial' });
      if (input.destination !== 'quarantine' || input.expectedRevision !== run.revision || Object.keys(input).length !== 2) {
        return send(response, 409, { error: 'Synthetic state mismatch' });
      }
      // Ensure repeated notifications arrive while the first request is pending.
      if (run.caseId === 'duplicates') await new Promise((resolve) => setTimeout(resolve, 120));
      if (run.caseId !== 'unchanged') {
        run.category = 'quarantine'; run.revision += 1; run.moveMutations += 1;
        run.audit.push('move-applied');
      }
      return send(response, 200, { accepted: true });
    }
    if (request.method === 'POST' && operation === 'resolve') {
      const input = await body(request);
      run.resolveRequests += 1;
      run.audit.push('resolve-request');
      if (run.caseId === 'resolve-failed') return send(response, 503, { error: 'Synthetic report submission failure' });
      if (run.category !== 'quarantine' || run.reportStatus !== 'pending'
          || input.action !== 'synthetic-review' || input.reply !== '합성 처리 답변'
          || Object.keys(input).length !== 2) return send(response, 409, { error: 'Synthetic report mismatch' });
      run.reportStatus = 'completed'; run.reply = input.reply; run.resolveMutations += 1;
      run.audit.push('resolve-applied');
      return send(response, 200, { accepted: true });
    }
    return send(response, 405, { error: 'Unsupported synthetic operation' });
  } catch (error) {
    if (!response.headersSent) send(response, 400, { error: error.message });
    else response.end();
  }
});

server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(5185, '127.0.0.1', () => console.log(`Synthetic workflow experiment: ${origin}`));
process.once('SIGINT', () => {
  for (const response of streams) response.end();
  server.close();
});
