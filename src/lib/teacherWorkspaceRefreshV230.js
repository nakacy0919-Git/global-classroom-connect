// GCC V23: an optional failed request must never hide already published sessions.
// The teacher-scoped session listing is required; other panels may reuse cached data.
export async function loadTeacherWorkspaceSnapshotV230(fetchers,previous={}){
 const keys=['offers','requests','hostEvents','notifications'];
 const lookup={offers:'sessions',requests:'requests',hostEvents:'publicEvents',notifications:'notifications'};
 const labels={offers:'sessions',requests:'join requests',hostEvents:'public host sessions',notifications:'notifications'};
 const results=await Promise.allSettled(keys.map(key=>fetchers[lookup[key]]()));
 const first=results[0];
 if(first.status!=='fulfilled'||!Array.isArray(first.value)){
  const reason=first.status==='rejected'?first.reason?.message||'Connection unavailable':'Invalid response';
  throw Error('Could not load your sessions: '+reason);
 }
 const snapshot={offers:first.value,warnings:[]};
 for(let i=1;i<keys.length;i++){
  const key=keys[i],result=results[i];
  if(result.status==='fulfilled'&&Array.isArray(result.value))snapshot[key]=result.value;
  else{
   snapshot[key]=Array.isArray(previous[key])?previous[key]:[];
   snapshot.warnings.push(labels[key]);
  }
 }
 return snapshot;
}
