// V10.10: deterministic, school-scoped placement choices. Server is authoritative.
const cmp=new Intl.Collator('en',{sensitivity:'base',numeric:true});
export function sortUnpairedV110(students,pairs){
 const used=new Set((pairs||[]).flatMap(p=>[String(p.a),String(p.b)]));
 return (students||[]).filter(s=>!used.has(String(s.id))).slice().sort((a,b)=>cmp.compare(a.name,b.name)||cmp.compare(String(a.id),String(b.id)));
}
export function roomCandidatesV110({roomStats,students,ownTotal}){
 const stats=roomStats||[];
 const n=Math.max(1,stats.length);
 const total=stats.reduce((sum,r)=>sum+Number(r.total||0),0);
 const capacity=Math.max(4,Math.ceil(total/n));
 const schoolCap=Math.max(2,Math.ceil((ownTotal||0)/n));
 return stats.map(r=>{
  const removed=(students||[]).filter(s=>Number(s.room)===Number(r.room)).length;
  const left=Number(r.total||0)-removed;
  const own=Number(r.school_students||0)-removed;
  const other=left-own;
  const moving=(students||[]).length;
  const newTotal=left+moving;
  const newOwn=own+moving;
  const crowded=newTotal>capacity;
  const schoolHeavy=newOwn>schoolCap;
  const warning=crowded||schoolHeavy;
  // Recommendations only: manual teacher placements are never blocked.
  const score=(other?0:100)+own*25+left*4+(crowded?160:0)+(schoolHeavy?220:0);
  return {room:Number(r.room),total:left,own,other,capacity,schoolCap,newTotal,newOwn,
    allowed:true,crowded,schoolHeavy,warning,score};
 }).sort((a,b)=>Number(a.warning)-Number(b.warning)||a.score-b.score||a.room-b.room);
}
export function formatPlacementV110(item){
 return `Room ${String(item.room).padStart(2,'0')} · ${item.total} currently · ${item.own} your school${item.warning?' · ⚠ crowded (manual move allowed)':''}`;
}
