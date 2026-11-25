// Diagnostic for public session charts: never send real invitations or codes.
// The probe intentionally uses invalid arguments; the server RPC returns null
// before reading a session or incrementing the wrong-code counter.
export async function checkRoomChartConnectionV224({
  url,
  publishableKey,
  origin = typeof window==='undefined' ? undefined : window.location.origin,
  fetcher = globalThis.fetch,
  timeoutMs = 6000,
} = {}) {
  let target;
  try {
    target = new URL('/rest/v1/rpc/gcc_v112_open_room_chart',url);
    if (target.protocol!=='https:' || !publishableKey) throw Error('not configured');
  } catch {
    return {kind:'configuration',message:'GCC could not configure the room-chart connection. Please contact the GCC administrator.'};
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let errorMessage='';
  try {
    const response=await fetcher(target.toString(),{
      method:'POST',
      headers:{
        'content-type':'application/json',
        apikey:publishableKey,
        Authorization:'Bearer '+publishableKey,
      },
      body:JSON.stringify({p_token:'',p_access_code:''}),
      credentials:'omit',
      cache:'no-store',
      signal:controller.signal,
    });
    const type=response.headers?.get?.('content-type')||'';
    if(response.ok&&type.toLowerCase().includes('json')){
      const payload=await response.json();
      if(payload===null)return {
        kind:'reachable',
        message:'Your browser can reach the GCC room-chart API. Please try Verify code again. If it still fails, ask the GCC administrator to review the browser error and session.',
      };
    }
    if(response.status===401||response.status===403)return {
      kind:'service-error',
      message:'The room-chart service rejected the API request (HTTP '+response.status+'). Please contact the GCC administrator; changing your session code will not solve this.',
    };
    errorMessage=type&&!type.toLowerCase().includes('json')
      ? 'Your browser received a non-API response; a school filter or proxy may be intercepting it.'
      : 'The room-chart API responded with HTTP '+response.status+'.';
  } catch(e) {
    errorMessage=controller.signal.aborted||e?.name==='AbortError'
      ? 'Your browser timed out while connecting to the room-chart API.'
      : 'Your browser could not contact the room-chart API.';
  } finally {
    clearTimeout(timer);
  }

  // Second test is to the app itself. It checks server -> Supabase Auth health,
  // NOT the actual room-chart RPC; a successful result is only supporting evidence.
  let siteStatus=null;
  try {
    const siteUrl=new URL('/api/gcc-auth-health',origin);
    if(siteUrl.protocol==='https:'){
      const siteController=new AbortController();
      const siteTimer=setTimeout(()=>siteController.abort(),Math.min(timeoutMs,4500));
      try{
        const response=await fetcher(siteUrl.toString(),{
          method:'GET',cache:'no-store',credentials:'omit',signal:siteController.signal,
        });
        if(response.ok){
          const data=await response.json();
          if(data?.status==='reachable')siteStatus='reachable';
          if(data?.status==='upstream_error'||data?.status==='upstream_unreachable')siteStatus='unreachable';
        }
      }finally{clearTimeout(siteTimer);}
    }
  }catch{/* best-effort independent check */ }

  if(siteStatus==='reachable')return {
    kind:'possible-school-filter',
    message:errorMessage+' The GCC server can reach Supabase Auth, but this browser cannot complete the separate room-chart API request. Please ask your school ICT administrator to check permission for HTTPS access to '+target.origin+'/rest/v1/. Do not change security settings yourself.',
  };
  if(siteStatus==='unreachable')return {
    kind:'service-unreachable',
    message:errorMessage+' GCC also could not confirm the Supabase Auth service. Please contact the GCC administrator with the time and browser.',
  };
  return {
    kind:'unreachable',
    message:errorMessage+' Please try an institution-approved browser or network. Ask your school ICT administrator to check access to the GCC Supabase domain.',
  };
}
