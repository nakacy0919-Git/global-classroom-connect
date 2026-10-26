// GCC V13.0 — pure presentation and saved/publication comparison helpers.
import {timePartsV112} from './sessionTimeV112.js';

export function flagForCountryV130(code){
 const c=String(code||'').toUpperCase();
 if(!/^[A-Z]{2}$/.test(c))return '🌐';
 return String.fromCodePoint(...[...c].map(letter=>127397+letter.charCodeAt(0)));
}
export function rosterOverviewV130(signups){
 const list=Array.isArray(signups)?signups:[];
 const approved=list.filter(s=>s.status==='approved');
 return {
  schools:list.length,
  approved:approved.length,
  waiting:list.filter(s=>s.status==='pending').length,
  students:approved.reduce((n,s)=>n+(s.students||[]).length,0),
  countries:new Set(approved.map(s=>String(s.country_code||s.country_name||'').trim().toUpperCase()).filter(Boolean)).size
 };
}
export function sessionScheduleV130(event){
 const zone=event?.timezone||'Asia/Tokyo';
 try{
  const start=timePartsV112(event.starts_at,zone);
  const end=event.ends_at?timePartsV112(event.ends_at,zone):null;
  const date=new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date(event.starts_at));
  const label=new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'short'}).formatToParts(new Date(event.starts_at)).find(x=>x.type==='timeZoneName')?.value||zone;
  return {date,start:start.time,end:end?.time||'—',zone:label,hourAngle:(start.hour%12+start.minute/60)*30,minuteAngle:start.minute*6};
 }catch{return {date:'Date unavailable',start:'—',end:'—',zone,hourAngle:0,minuteAngle:0};}
}
export function planFreshnessV130({signups=[],savedDraft=null,publication=null}){
 const registered=new Set(signups.filter(s=>s.status==='approved').flatMap(s=>(s.students||[]).map(st=>String(st.id))));
 const ids=savedDraft?.draft?.rooms?.flatMap(r=>r.students||[]).map(String)||[];
 const saved=new Set(ids);
 const missing=[...registered].filter(id=>!saved.has(id)).length;
 const extra=[...saved].filter(id=>!registered.has(id)).length;
 const duplicate=ids.length!==saved.size;
 const revision=Number(savedDraft?.revision||0);
 const published=publication?.is_active?Number(publication.revision||0):null;
 return {approvedStudents:registered.size,savedStudents:ids.length,
  missing,extra,duplicate,revision,published,
  allIncluded:revision>0&&missing===0&&extra===0&&!duplicate,
  publicationBehind:revision>0&&published!==null&&published!==revision};
}
