import {timePartsV112} from './sessionTimeV112.js';
import {hostCountryV208} from './sessionDiscoveryV208.js';
// A level is only inferred from explicit metadata or school names, never from partner preferences.
const LEVELS=Object.freeze({'Primary':['🏫','Elementary School'],'Lower Secondary':['🎒','Middle School'],'Upper Secondary':['🎓','High School'],'University':['🎓','College / University'],'Mixed':['👥','Mixed Ages']});
export function schoolLevelV209(record){
 const d=record?.session_details||{};
 const named=String(d.host_school_level||record?.age_band||'').trim();
 if(LEVELS[named])return {icon:LEVELS[named][0],label:LEVELS[named][1],known:true};
 const name=String(record?.title||record?.school_name||d.school_name||'');
 if(/(?:high school|senior secondary|upper secondary)/i.test(name))return {icon:'🎓',label:'High School',known:true};
 if(/(?:middle school|junior high|lower secondary)/i.test(name))return {icon:'🎒',label:'Middle School',known:true};
 if(/(?:elementary school|primary school)/i.test(name))return {icon:'🏫',label:'Elementary School',known:true};
 if(/(?:university|college)/i.test(name))return {icon:'🎓',label:'College / University',known:true};
 return {icon:'🏫',label:'School level not specified',known:false};
}
export function countryFlagSrcV209(code){
 const c=String(code||'').toUpperCase();
 if(!/^[A-Z]{2}$/.test(c))return '';
 return c==='JP'?'/assets/flags/jp.svg':'https://flagcdn.com/w80/'+c.toLowerCase()+'.png';
}
export function countryBadgeV209(doc,host){
 const x=host?.code?host:hostCountryV208(host);
 const label=doc.createElement('div');label.className='gcs209-country';
 const frame=doc.createElement('span');frame.className='gcs209-flag-frame';
 if(x.code){
  const img=doc.createElement('img');img.src=countryFlagSrcV209(x.code);img.alt=x.name+' flag';
  img.width=46;img.height=31;img.loading='lazy';img.decoding='async';
  img.onerror=()=>frame.classList.add('gcs209-flag-error');frame.append(img);
 }
 const emoji=doc.createElement('span');emoji.className='gcs209-flag-fallback';
 emoji.setAttribute('aria-hidden','true');emoji.textContent=x.flag||'🌍';frame.append(emoji);
 const name=doc.createElement('strong');name.textContent=x.name||'Host country not specified';
 const sub=doc.createElement('small');sub.textContent='HOST COUNTRY';
 label.append(frame,name,sub);return label;
}
export function sessionTimeLabelsV209(start,end,zone){
 try{
  const from=timePartsV112(start,zone),to=timePartsV112(end,zone);
  const day=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',weekday:'short',month:'short',day:'numeric'}).format(new Date(start));
  const hours=from.date===to.date?from.time+'–'+to.time:from.time+' → '+to.date+' '+to.time;
  return {day,hours,zone};
 }catch{return {day:'Date unavailable',hours:'Check session details',zone:zone||''};}
}
export function appendVisualBasicsV209(doc,card,info){
 card.append(countryBadgeV209(doc,info.host));
 const badges=doc.createElement('div');badges.className='gcs209-badges';
 const school=doc.createElement('span');school.className='gcs209-school-level';
 const level=info.schoolLevel||{icon:'🏫',label:'School level not specified'};
 school.textContent=level.icon+' '+level.label;badges.append(school);card.append(badges);
 const t=sessionTimeLabelsV209(info.start,info.end,info.zone);
 const when=doc.createElement('div');when.className='gcs209-datetime';
 const day=doc.createElement('div');day.className='gcs209-date';day.textContent='📅 '+t.day;
 const hours=doc.createElement('div');hours.className='gcs209-hours';hours.textContent='🕒 '+t.hours;
 const loc=doc.createElement('small');loc.textContent='Your time · '+t.zone;
 when.append(day,hours,loc);card.append(when);
}
