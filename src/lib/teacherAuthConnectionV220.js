// GCC V22.0: Diagnose managed-device connection failures without user credentials.
// Both tests are read-only. No password, email, session token or student data is sent.
export function isTeacherAuthTransportErrorV220(error) {
  const description = [error?.name, error?.code, error?.message].filter(Boolean).join(' ').toLowerCase();
  return /authretryablefetcherror|failed to fetch|network request failed|networkerror when attempting to fetch|load failed|fetch failed|network request timed out/.test(description);
}

async function checkSiteServiceV220({fetcher, origin, timeoutMs}) {
  let endpoint;
  try {
    endpoint = new URL('/api/gcc-auth-health', origin);
    if (endpoint.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(endpoint.toString(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.status === 'reachable') return 'reachable';
    if (data?.status === 'upstream_error' ||
        data?.status === 'upstream_unreachable') return 'unreachable';
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkTeacherAuthConnectionV220({
  url,
  fetcher = globalThis.fetch,
  online = typeof navigator === 'undefined' ? undefined : navigator.onLine,
  origin = typeof window === 'undefined' ? undefined : window.location.origin,
  timeoutMs = 6500,
} = {}) {
  if (online === false) return {
    kind: 'offline',
    message: 'This device reports that it is offline. Reconnect to the internet before signing in.',
  };
  let endpoint;
  try {
    endpoint = new URL('/auth/v1/health', url);
    if (endpoint.protocol !== 'https:') throw new Error('HTTPS required');
  } catch {
    return {
      kind: 'configuration',
      message: 'GCC could not determine its account-service address. Please contact the GCC administrator.',
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let failure = null;
  try {
    const response = await fetcher(endpoint.toString(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (response.status >= 500) return {
      kind: 'server',
      message: 'The account service returned a server error (HTTP ' + response.status + '). Please try again later and contact the GCC administrator if it continues.',
    };
    // A school filter may return an HTML block page with HTTP 200.
    // Treat it as an unverified response, not a healthy Supabase endpoint.
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType && !contentType.toLowerCase().includes('json')) {
      failure = 'The connection returned a non-API response. A school security filter or proxy may be intercepting it.';
    } else if (response.status === 407 || response.status === 451) {
      failure = 'The account-service request was blocked by a proxy or network policy.';
    } else {
      return {
        kind: 'reachable',
        message: 'Your browser received a response from the GCC account-service gateway. Try Sign in again. If it still fails, contact the GCC administrator with the time and browser.',
      };
    }
  } catch (error) {
    const timedOut = controller.signal.aborted || error?.name === 'AbortError';
    failure = timedOut
      ? 'The account service did not respond in time.'
      : 'Your browser could not reach or read the account-service response.';
  } finally {
    clearTimeout(timer);
  }

  const site = await checkSiteServiceV220({fetcher, origin, timeoutMs: 4500});
  if (site === 'reachable') return {
    kind: 'managed-network',
    message: failure + ' However, the GCC server can reach Supabase. This points to filtering or browser restrictions on this device or network. Ask your school ICT administrator to approve HTTPS access to ' + endpoint.origin + ' (Auth and REST APIs). Do not change school security settings yourself.',
  };
  if (site === 'unreachable') return {
    kind: 'service-unreachable',
    message: failure + ' The GCC server also could not verify Supabase. Please inform the GCC administrator of the time and browser. Do not recreate your account.',
  };
  return {
    kind: 'unreachable',
    message: failure + ' Try another network approved by your school or a different approved browser, and ask your school ICT administrator to check GCC Supabase access. Never share your password.',
  };
}
