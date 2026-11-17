// GCC V23.1: collect authorized, cursor-paginated teacher sessions.
// A missing migration can use the previous RPC, but other server errors must surface.
export const SESSION_PAGE_SIZE_V231=100;
export const MAX_SESSION_PAGES_V231=40;
export function missingPagedBrowseV231(error){
 return error?.code==='PGRST202' &&
  /gcc_v231_teacher_browse_sessions_page/.test(String(error?.message||'')+' '+String(error?.details||''));
}
export async function collectTeacherSessionsV231({
 getPage,getLegacy,pageSize=SESSION_PAGE_SIZE_V231,maxPages=MAX_SESSION_PAGES_V231
}){
 if(typeof getPage!=='function'||typeof getLegacy!=='function')throw Error('Session service not configured.');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100||
    !Number.isInteger(maxPages)||maxPages<1||maxPages>40)throw Error('Invalid session pagination settings.');
 const sessions=[],seen=new Set();
 let afterStart=null,afterId=null;
 for(let page=0;page<maxPages;page++){
  let payload;
  try{payload=await getPage({afterStart,afterId,limit:pageSize});}
  catch(error){
   // Only a *missing function* on the first page triggers compatibility fallback.
   // A real network, auth, permissions or execution failure must never be suppressed.
   if(page===0&&missingPagedBrowseV231(error)){
    const legacy=await getLegacy();
    if(!Array.isArray(legacy))throw Error('Invalid legacy session listing response.');
    return legacy;
   }
   throw error;
  }
  if(!payload||!Array.isArray(payload.items)||typeof payload.has_more!=='boolean')
   throw Error('Invalid paginated session listing response.');
  if(payload.items.length>pageSize||(!payload.has_more&&payload.items.length===0&&page>0))
   throw Error('Invalid session page returned by server.');
  for(const offer of payload.items){
   if(typeof offer?.id!=='string'||!offer.id||!Number.isFinite(Date.parse(offer.starts_at)))
    throw Error('Invalid session record returned by server.');
   if(seen.has(offer.id))throw Error('Duplicate session across listing pages.');
   if(afterStart!==null &&
      (Date.parse(offer.starts_at)<Date.parse(afterStart) ||
      (offer.starts_at===afterStart && offer.id<=afterId)))
    throw Error('Session pages are not ordered by start and ID.');
   sessions.push(offer);
   seen.add(offer.id);
   afterStart=offer.starts_at;
   afterId=offer.id;
  }
  if(!payload.has_more)return sessions;
  if(payload.items.length===0)throw Error('Session page cursor did not advance.');
 }
 throw Error('Session directory exceeds the current safe browse limit. Please narrow the time range or contact the GCC administrator; sessions were not silently hidden.');
}
