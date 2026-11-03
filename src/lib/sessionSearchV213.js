// GCC V21.3 — one search engine for teacher offers and public host sessions.
// Unknown legacy metadata is never silently treated as a match for a specific filter.
import {overlapsLocalTimeV150,partnerLevelsV150,detailsV150,sessionTitleV150} from './sessionStudioV150.js';
import {timePartsV112} from './sessionTimeV112.js';
import {hostCountryV208} from './sessionDiscoveryV208.js';

const text=v=>String(v??'').trim().toLocaleLowerCase();
const asList=v=>Array.isArray(v)?v:[];
const asValue=v=>v===undefined||v===null?'':String(v);
export const FAVORITE_KINDS_V213=Object.freeze(['offer','event']);
export function favoriteKeyV213(source,id){return FAVORITE_KINDS_V213.includes(source)&&id?source+':'+id:'';}
export function sessionSearchRecordsV213(offers=[],events=[],now=Date.now()){
 const out=[];
 for(const o of offers||[]){
  if(!o||o.is_mine||o.status!=='open'||Date.parse(o.ends_at)<=now)continue;
  const deadline=Date.parse(o.session_details?.registration_closes_at||'');
  if(Number.isFinite(deadline)&&deadline<=now)continue;
  out.push({source:'offer',id:o.id,start:o.starts_at,end:o.ends_at,
   country_code:o.country_code,country_name:o.country_name,
   item:o,details:detailsV150(o),title:sessionTitleV150(o),
   partner_levels:partnerLevelsV150(o),available_seats:o.available_seats});
 }
 for(const e of events||[]){
  if(!e||e.status!=='published'||Date.parse(e.ends_at)<=now)continue;
  const deadline=Date.parse(e.session_details?.registration_closes_at||'');
  if(Number.isFinite(deadline)&&deadline<=now)continue;
  const host=hostCountryV208(e);
  const d=e.session_details||{};
  const capacity=Number(e.max_students||d.max_participants)||null;
  const students=Number(e.students)||0;
  out.push({source:'event',id:e.id,start:e.starts_at,end:e.ends_at,
   country_code:host.code,country_name:host.name,
   item:e,details:d,title:e.title||'Global Classroom Exchange',
   partner_levels:asList(d.target_levels),available_seats:capacity!==null?Math.max(0,capacity-students):null});
 }
 return out;
}
export function filterSessionRecordsV213(records,filters={},identity={},now=Date.now()){
 const f={country:'',band:'',mode:'',kind:'',sdg:'',age:'',query:'',date:'',
  from:'',to:'',compatible:false,favoritesOnly:false,sort:'soonest',...filters};
 const favoriteKeys=filters.favoriteKeys instanceof Set?filters.favoriteKeys:new Set(asList(filters.favoriteKeys));
 const zone=identity?.timezone||'UTC',query=text(f.query);
 const selected=(records||[]).filter(r=>{
  if(Date.parse(r.end)<=now)return false;
  const d=r.details||{};
  if(f.country&&r.country_code!==f.country)return false;
  if(f.band&&!r.partner_levels.includes(f.band))return false;
  if(f.compatible&&identity.school_level&&!r.partner_levels.includes(identity.school_level)&&!r.partner_levels.includes('Mixed'))return false;
  if(f.mode&&d.mode!==f.mode)return false;
  if(f.kind&&d.session_type!==f.kind)return false;
  if(f.sdg&&asValue(d.sdg)!==asValue(f.sdg))return false;
  if(f.age&&!(Number(d.min_age)<=Number(f.age)&&Number(f.age)<=Number(d.max_age)))return false;
  if(f.favoritesOnly&&!favoriteKeys.has(favoriteKeyV213(r.source,r.id)))return false;
  if(query&&!text([r.title,r.country_name,r.item?.school_name,r.item?.topic,
   d.description,d.goals,d.language,d.preferred_countries].join(' ')).includes(query))return false;
  if(f.date)try{
   const a=timePartsV112(r.start,zone).date,b=timePartsV112(r.end,zone).date;
   if(a!==f.date&&b!==f.date)return false;
  }catch{return false;}
  if(!overlapsLocalTimeV150({starts_at:r.start,ends_at:r.end},zone,f.from,f.to))return false;
  return true;
 });
 const comparison={
  soonest:(a,b)=>Date.parse(a.start)-Date.parse(b.start),
  latest:(a,b)=>Date.parse(b.start)-Date.parse(a.start),
  seats:(a,b)=>(Number(b.available_seats??-1)-Number(a.available_seats??-1))||Date.parse(a.start)-Date.parse(b.start),
  country:(a,b)=>String(a.country_name||'').localeCompare(String(b.country_name||''))||Date.parse(a.start)-Date.parse(b.start)
 };
 selected.sort((a,b)=>(comparison[f.sort]||comparison.soonest)(a,b));
 return selected;
}
export function sessionResultsPageV213(records,visible=12){
 const n=Math.min(Math.max(12,Number(visible)||12),500);
 return {items:records.slice(0,n),total:records.length,hasMore:records.length>n,
  remaining:Math.max(0,records.length-n)};
}
