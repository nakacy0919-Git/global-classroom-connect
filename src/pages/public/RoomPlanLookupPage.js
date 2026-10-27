import '../../styles/sharePlanV102.css';
import '../../styles/sharePlanV104.css';
import '../../styles/netiquetteGuideV145.css';
import {bindNetiquetteGuideV145,netiquetteGuideMarkupV145} from '../../lib/netiquetteGuideV145.js';
import {openSharedRoomChart} from '../../services/sharePlanV102.js';
import {setupRoomToolsV106} from '../../lib/roomToolsV106.js';
import {renderWorldSessionClocksV112} from '../../lib/sessionClockUIV112.js';
import {countryFlagAssetV131} from '../../lib/countryFlagAssetsV131.js';

const $=id=>document.getElementById(id);
const make=(tag,cls='',value='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=String(value);return n;};
const countryKey=name=>String(name??'').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
function countryFlag(country){
  const span=make('span','gcc-v104-flag');
  span.setAttribute('aria-hidden','true');
  const img=make('img','gcc-v104-flag-svg');
  img.src=countryFlagAssetV131(country);img.alt='';img.width=27;img.height=18;
  span.append(img);
  return span;
}
function avatar(role){
  const icon=make('span',`gcc-v104-avatar gcc-v104-avatar--${role}`);
  icon.setAttribute('aria-hidden','true');
  return icon;
}
function identityRow(person,role,country){
  const row=make('div',`gcc-v104-person gcc-v104-person--${role}`);
  const identity=make('div','gcc-v104-identity');
  const meta=make('small','gcc-v104-person-meta');
  meta.append(countryFlag(country),make('span','',country?[country,person.school||''].filter(Boolean).join(' · '):(person.school||'')));
  identity.append(make('strong','',person.name),meta);
  row.append(avatar(role),identity);
  return row;
}
const safeZoom=value=>{try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='zoom.us'||u.hostname.endsWith('.zoom.us'))?u.href:null;}catch{return null;}};

export function RoomPlanLookupPage(){return `
<section class="gcc-v104 gcc-v104-guest" aria-label="Global Classroom breakout rooms">
  ${netiquetteGuideMarkupV145()}
  <div id="gcc-v145-room-access">
  <header class="gcc-v104-brand"><span aria-hidden="true">✦</span><div><strong>Global Classroom Connect</strong><small>Meet the world, one room at a time</small></div></header>
  <div class="gcc-v104-hero"><span class="gcc-v104-eyebrow">SESSION ROOM CHART</span><h1>Find your breakout room</h1><p>Enter the 6-digit code from your teacher first. After verification, check five Zoom guidelines to open your breakout room chart.</p></div>
  <form class="gcc-v104-unlock" id="gcc-v104-unlock" autocomplete="off">
    <label for="gcc-v104-code">Session access code</label>
    <div class="gcc-v104-unlock-row"><input id="gcc-v104-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" placeholder="6-digit code" aria-label="6-digit session access code" autocomplete="off" required /><button type="submit" class="gcc-v104-primary" id="gcc-v104-open">Verify code →</button></div>
  </form>
  <p id="gcc-v104-message" role="status" aria-live="polite" class="gcc-v104-message"></p>
  <div id="gcc-v104-chart" hidden>
    <div class="gcc-v104-chart-head"><div><span class="gcc-v104-eyebrow">YOUR SESSION</span><h2 id="gcc-v104-session-name">Breakout rooms</h2><p id="gcc-v104-count"></p></div><div id="gcc-v104-zoom"></div></div>
    <section class="gcc-v112-world" id="gcc-v112-world" aria-label="Session start times around the world" hidden></section>
    <label class="gcc-v104-filter-label" for="gcc-v104-filter">Find a student or school</label>
    <input id="gcc-v104-filter" type="search" placeholder="Search names or school" autocomplete="off" />
    <p class="gcc-v104-filter-hint">All rooms are shown below. Search to highlight your room.</p>
    <div class="gcc-v104-grid" id="gcc-v104-room-list"></div>
  </div>
  <p class="gcc-v104-privacy">Private session information · Share the invitation only with participants.</p>
  </div>
</section>`;}

