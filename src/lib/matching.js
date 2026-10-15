// Date/time conversion and deterministic matching. No DOM/Supabase dependencies.
export function toUtc(date, time, zone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return {error:'Please enter a valid date and time.'};
  }
  let formatter;
  try { formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }); } catch { return {error:'Invalid time zone.'}; }
  const [y,m,d]=date.split('-').map(Number);
  const [h,minute]=time.split(':').map(Number);
  if(y<2020 || y>2100 || h>23 || minute>59 ||
     new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==date) {
    return {error:'Invalid date or time.'};
  }
  const target=Date.UTC(y,m-1,d,h,minute);
  const matching=[];
  // Offset search in 15-min increments supports quarter-hour timezones and DST.
  for(let off=-840;off<=840;off+=15) {
    const utc=target-off*60000;
    const p=Object.fromEntries(formatter.formatToParts(new Date(utc))
      .filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
    if(p.year===y&&p.month===m&&p.day===d&&p.hour===h&&p.minute===minute) matching.push(utc);
  }
  if(matching.length!==1) return {error:matching.length
    ?'This local time occurs twice due to daylight saving time. Choose another time.'
    :'This local time does not exist in the selected time zone.'};
  return {iso:new Date(matching[0]).toISOString()};
}

export function makeSlot({date,startTime,endTime,timezone}) {
  const start=toUtc(date,startTime,timezone);
  if(start.error) return start;
  let endDate=date;
  if(endTime<=startTime) {
    const next=new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate()+1);
    endDate=next.toISOString().slice(0,10);
  }
  const end=toUtc(endDate,endTime,timezone);
  if(end.error) return end;
  const minutes=(Date.parse(end.iso)-Date.parse(start.iso))/60000;
  if(minutes<30||minutes>360) return {error:'Availability must be 30 minutes to 6 hours.'};
  return {startsAt:start.iso,endsAt:end.iso,minutes};
}

export function findMatches(offers,{minOverlap=30,onlyInternational=true,now=Date.now()}={}) {
  const records=(offers||[]).filter(o=>o.status==='open' &&
    Number.isFinite(Date.parse(o.starts_at)) && Number.isFinite(Date.parse(o.ends_at)) &&
    Date.parse(o.ends_at)>now);
  const results=[];
  for(let i=0;i<records.length;i++) for(let j=i+1;j<records.length;j++) {
    const a=records[i],b=records[j];
    if(a.teacher_id===b.teacher_id) continue;
    if(onlyInternational && a.country_code===b.country_code) continue;
    const from=Math.max(Date.parse(a.starts_at),Date.parse(b.starts_at));
    const to=Math.min(Date.parse(a.ends_at),Date.parse(b.ends_at));
    const minutes=(to-from)/60000;
    if(minutes<minOverlap) continue;
    const sizeRatio=Math.min(a.student_count,b.student_count)/Math.max(a.student_count,b.student_count);
    const sameBand=a.age_band===b.age_band || [a.age_band,b.age_band].includes('Mixed');
    const sameTopic=Boolean(a.topic&&b.topic&&a.topic.trim().toLowerCase()===b.topic.trim().toLowerCase());
    const score=Math.min(100,Math.round(35+Math.min(25,minutes/4)+20*sizeRatio+
       (sameBand?12:0)+(sameTopic?8:0)));
    const ordered=[a.id,b.id].sort();
    results.push({key:ordered.join(':'),a,b,from:new Date(from).toISOString(),to:new Date(to).toISOString(),
      minutes,score,rooms:Math.min(a.room_count,b.room_count),studentCount:Math.min(a.student_count,b.student_count),
      gradeCompatible:sameBand,topicCompatible:sameTopic});
  }
  return results.sort((a,b)=>b.score-a.score||b.minutes-a.minutes||a.from.localeCompare(b.from));
}
