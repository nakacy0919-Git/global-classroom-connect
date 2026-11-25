// Stable teacher-only links. No names, codes, or auth tokens in URLs.
export const validOfferV248=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||''));
export function operationsHashV248(id,tab='register'){
 if(!validOfferV248(id))throw Error('Invalid session link');
 return '#/teacher-portal?view=operate&offer='+encodeURIComponent(id)+'&tab='+(tab==='chart'?'chart':'register');
}
export function operationsParamsV248(hash){
 const q=new URLSearchParams(String(hash||'').split('?')[1]||'');
 const id=q.get('offer');return validOfferV248(id)?{id,tab:q.get('tab')==='chart'?'chart':'register'}:null;
}
export function rosterTextV248(students=[]){
 return students.map(s=>s.name+(s.grade?'\t'+s.grade:'')).join('\n');
}
export function parseRosterV248(text,limit=2000){
 const list=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{
  const fields=line.split('\t');const name=fields[0].trim(),grade=(fields[1]||'').trim();
  if(fields.length>2||!name||name.length>100||grade.length>30)throw Error('Use one display name and optional tab-separated grade per line.');
  return {name,grade};
 });
 if(list.length>limit)throw Error('Student list exceeds the approved allocation of '+limit+'.');
 return list;
}
