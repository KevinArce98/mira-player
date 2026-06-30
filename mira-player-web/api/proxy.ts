export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url') ?? '';

  if (!/^http:\/\//i.test(target)) {
    return new Response('Only http:// URLs are supported', { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(target).hostname;
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  if (isPrivateHost(hostname)) {
    return new Response('Private hosts not allowed', { status: 403 });
  }

  const upstream = await fetch(target);
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function isPrivateHost(h: string): boolean {
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true;
  return false;
}
