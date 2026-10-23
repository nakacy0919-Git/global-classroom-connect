import '../../styles/sharePlanV102.css';
import {findMyRoom} from '../../services/sharePlanV102.js';

const $=id=>document.getElementById(id);
const make=(tag,cls='',value='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=String(value);return n;};
const zoomLink=(value)=>{
 try{const u=new URL(value);return u.protocol==='https:' && (u.hostname==='zoom.us'||u.hostname.endsWith('.zoom.us'))?u.href:null;}
 catch{return null;}
};

export function RoomPlanLookupPage(){return `
<section class="gcc-v102 gcc-v102-public" aria-label="Find my breakout room">
 <header class="gcc-v102-brand"><span aria-hidden="true">✦</span><div><strong>Global Classroom Connect</strong><small>International friendship starts here</small></div></header>
 <div class="gcc-v102-hero"><span class="gcc-v102-kicker">YOUR SESSION · YOUR ROOM</span><h1>Find your breakout room</h1><p>Enter your English name and school to see your room.</p></div>
 <form id="gcc-v102-lookup" class="gcc-v102-lookup" autocomplete="off">
   <label>Student name (English) <input id="gcc-v102-name" required maxlength="120" placeholder="e.g. Maria Cruz" autocomplete="off" /></label>
   <label>School name <input id="gcc-v102-school" required maxlength="160" placeholder="e.g. Cebu Science School" autocomplete="off" /></label>
   <button type="submit" class="gcc-v102-primary" id="gcc-v102-find">Find my room →</button>
 </form>
 <p id="gcc-v102-message" class="gcc-v102-message" role="status" aria-live="polite"></p>
 <div id="gcc-v102-result" class="gcc-v102-result" hidden></div>
 <p class="gcc-v102-privacy">This is a private seating-plan link. Please don't post it publicly.</p>
</section>`;}

export function bindRoomPlanLookupPage(){
 const root=document.querySelector('.gcc-v102-public');if(!root)return;
 const match=window.location.hash.match(/\?(.+)$/);
 const key=match?new URLSearchParams(match[1]).get('key'):null;
 const token=/^[0-9a-f]{64}$/.test(key||'')?key:null;
 const message=(s,err=false)=>{const n=$('gcc-v102-message');n.textContent=s;n.classList.toggle('error',err);};
 const submit=$('gcc-v102-find'),form=$('gcc-v102-lookup'),output=$('gcc-v102-result');
 if(!token){submit.disabled=true;message('This seating-plan link is missing or invalid. Ask your teacher for a new link.',true);return;}
 function show(data){
   output.hidden=false;output.replaceChildren();
   const room=make('div','gcc-v102-room-number',`Room ${String(data.room_number).padStart(2,'0')}`);
   output.append(make('span','gcc-v102-kicker','YOUR ROOM'),room);
   const url=zoomLink(data.zoom_url);
   if(url){const join=make('a','gcc-v102-primary gcc-v102-zoom','Join Zoom meeting ↗');join.href=url;join.target='_blank';join.rel='noopener noreferrer';output.append(join);}
   const students=make('section','gcc-v102-group');students.append(make('h2','','Students in your room'));
   for(const person of data.students||[]){const row=make('div','gcc-v102-person');const icon=make('span','gcc-v102-avatar gcc-v102-student','');icon.setAttribute('aria-hidden','true');const text=make('div');text.append(make('strong','',person.name),make('small','',`${person.country} · ${person.school}`));row.append(icon,text);students.append(row);}
   output.append(students);
   if((data.facilitators||[]).length){const teachers=make('section','gcc-v102-group');teachers.append(make('h2','','Your facilitators'));
     for(const person of data.facilitators){const row=make('div','gcc-v102-person');const icon=make('span','gcc-v102-avatar gcc-v102-teacher','');icon.setAttribute('aria-hidden','true');const text=make('div');text.append(make('strong','',person.name),make('small','',person.school));row.append(icon,text);teachers.append(row);}output.append(teachers);}
 }
 form.addEventListener('submit',async event=>{
   event.preventDefault();output.hidden=true;output.replaceChildren();submit.disabled=true;message('Checking your room…');
   try{const result=await findMyRoom(token,$('gcc-v102-name').value.trim(),$('gcc-v102-school').value.trim());
     if(!result){message('No matching room found. Check your English name and official school name, or ask your teacher.',true);return;}
     message('✓ Your room is ready!');show(result);
   }catch(_error){message('Could not load your room. Please try again or ask your teacher.',true);}
   finally{submit.disabled=false;}
 });
}