export function bindRoomPlanLookupPage(){
 const root=document.querySelector('.gcc-v104-guest');if(!root)return;
 const q=window.location.hash.split('?')[1]||'';
 const key=new URLSearchParams(q).get('key');
 const token=/^[a-f0-9]{64}$/.test(key||'')?key:null;
 const submit=$('gcc-v104-open'),form=$('gcc-v104-unlock'),result=$('gcc-v104-chart');
 const list=$('gcc-v104-room-list'),filter=$('gcc-v104-filter');
 const message=(s,err=false)=>{const n=$('gcc-v104-message');n.textContent=s;n.classList.toggle('error',err);};
 const netiquetteGuideV146=bindNetiquetteGuideV145(root,Boolean(token));
 if(!token){submit.disabled=true;message('Invalid invitation link. Ask the session host for the current link.',true);return;}
 function draw(data){
   result.hidden=false;
   $('gcc-v104-session-name').textContent=data.session||'Breakout rooms';
   const rooms=Array.isArray(data.rooms)?data.rooms:[];
   const total=rooms.reduce((count,room)=>count+(room.students||[]).length,0);
   $('gcc-v104-count').textContent=`${rooms.length} rooms · ${total} students`;
   renderWorldSessionClocksV112($('gcc-v112-world'),data);
   const zoom=$('gcc-v104-zoom');zoom.replaceChildren();const url=safeZoom(data.zoom_url);
   if(url){
     const a=make('a','gcc-v104-primary gcc-v104-zoom');
     a.href=url;a.target='_blank';a.rel='noopener noreferrer';
     const cam=make('span','gcc-v104-zoom-icon');cam.setAttribute('aria-hidden','true');
     a.append(cam,make('span','gcc-v104-zoom-label','Join Zoom ↗'));
     zoom.append(a);
   }
   list.replaceChildren();
   // A facilitator may belong to another room from their school's students.
   // Infer a country only when that school has one unambiguous country.
   const countriesBySchool=new Map();
   for(const r of rooms)for(const student of r.students||[]){
     const k=countryKey(student.school),country=student.country||'';
     if(!k||!country)continue;
     if(!countriesBySchool.has(k))countriesBySchool.set(k,country);
     else if(countriesBySchool.get(k)!==country)countriesBySchool.set(k,'');
   }
   for(const room of rooms){
     const card=make('section','gcc-v104-room');
     const h=make('div','gcc-v104-room-heading');h.append(make('h3','',`Room ${String(room.room_number).padStart(2,'0')}`),make('span','',`${(room.students||[]).length} students`));card.append(h);
     const students=make('div','gcc-v104-people');
     for(const person of room.students||[]){
       students.append(identityRow(person,'student',person.country||''));
     }
     card.append(students);
     if((room.facilitators||[]).length){const support=make('div','gcc-v104-support');support.append(make('span','gcc-v104-support-title','FACILITATORS'));
       for(const f of room.facilitators){
         const country=f.country||countriesBySchool.get(countryKey(f.school))||'';
         support.append(identityRow(f,'teacher',country));
       }
       card.append(support);}
     card.dataset.findText=[...(room.students||[]).map(x=>`${x.name} ${x.school} ${x.country}`),...(room.facilitators||[]).map(x=>`${x.name} ${x.school}`)].join(' ').toLocaleLowerCase();
     list.append(card);
   }
 }
 function applyFilter(){const v=filter.value.trim().toLocaleLowerCase();let found=0;
   for(const card of list.children){const matches=!v||card.dataset.findText.includes(v);
     card.classList.toggle('gcc-v104-nonmatch',!!v&&!matches);
     card.classList.toggle('gcc-v104-match',!!v&&matches);
     if(matches)found++;
   }
   $('gcc-v104-count').setAttribute('aria-label',v?`${found} matching rooms`: 'All breakout rooms');
 }
 const roomToolsV106=setupRoomToolsV106({root,token,
   getCode:()=>$('gcc-v104-code').value.trim(),
   onRefresh:async code=>{
     const fresh=await openSharedRoomChart(token,code);
     if(!fresh?.rooms){result.hidden=true;throw Error('The chart access has expired or was revoked.');}
     draw(fresh);applyFilter();return fresh;
   }
 });
 filter.addEventListener('input',applyFilter);
 form.addEventListener('submit',async event=>{
   event.preventDefault();roomToolsV106.reset();result.hidden=true;list.replaceChildren();submit.disabled=true;message('Verifying your session access code…');
   const code=$('gcc-v104-code').value.trim();
   if(!/^[0-9]{6}$/.test(code)){message('Please enter the 6-digit code.',true);submit.disabled=false;return;}
   try{const data=await openSharedRoomChart(token,code);
     if(!data||!Array.isArray(data.rooms)){message('Code not accepted or invitation expired. Check with your teacher.',true);return;}
     // Never render student names or room details until the verified visitor has
     // acknowledged the guidelines (or used their own browser's prior confirmation).
     filter.value='';
     message('✓ Code verified. Please review the Zoom guidelines.');
     netiquetteGuideV146.show(()=>{
       if(!root.isConnected)return;
       root.querySelector('.gcc-v104-hero').hidden=true;
       form.hidden=true;
       message('✓ Guide complete — your breakout room chart is ready.');
       draw(data);
       roomToolsV106.onDraw(data);
       const heading=$('gcc-v104-session-name');
       heading.setAttribute('tabindex','-1');
       heading.focus({preventScroll:true});
       heading.scrollIntoView({block:'start',behavior:'smooth'});
     });
   }catch(_){message('Could not open the room chart. Please try again or contact the host.',true);}
   finally{submit.disabled=false;}
 });
}
