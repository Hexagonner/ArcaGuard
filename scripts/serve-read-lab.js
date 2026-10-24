import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

// Phase 1 browser research only. No site data, credentials or remote requests.
const origin = 'http://127.0.0.1:5184';
const page = readFileSync(new URL('../tests/manual/background-read-lab.html', import.meta.url));
const script = readFileSync(new URL('../tests/manual/backgroundReadLab.js', import.meta.url));
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const probes = [];
const modes = new Set(['text', 'domparser', 'template', 'control']);

const server = createServer((request, response) => {
  const url = new URL(request.url, origin);
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' || url.origin !== origin || request.headers.host !== '127.0.0.1:5184') {
    response.writeHead(403).end();
    return;
  }
  const send = (type, value) => {
    response.writeHead(200, { 'Content-Type': type });
    response.end(value);
  };
  if (url.pathname === '/') return send('text/html; charset=utf-8', page);
  if (url.pathname === '/lab.js') return send('text/javascript; charset=utf-8', script);
  if (url.pathname === '/favicon.ico') return response.writeHead(204).end();
  const run = url.searchParams.get('run') ?? '';
  const mode = url.searchParams.get('mode') ?? '';
  if (!/^[a-zA-Z0-9-]{1,64}$/u.test(run) || !modes.has(mode)) {
    response.writeHead(400).end();
    return;
  }
  const query = new URLSearchParams({ run, mode }).toString();
  if (url.pathname === '/sample') {
    return send('text/html; charset=utf-8', `<!doctype html><html><head>
      <link rel="stylesheet" href="/probe/style.css?${query}"></head><body>
      <p data-lab="text">합성 문서</p>
      <a href="/probe/link?${query}"><picture><source srcset="/probe/source.png?${query}">
      <img src="/probe/image.png?${query}" onload="globalThis.__labExecutions++"></picture></a>
      <iframe src="/probe/frame?${query}"></iframe>
      <script>globalThis.__labExecutions++;</script></body></html>`);
  }
  if (url.pathname === '/stats') {
    return send('application/json', JSON.stringify(probes.filter((probe) => probe.run === run && probe.mode === mode)));
  }
  if (url.pathname.startsWith('/probe/')) {
    probes.push({ run, mode, resource: url.pathname });
    if (probes.length > 500) probes.shift();
    if (url.pathname.endsWith('.png')) return send('image/png', pixel);
    if (url.pathname.endsWith('.css')) return send('text/css', 'body {}');
    return send('text/html; charset=utf-8', '<!doctype html><p>로컬 관측용 응답</p>');
  }
  response.writeHead(404).end();
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(5184, '127.0.0.1', () => console.log(`Read-only synthetic lab: ${origin}`));
process.once('SIGINT', () => server.close());
