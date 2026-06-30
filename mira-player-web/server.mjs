import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT ?? 3003;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

function isPrivateHost(h) {
  if (['localhost', '127.0.0.1', '::1'].includes(h)) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true;
  return false;
}

function rewriteM3u8(content, sourceUrl, proxyOrigin) {
  const base = new URL(sourceUrl);
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        if (trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
            const abs = new URL(uri, base).href;
            return `URI="${proxyOrigin}/api/stream?url=${encodeURIComponent(abs)}"`;
          });
        }
        return line;
      }
      const abs = new URL(trimmed, base).href;
      return `${proxyOrigin}/api/stream?url=${encodeURIComponent(abs)}`;
    })
    .join('\n');
}

async function handleApi(req, res, pathname, searchParams) {
  const targetUrl = searchParams.get('url') ?? '';
  const proto = req.headers['x-forwarded-proto'] ?? 'http';
  const proxyOrigin = `${proto}://${req.headers.host}`;

  if (!/^https?:\/\//i.test(targetUrl)) {
    res.writeHead(400); res.end('Invalid URL'); return;
  }

  let hostname;
  try { hostname = new URL(targetUrl).hostname; }
  catch { res.writeHead(400); res.end('Invalid URL'); return; }

  if (isPrivateHost(hostname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? '';
  const userAgent = req.headers['user-agent'] ?? '';
  const headers = {};
  if (clientIp) { headers['X-Forwarded-For'] = clientIp; headers['X-Real-IP'] = clientIp; }
  if (userAgent) headers['User-Agent'] = userAgent;

  const upstream = await fetch(targetUrl, { headers });

  if (pathname === '/api/proxy') {
    const body = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(body);
    return;
  }

  // /api/stream
  const contentType = upstream.headers.get('Content-Type') ?? '';
  const isM3u8 = contentType.includes('mpegurl') || /\.m3u8?(\?|$)/i.test(targetUrl);

  if (isM3u8) {
    const text = await upstream.text();
    const rewritten = rewriteM3u8(text, targetUrl, proxyOrigin);
    res.writeHead(upstream.status, {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-store',
    });
    res.end(rewritten);
    return;
  }

  res.writeHead(upstream.status, {
    'Content-Type': contentType || 'video/MP2T',
    'Cache-Control': 'no-store',
  });
  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

async function handleStatic(res, pathname) {
  let filePath = join(DIST, pathname === '/' ? 'index.html' : pathname);
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST, 'index.html');
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname, url.searchParams);
    } else {
      await handleStatic(res, url.pathname);
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) { res.writeHead(500); res.end('Internal error'); }
  }
}).listen(PORT, () => console.log(`Mira TV running on :${PORT}`));
