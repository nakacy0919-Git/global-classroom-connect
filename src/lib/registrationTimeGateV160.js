import '../styles/registrationTimeGateV160.css';
const localZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const fmt=(date,z,options)=>new Intl.DateTimeFormat('en',{timeZone:z,...options}).format(date);
const clock=(d,z)=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:z,hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(d).filter(p=>['hour','minute'].includes(p.type)).map(p=>[p.type,+p.value]));return '<div class="gcc160-clock" aria-hidden="true"><i style="transform:rotate('+((parts.hour%12)*30+parts.minute/2)+'deg)"></i><span style="transform:rotate('+(parts.minute*6)+'deg)"></span><b>12</b><em>3</em><strong>6</strong><small>9</small></div>';};
export function timeConfirmationMarkupV160(){return '<section id="gcc160-gate" class="gcc160-gate" hidden><div class="gcc160-card"><div class="gcc160-kicker">🌐 GLOBAL CLASSROOM CONNECT</div><h2 tabindex="-1">Check Your Session Time</h2><p>Please check the date and time in your country before registration.</p><h3 id="gcc160-session"></h3><div class="gcc160-panels" id="gcc160-panels"></div><label class="gcc160-select">Your time zone <select id="gcc160-zone"></select></label><label class="gcc160-ack"><input id="gcc160-ack" type="checkbox"> I have checked the date and time, and I can join this session.</label><div class="gcc160-actions"><button type="button" id="gcc160-back">← Back</button><button type="button" id="gcc160-next" disabled>I Confirm — Continue ✓</button></div><p class="gcc160-note">Times are calculated for the session date, including daylight saving time where applicable.</p></div></section>';}
export function bindTimeConfirmationV160(root,{getSession,onConfirmed,onBack}){
 const gate=root.querySelector('#gcc160-gate'),select=root.querySelector('#gcc160-zone'),ack=root.querySelector('#gcc160-ack'),next=root.querySelector('#gcc160-next');
 const zones=[...new Set([localZone(),'Asia/Tokyo','UTC',...(Intl.supportedValuesOf?.('timeZone')||[])])];
 for(const z of zones){const option=document.createElement('option');option.value=z;option.textContent=z.replaceAll('_',' ');select.append(option);}select.value=localZone();
 const dateOptions={weekday:'short',year:'numeric',month:'short',day:'numeric'},timeOptions={hour:'2-digit',minute:'2-digit',hourCycle:'h23'};
 const render=()=>{const event=getSession();if(!event)return false;const start=new Date(event.starts_at),rawEnd=new Date(event.ends_at||event.end_at||'');if(!Number.isFinite(start.getTime()))return false;const end=Number.isFinite(rawEnd.getTime())&&rawEnd>start?rawEnd:new Date(start.getTime()+3600000);
 const host=event.timezone||event.time_zone||'Asia/Tokyo',guest=select.value;
 const panel=(title,z)=>'<article class="gcc160-panel"><h3>'+title+'</h3><div class="gcc160-zone">'+z.replaceAll('_',' ')+'</div><div class="gcc160-clockpair">'+clock(start,z)+clock(end,z)+'</div><div class="gcc160-range">'+fmt(start,z,timeOptions)+' – '+fmt(end,z,timeOptions)+'</div><div class="gcc160-date">'+fmt(start,z,dateOptions)+(fmt(start,z,dateOptions)!==fmt(end,z,dateOptions)?' → '+fmt(end,z,dateOptions):'')+'</div></article>';
 try{root.querySelector('#gcc160-session').textContent=event.title||'Session';root.querySelector('#gcc160-panels').innerHTML=panel('🌐 Host / Session Time',host)+panel('📍 Your Local Time',guest);return true;}catch{return false;}};
 select.addEventListener('change',()=>{ack.checked=false;next.disabled=true;render();});
 ack.addEventListener('change',()=>{next.disabled=!ack.checked;});
 next.addEventListener('click',()=>{if(!ack.checked||!render())return;gate.hidden=true;onConfirmed();});
 root.querySelector('#gcc160-back').addEventListener('click',()=>{gate.hidden=true;onBack();});
 return {show(){ack.checked=false;next.disabled=true;if(!render())return false;gate.hidden=false;gate.querySelector('h2')?.focus({preventScroll:true});window.scrollTo?.({top:0,behavior:'instant'});return true;}};
}
