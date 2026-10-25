// GCC V11.2: IANA timezone calculations; uses dates at the actual session instant.
// Pure utilities — no browser services, no guessed DST offset.
export const knownCountryZonesV112 = Object.freeze({
  JP:['Japan','Asia/Tokyo','🇯🇵'],LK:['Sri Lanka','Asia/Colombo','🇱🇰'],
  PH:['Philippines','Asia/Manila','🇵🇭'],BD:['Bangladesh','Asia/Dhaka','🇧🇩'],
  IN:['India','Asia/Kolkata','🇮🇳'],NP:['Nepal','Asia/Kathmandu','🇳🇵'],
  SG:['Singapore','Asia/Singapore','🇸🇬'],MY:['Malaysia','Asia/Kuala_Lumpur','🇲🇾'],
  TH:['Thailand','Asia/Bangkok','🇹🇭'],VN:['Vietnam','Asia/Ho_Chi_Minh','🇻🇳'],
  KR:['South Korea','Asia/Seoul','🇰🇷'],CN:['China','Asia/Shanghai','🇨🇳'],
  PK:['Pakistan','Asia/Karachi','🇵🇰'],AF:['Afghanistan','Asia/Kabul','🇦🇫'],
  TW:['Taiwan','Asia/Taipei','🇹🇼']
});
const normalize=s=>String(s||'').trim().toLowerCase().replace(/[^a-z]/g,'');
const aliases={japan:'JP',jp:'JP',srilanka:'LK',lk:'LK',philippines:'PH',ph:'PH',bangladesh:'BD',bd:'BD',india:'IN',in:'IN',nepal:'NP',np:'NP',singapore:'SG',sg:'SG',malaysia:'MY',my:'MY',thailand:'TH',th:'TH',vietnam:'VN',vn:'VN',southkorea:'KR',republicofkorea:'KR',kr:'KR',china:'CN',cn:'CN',pakistan:'PK',pk:'PK',afghanistan:'AF',af:'AF',taiwan:'TW',tw:'TW'};
export const countryZoneV112=value=>knownCountryZonesV112[aliases[normalize(value)]]||null;
export function timePartsV112(iso, zone) {
  const d=new Date(iso);
  if(!Number.isFinite(d.getTime())) throw new Error('Invalid session date');
  const pieces=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const p=Object.fromEntries(pieces.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour),minute:Number(p.minute),time:`${p.hour}:${p.minute}`};
}
export function dateTimeLabelV112(iso,zone) {
  if(!iso)return 'Not set';
  try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}
  catch{return 'Time unavailable';}
}
export function timeRangeV112(start,end,zone){
  if(!start)return 'Start time not set';
  const a=timePartsV112(start,zone);
  const day=dateTimeLabelV112(start,zone);
  if(!end)return `${day} · End time not set`;
  const b=timePartsV112(end,zone);
  if(a.date!==b.date)return `${day} → ${dateTimeLabelV112(end,zone)}`;
  return `${day}–${b.time}`;
}
export const durationMinutesV112=(start,end)=>start&&end?(Date.parse(end)-Date.parse(start))/60000:null;
export function clockAnglesV112(start,zone){
  const p=timePartsV112(start,zone);
  return {hour:(p.hour%12+p.minute/60)*30,minute:p.minute*6};
}
export function sessionClockZonesV112(rooms,hostZone='Asia/Tokyo'){
  const found=new Map();
  const host=Object.entries(knownCountryZonesV112).find(([,x])=>x[1]===hostZone);
  if(host)found.set(host[1][1],{country:host[1][0],zone:host[1][1],flag:host[1][2],host:true});
  else found.set(hostZone,{country:'Host time',zone:hostZone,flag:'🌍',host:true});
  const unknown=new Set();
  for(const room of rooms||[])for(const student of room.students||[]){
    const c=student.country||'';if(!c)continue;
    const z=countryZoneV112(c);
    if(!z){unknown.add(c);continue;}
    if(!found.has(z[1])) found.set(z[1],{country:z[0],zone:z[1],flag:z[2],host:false});
  }
  return {clocks:[...found.values()],unmapped:[...unknown].sort()};
}
export function viewerZoneV112(){
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Tokyo';}catch{return 'Asia/Tokyo';}
}
