// The database enforces the same eligibility independently.
export function canRemoveSessionV105(session,now=Date.now()){
  if(!session?.id)return false;
  if(session.status==='draft')return true;
  if(!['published','completed'].includes(session.status))return false;
  const start=Date.parse(session.starts_at||'');
  return Number.isFinite(start) && start<=now-(2*60*60*1000);
}
