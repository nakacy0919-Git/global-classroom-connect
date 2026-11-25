// GCC V23: consistent discovery eligibility for teacher offers and host events.
// Missing legacy deadlines are permitted; malformed explicit deadlines are not.
const validRange=(session,now)=>{
 const start=Date.parse(session?.starts_at),end=Date.parse(session?.ends_at);
 return Number.isFinite(start)&&Number.isFinite(end)&&end>now&&end>start;
};
const registrationOpen=(session,now)=>{
 const raw=session?.session_details?.registration_closes_at;
 if(raw===undefined||raw===null||raw==='')return true;
 const deadline=Date.parse(raw);
 return Number.isFinite(deadline)&&deadline>now;
};
export function isDiscoverableOfferV230(offer,now=Date.now()){
 return !!offer&&offer.status==='open'&&validRange(offer,now)&&registrationOpen(offer,now);
}
export function isDiscoverableEventV230(event,now=Date.now()){
 return !!event&&event.status==='published'&&validRange(event,now)&&registrationOpen(event,now);
}
