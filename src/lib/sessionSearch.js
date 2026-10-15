// GCC_SESSION_SPLIT_V3: Search independently for single open exchange offers.
// No database calls or personally identifying fields in this module.
import {toUtc} from './matching.js';

function nextDate(date) {
  const d=new Date(date+'T12:00:00Z');
  if(Number.isNaN(d.getTime()))return null;
  d.setUTCDate(d.getUTCDate()+1);
  return d.toISOString().slice(0,10);
}

export function buildSearchWindow({date,startTime='09:00',endTime='12:00',timezone='Asia/Tokyo'}) {
  if(!date)return {from:null,to:null};
  const start=toUtc(date,startTime,timezone);
  if(start.error)return {error:start.error};
  const tomorrow=endTime<=startTime?nextDate(date):date;
  const end=toUtc(tomorrow,endTime,timezone);
  if(end.error)return {error:end.error};
  const minutes=(Date.parse(end.iso)-Date.parse(start.iso))/60000;
  if(minutes<30||minutes>1440)return {error:'Select a search window between 30 minutes and 24 hours.'};
  return {from:start.iso,to:end.iso};
}

export function filterSessionOffers(offers,{from=null,to=null,country='',level='',query='',now=Date.now()}={},teachers=[]) {
  const byTeacher=new Map(teachers.map(t=>[t.id,t]));
  const term=query.trim().toLocaleLowerCase();
  return (offers||[]).filter(o=>{
    const start=Date.parse(o.starts_at),end=Date.parse(o.ends_at);
    if(o.status!=='open'||!Number.isFinite(start)||!Number.isFinite(end)||end<=now||end<=start)return false;
    if(country && o.country_code!==country)return false;
    if(level && o.age_band!==level)return false;
    if(from && to && (Math.min(end,Date.parse(to))-Math.max(start,Date.parse(from)))<30*60000)return false;
    const teacher=byTeacher.get(o.teacher_id);
    const searchable=[o.country_code,o.topic,teacher?.display_name,teacher?.schools?.name,
      teacher?.schools?.country_name,teacher?.schools?.city].join(' ').toLocaleLowerCase();
    if(term && !searchable.includes(term))return false;
    return true;
  }).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
}
