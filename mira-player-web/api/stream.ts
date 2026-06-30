export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);
  const targetUrl = searchParams.get('url') ?? '';

  if (!/^http:\/\//i.test(targetUrl)) {
    return new Response('Only http:// URLs supported', { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  if (isPrivateHost(hostname)) {
    return new Response('Private hosts not allowed', { status: 403 });
  }

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';
  const upstreamHeaders: Record<string, string> = {};
  if (clientIp) {
    upstreamHeaders['X-Forwarded-For'] = clientIp;
    upstreamHeaders['X-Real-IP'] = clientIp;
  }
  if (userAgent) upstreamHeaders['User-Agent'] = userAgent;

  const upstream = await fetch(targetUrl, { headers: upstreamHeaders });
  const contentType = upstream.headers.get('Content-Type') ?? '';
  const isM3u8 =
    contentType.includes('mpegurl') ||
    contentType.includes('x-mpegURL') ||
    /\.m3u8?(\?|$)/i.test(targetUrl);

  if (isM3u8) {
    const text = await upstream.text();
    const rewritten = rewriteM3u8(text, targetUrl, origin);
    return new Response(rewritten, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': contentType || 'video/MP2T',
      'Cache-Control': 'no-store',
    },
  });
}

function rewriteM3u8(content: string, sourceUrl: string, proxyOrigin: string): string {
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

function isPrivateHost(h: string): boolean {
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true;
  return false;
}
