// GCC V22.6 — verify a newly published teacher session is actually discoverable.
// This is a read-only check of the teacher-scoped browse RPC, not a second publish.
export function verifyPublishedSessionV226(id, sessions, expected={}, now=Date.now()){
 const issues=[];
 if(typeof id!=='string'||!id.trim()){
  return {ok:false,issues:['The database did not return a session ID.'],session:null};
 }
 const session=(Array.isArray(sessions)?sessions:[]).find(item=>item?.id===id);
 if(!session){
  return {ok:false,issues:['The saved session was not returned by the session listing.'],session:null};
 }
 if(session.is_mine!==true)issues.push('This session is not marked as your hosted session.');
 if(session.status!=='open')issues.push('The session is not open to partner teachers.');
 const start=Date.parse(session.starts_at),end=Date.parse(session.ends_at);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=now||end<=start)
  issues.push('The session is not scheduled in the future.');
 if(expected.startsAt&&start!==Date.parse(expected.startsAt))
  issues.push('The saved start time differs from the published time.');
 if(expected.endsAt&&end!==Date.parse(expected.endsAt))
  issues.push('The saved end time differs from the published time.');
 const details=session.session_details||{};
 if(!String(details.session_name||'').trim())
  issues.push('The saved session name is missing.');
 if(expected.sessionName&&String(details.session_name||'').trim()!==String(expected.sessionName).trim())
  issues.push('The saved session name differs from the published name.');
 if(!String(details.session_type||'').trim())
  issues.push('The saved session format is missing.');
 if(expected.sessionType&&details.session_type!==expected.sessionType)
  issues.push('The saved session format differs from the published format.');
 const seats=Number(details.max_participants),hostStudents=Number(session.student_count);
 if(!Number.isInteger(seats)||seats<1||seats>2000||seats<hostStudents)
  issues.push('The maximum total participants setting is incomplete.');
 else if(expected.maxParticipants&&seats!==Number(expected.maxParticipants))
  issues.push('The saved capacity differs from the published capacity.');
 if(session.available_seats===null||session.available_seats===undefined)
  issues.push('Partner capacity could not be calculated.');
 else if(Number(session.available_seats)<=0)
  issues.push('There are no seats available for partner schools.');
 const deadline=Date.parse(details.registration_closes_at);
 if(!Number.isFinite(deadline)||deadline<=now)
  issues.push('The registration deadline is missing or has passed.');
 return {ok:issues.length===0,issues,session};
}
