// GCC V15.0 session design & international matching helpers. No PII and no network.
import {timePartsV112} from './sessionTimeV112.js';
export const GCC_LEVELS_V150=Object.freeze([
 ['Primary','Elementary (ages 6–12)'],
 ['Lower Secondary','Junior high (ages 12–15)'],
 ['Upper Secondary','High school (ages 15–18)'],
 ['University','University / college'],
 ['Mixed','Mixed ages']
]);
export const GCC_SDG_V150=Object.freeze([
 'No Poverty','Zero Hunger','Good Health and Well-being','Quality Education',
 'Gender Equality','Clean Water and Sanitation','Affordable and Clean Energy',
 'Decent Work and Economic Growth','Industry, Innovation and Infrastructure',
 'Reduced Inequalities','Sustainable Cities and Communities',
 'Responsible Consumption and Production','Climate Action','Life Below Water',
 'Life on Land','Peace, Justice and Strong Institutions','Partnerships for the Goals'
]);
export const GCC_MODES_V150=Object.freeze({
 device:{name:'1 device per student',subtitle:'Individual conversations and small Zoom breakout rooms',icon:'📱'},
 classroom:{name:'Classroom to classroom',subtitle:'Two classes connect through a shared screen and microphone',icon:'🖥️'},
 hybrid:{name:'Flexible / hybrid',subtitle:'Mix individual devices and whole-class exchanges',icon:'🌐'}
});
export function detailsV150(offer){
 const d=offer?.session_details;
 return d&&typeof d==='object'&&!Array.isArray(d)?d:{};
}
export function sessionTitleV150(offer){
 const d=detailsV150(offer);
 return typeof d.session_name==='string'&&d.session_name.trim()?d.session_name.trim():offer?.topic||'Open classroom exchange';
}
export function partnerLevelsV150(offer){
 const v=detailsV150(offer).target_levels;
 return Array.isArray(v)&&v.length?v:[offer?.age_band||'Mixed'];
}
export function minuteOfDayV150(time){
 if(!/^\d{2}:\d{2}$/.test(time||''))return null;
 const [h,m]=time.split(':').map(Number);
 return h<24&&m<60?h*60+m:null;
}
export function overlapsLocalTimeV150(offer,zone,from,to){
 const lower=minuteOfDayV150(from),upper=minuteOfDayV150(to);
 if(lower===null||upper===null||lower===upper)return true;
 try{
  const start=timePartsV112(offer.starts_at,zone),end=timePartsV112(offer.ends_at,zone);
  const startAbs=Date.parse(start.date+'T00:00:00Z')/60000+start.hour*60+start.minute;
  const endAbs=Date.parse(end.date+'T00:00:00Z')/60000+end.hour*60+end.minute;
  for(let day=Math.floor(startAbs/1440)-1;day<=Math.floor(endAbs/1440)+1;day++){
   const lo=day*1440+lower,hi=day*1440+(upper>lower?upper:upper+1440);
   if(Math.min(endAbs,hi)>Math.max(startAbs,lo))return true;
  }
  return false;
 }catch{return false;}
}
export function filterOffersV150(offers,filters,identity,now=Date.now()){
 const {country='',band='',topic='',sdg='',mode='',from='',to='',date='',compatible=false}=filters;
 const zone=identity?.timezone||'UTC',language=String(topic||'').toLocaleLowerCase().trim();
 return (offers||[]).filter(o=>{
  if(o.is_mine||o.status!=='open'||Date.parse(o.ends_at)<=now)return false;
  const d=detailsV150(o);
  if(country&&o.country_code!==country)return false;
  if(band&&!partnerLevelsV150(o).includes(band))return false;
  if(compatible&&identity?.school_level&&!partnerLevelsV150(o).includes(identity.school_level)&&!partnerLevelsV150(o).includes('Mixed'))return false;
  if(mode&&d.mode!==mode)return false;
  if(sdg&&String(d.sdg||'')!==String(sdg))return false;
  if(language&&![sessionTitleV150(o),o.topic,o.school_name,o.country_name,d.goals,d.language].join(' ').toLocaleLowerCase().includes(language))return false;
  if(date){
   // Date and start/end are interpreted in the signed-in teacher's own zone.
   try{
    const a=timePartsV112(o.starts_at,zone),b=timePartsV112(o.ends_at,zone);
    if(a.date!==date&&b.date!==date)return false;
   }catch{return false;}
  }
  if(!overlapsLocalTimeV150(o,zone,from,to))return false;
  return true;
 }).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
}
export function sessionDetailsPayloadV150({name,mode,targetLevels,sdg,language,englishLevel,goals}){
 return {
  session_name:String(name||'').trim().slice(0,120),
  mode:mode in GCC_MODES_V150?mode:'classroom',
  target_levels:[...new Set((targetLevels||[]).filter(v=>GCC_LEVELS_V150.some(([id])=>id===v)))],
  sdg:sdg?Number(sdg):null,
  language:String(language||'').trim().slice(0,100),
  english_level:String(englishLevel||'').trim().slice(0,80),
  goals:String(goals||'').trim().slice(0,400)
 };
}
