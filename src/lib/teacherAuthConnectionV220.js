// GCC V22.0: Diagnose teacher sign-in transport failures without transmitting credentials.
// This probe checks reachability only. It never signs in, retries a password, or changes accounts.
export function isTeacherAuthTransportErrorV220(error) {
  const description = [error?.name, error?.code, error?.message].filter(Boolean).join(' ').toLowerCase();
  return /authretryablefetcherror|failed to fetch|network request failed|networkerror when attempting to fetch|load failed|fetch failed|network request timed out/.test(description);
}

export async function checkTeacherAuthConnectionV220({
  url,
  fetcher = globalThis.fetch,
  online = typeof navigator === 'undefined' ? undefined : navigator.onLine,
  timeoutMs = 8000,
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
    return {
      kind: 'reachable',
      message: 'Your browser received a response from the GCC account-service gateway. Try Sign in again. If it still fails, contact the GCC administrator with the time and browser.',
    };
  } catch (error) {
    const timedOut = controller.signal.aborted || error?.name === 'AbortError';
    return {
      kind: 'unreachable',
      message: timedOut
        ? 'The account service did not respond in time. Try another network or ask your network administrator to check access to the GCC Supabase domain.'
        : 'Your browser could not reach or read the account-service response. Try a private window or another network; browser extensions, school filters, or connection settings may be blocking it.',
    };
  } finally {
    clearTimeout(timer);
  }
}
