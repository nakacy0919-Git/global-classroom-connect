// GCC V23.3 — pure filters and validation shared by Host session directory.
const time = value => Date.parse(value || '');
export function normalizeHostSessionsV233(events = [], offers = [], teachers = [], schools = [], requests = []) {
  const teacherMap = new Map(teachers.map(x => [x.id, x]));
  const schoolMap = new Map(schools.map(x => [x.id, x]));
  const requestMap = new Map();
  for (const r of requests) {
    const entry = requestMap.get(r.offer_id) || {count: 0, approved: 0, approvedStudents: 0};
    entry.count++;
    if (r.status === 'approved') { entry.approved++; entry.approvedStudents += Number(r.requested_students) || 0; }
    requestMap.set(r.offer_id, entry);
  }
  const host = events.map(e => ({
    id:e.id, source:'host', title:e.title || 'Untitled event', status:e.status,
    start:e.starts_at, end:e.ends_at, timezone:e.timezone || 'Asia/Tokyo',
    teacher:'GCC Host Admin', school:'Global Classroom', country:e.session_details?.host_country_name || '',
    original:e, requestStats:{count:0,approved:0,approvedStudents:0}
  }));
  const teacherOffers = offers.map(o => {
    const teacher = teacherMap.get(o.teacher_id), school = schoolMap.get(teacher?.school_id);
    return {
      id:o.id, source:'teacher', title:o.session_details?.session_name || o.topic || 'Untitled session',
      status:o.status, start:o.starts_at, end:o.ends_at, timezone:o.timezone,
      teacher:teacher?.display_name || 'Teacher not found', school:school?.name || 'School not found',
      country:school?.country_name || o.country_code || '', original:o,
      requestStats:requestMap.get(o.id) || {count:0,approved:0,approvedStudents:0}
    };
  });
  return [...host,...teacherOffers].sort((a,b)=>(time(b.start)||0)-(time(a.start)||0));
}
export function filterHostSessionsV233(records, {query='',source='all',status='all',period='all'}={}, now=Date.now()) {
  const needle=String(query).trim().toLocaleLowerCase();
  return (records || []).filter(x=>{
    if(source!=='all'&&x.source!==source)return false;
    if(status!=='all'&&x.status!==status)return false;
    if(period==='upcoming'&&!(time(x.end)>now))return false;
    if(period==='past'&&!(time(x.end)<=now))return false;
    return !needle || [x.title,x.teacher,x.school,x.country,x.original.topic].some(v=>String(v||'').toLocaleLowerCase().includes(needle));
  });
}
export function validateAdminOfferChangeV233(offer, draft, approvedStudents=0, now=Date.now()) {
  const errors=[],details=offer.session_details || {};
  const title=String(draft.title||'').trim();
  const topic=String(draft.topic||'').trim();
  const notes=String(draft.notes||'').trim();
  const students=Number(draft.students), rooms=Number(draft.rooms),capacity=Number(draft.capacity);
  const rawDeadline=draft.deadline||details.registration_closes_at||'';
  const start=time(draft.startsAt),end=time(draft.endsAt),deadline=time(rawDeadline);
  const previousStart=time(offer.starts_at),previousEnd=time(offer.ends_at);
  const changedTime=start!==previousStart||end!==previousEnd;
  if(title.length<3||title.length>120)errors.push('Session title must be 3–120 characters.');
  if(topic.length>120||notes.length>500)errors.push('Topic or notes are too long.');
  if(!Number.isInteger(students)||students<1||students>500)errors.push('Host students must be 1–500.');
  if(!Number.isInteger(rooms)||rooms<1||rooms>100)errors.push('Breakout rooms must be 1–100.');
  if(!Number.isInteger(capacity)||capacity<students+approvedStudents||capacity>2000)
    errors.push('Total capacity must include host students and already approved guest students (up to 2000).');
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start<30*60000||end-start>360*60000)
    errors.push('Choose a valid 30-minute to 6-hour time window.');
  if(changedTime&&(start<=now||previousEnd<=now))errors.push('Past sessions cannot be rescheduled.');
  if(draft.status==='open'&&end<=now&&offer.status!=='open')errors.push('Past sessions cannot be reopened.');
  if(!['open','closed'].includes(draft.status))errors.push('Invalid session status.');
  const publishing=draft.status==='open'&&(offer.status!=='open'||changedTime);
  if(rawDeadline&&(!Number.isFinite(deadline)||deadline>=start||(publishing&&deadline<=now)))
    errors.push('Registration deadline must be before the session and in the future when publishing.');
  if(publishing&&!rawDeadline)
    errors.push('A future registration deadline is required when publishing.');
  return {ok:errors.length===0,errors,title,topic,notes,students,rooms,capacity,changedTime};
}
