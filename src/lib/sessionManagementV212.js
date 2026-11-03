// GCC V21.2 Phase 1: session readiness indicators for both old and new offers.
// Missing legacy fields are shown to the host; no placeholder facts are invented.
const text=x=>typeof x==='string'?x.trim():'';
const validInt=n=>Number.isInteger(Number(n))&&Number(n)>0;
export function sessionReadinessV212(record){
 const d=record?.session_details||record||{};
 const missing=[];
 if(!text(d.session_name||record?.title))missing.push('Session title');
 if(!text(d.session_type))missing.push('Educational format');
 if(!text(d.platform))missing.push('Meeting platform');
 if(!Array.isArray(d.flow)||d.flow.length<2)missing.push('Agenda (at least two activities)');
 if(text(d.description).length<25)missing.push('Learning goals and preparation');
 if(!validInt(d.max_participants))missing.push('Maximum total participants');
 if(!text(d.registration_closes_at))missing.push('Registration deadline');
 if(!validInt(d.min_age)||!validInt(d.max_age))missing.push('Accepted ages');
 return {
  missing,completed:8-missing.length,total:8,
  ready:missing.length===0,
  label:missing.length?'Complete '+(8-missing.length)+'/8':'Ready to host'
 };
}
export function availableSeatsV212(offer){
 const given=Number(offer?.available_seats);
 return offer?.available_seats===null||offer?.available_seats===undefined||
  !Number.isFinite(given)?null:Math.max(0,Math.floor(given));
}
export function canRequestV212(offer){
 const left=availableSeatsV212(offer);
 return offer?.status==='open'&&!offer?.is_mine&&left!==null&&left>0;
}
export function requestStatusLabelV212(request){
 if(request?.status==='approved'&&request?.reconfirmation_required)return 'New schedule · confirmation needed';
 const names={approved:'Approved',declined:'Declined',pending:'Awaiting host decision'};
 return names[request?.status]||'Unknown status';
}
