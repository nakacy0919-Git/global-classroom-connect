// GCC V21.4 — calendar links and standards-based downloadable .ics files.
// No OAuth, no calendar writes, no external APIs, no invitation emails.
const pad2=n=>String(n).padStart(2,'0');
const pad4=n=>String(n).padStart(4,'0');
const utcDate=iso=>{
 const d=new Date(iso);
 if(!Number.isFinite(d.getTime()))throw Error('Invalid calendar session time');
 return d.getUTCFullYear()+pad2(d.getUTCMonth()+1)+pad2(d.getUTCDate())+'T'+
  pad2(d.getUTCHours())+pad2(d.getUTCMinutes())+pad2(d.getUTCSeconds())+'Z';
};
const plain=raw=>String(raw??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim();
const escaped=raw=>plain(raw).replace(/\\/g,'\\\\').replace(/\r\n|\n|\r/g,'\\n')
 .replace(/;/g,'\\;').replace(/,/g,'\\,');
const fold=line=>{
 let rows=[''],size=0;
 // Folding uses octets, not JS code units, to preserve non-Latin teacher names.
 for(const c of line){
  const count=new TextEncoder().encode(c).length;
  if(size+count>75){rows.push(' ');size=1;}
  rows[rows.length-1]+=c;size+=count;
 }
 return rows.join('\r\n');
};
export function sessionCalendarDataV214(record){
 const starts=record?.starts_at||record?.start,ends=record?.ends_at||record?.end;
 const startDate=new Date(starts),endDate=new Date(ends);
 if(!Number.isFinite(startDate.getTime())||!Number.isFinite(endDate.getTime())||
  endDate<=startDate)throw Error('This session needs a valid start and end time');
 const name=plain(record?.title||record?.session_details?.session_name||record?.topic||
  'Global Classroom Exchange').slice(0,140);
 const note=plain(record?.calendar_note||'Global Classroom Connect session. Confirm the final joining details with your partner teacher.');
 const source=plain(record?.id||record?.request_id||'global-classroom-session')
  .toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,80)||'session';
 return {title:name,start:startDate.toISOString(),end:endDate.toISOString(),
  description:note.slice(0,1000),zone:record?.viewer_zone||record?.timezone||'UTC',
  uid:'gcc-'+source+'@gcc.pic-speak-story.com',id:source};
}
export function googleCalendarUrlV214(record){
 const d=sessionCalendarDataV214(record);
 const q=new URLSearchParams({action:'TEMPLATE',text:d.title,
  dates:utcDate(d.start)+'/'+utcDate(d.end),details:d.description,ctz:d.zone});
 return 'https://calendar.google.com/calendar/render?'+q.toString();
}
export function outlookCalendarUrlV214(record,work=false){
 const d=sessionCalendarDataV214(record);
 const q=new URLSearchParams({path:'/calendar/action/compose',rru:'addevent',
  subject:d.title,startdt:d.start,enddt:d.end,body:d.description});
 return (work?'https://outlook.office.com':'https://outlook.live.com')+
  '/calendar/deeplink/compose?'+q.toString();
}
export function calendarIcsV214(record,generatedAt='2026-11-03T00:00:00Z'){
 const d=sessionCalendarDataV214(record);
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Global Classroom Connect//Calendar 21.4//EN',
  'CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
  'UID:'+d.uid,'DTSTAMP:'+utcDate(generatedAt),
  'DTSTART:'+utcDate(d.start),'DTEND:'+utcDate(d.end),
  'SUMMARY:'+escaped(d.title),'DESCRIPTION:'+escaped(d.description),
  'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'];
 return lines.map(fold).join('\r\n')+'\r\n';
}
export function downloadCalendarIcsV214(record){
 const d=sessionCalendarDataV214(record);
 const file=new Blob([calendarIcsV214(record,new Date().toISOString())],
  {type:'text/calendar;charset=utf-8'});
 const uri=URL.createObjectURL(file);
 const a=document.createElement('a');
 a.href=uri;a.download='gcc-session-'+d.id+'.ics';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(uri),5000);
}
export function calendarMenuV214(record){
 const wrap=document.createElement('details');wrap.className='gcs214-calendar-menu';
 const summary=document.createElement('summary');summary.textContent='📅 Add to Calendar';
 wrap.append(summary);
 const links=document.createElement('div');links.className='gcs214-calendar-options';
 const entries=[
  ['Google Calendar',googleCalendarUrlV214(record)],
  ['Outlook (Personal)',outlookCalendarUrlV214(record)],
  ['Outlook (Work / School)',outlookCalendarUrlV214(record,true)]
 ];
 for(const [label,href] of entries){
  const a=document.createElement('a');a.textContent=label;a.href=href;
  a.target='_blank';a.rel='noopener noreferrer';links.append(a);
 }
 const apple=document.createElement('button');apple.type='button';
 apple.textContent='Apple Calendar / .ics';
 apple.addEventListener('click',()=>downloadCalendarIcsV214(record));
 links.append(apple,document.createElement('small'));
 links.lastElementChild.textContent='Personal calendar only. Changes in GCC do not auto-update saved entries.';
 wrap.append(links);return wrap;
}
