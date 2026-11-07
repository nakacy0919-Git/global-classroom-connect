// Read-only, credential-free connectivity probe for managed school devices.
// This is NOT an authentication proxy. No user data, password, token, or
// browser-provided URL is accepted or forwarded.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'method_not_allowed' });
  }
  const rawUrl = process.env.VITE_SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let upstream;
  try {
    upstream = new URL(rawUrl);
    if (upstream.protocol !== 'https:' ||
        !/^[a-z0-9-]+\.supabase\.co$/i.test(upstream.hostname) ||
        !apiKey) throw new Error('Not configured');
  } catch {
    return res.status(503).json({ status: 'not_configured' });
  }
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(new URL('/auth/v1/health', upstream), {
      method: 'GET',
      headers: { apikey: apiKey, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    // Verify the actual GoTrue JSON response, not an HTML/JSON block page.
    const body = response.ok && contentType.toLowerCase().includes('json')
      ? await response.json().catch(() => null)
      : null;
    const gatewayUp = body?.name === 'GoTrue';
    return res.status(200).json({
      status: gatewayUp ? 'reachable' : 'upstream_error',
      upstream_status: response.status,
    });
  } catch {
    return res.status(200).json({ status: 'upstream_unreachable' });
  } finally {
    clearTimeout(abortTimer);
  }
}
