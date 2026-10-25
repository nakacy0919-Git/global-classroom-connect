import '../../styles/volunteerGalleryV122.css';
import {volunteerGalleryV122} from '../../services/volunteerGalleryV122.js';
import {signedTeacherPhotoV116} from '../../services/teacherNetworkV116.js';
import jpFlag from '../../assets/room-flags/jp.svg';
import phFlag from '../../assets/room-flags/ph.svg';
import lkFlag from '../../assets/room-flags/lk.svg';
import bdFlag from '../../assets/room-flags/bd.svg';

const flags={JP:jpFlag,PH:phFlag,LK:lkFlag,BD:bdFlag};
const el=(tag,cls='',content='')=>{const node=document.createElement(tag);if(cls)node.className=cls;node.textContent=content;return node;};
const validHttps=(value)=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname?u.href:null;}catch{return null;}};

export function volunteerGalleryMarkupV122(){return `<section class="gcc122-team" aria-labelledby="gcc122-heading">
 <div class="gcc122-team-head"><div><span class="gcc122-eyebrow">🌍 THE PEOPLE BEHIND THE CONNECTIONS</span>
 <h2 id="gcc122-heading">Meet Our Global Team</h2><p>Teachers welcoming classrooms across borders. Get to know the educators volunteering to make Global Classroom sessions happen.</p></div>
 <a class="gcc122-join-button" href="#gcc122-join-form">+ I'd love to help!</a></div>
 <div class="gcc122-toolbar"><label>Country <select id="gcc122-country"><option value="">All countries</option></select></label>
 <label>Role <select id="gcc122-role"><option value="">All volunteers</option><option value="facilitator">Facilitators</option><option value="host">GC session hosts</option></select></label>
 <label>Find a teacher <input id="gcc122-query" type="search" placeholder="Name, school or country" autocomplete="off"></label></div>
 <p id="gcc122-summary" class="gcc122-summary" aria-live="polite">Loading our team…</p>
 <div id="gcc122-cards" class="gcc122-cards" aria-live="polite"></div>
 </section>`;}

export function mountVolunteerGalleryV122(root,openTab){
 const cards=root.querySelector('#gcc122-cards');if(!cards)return async()=>{};
 const country=root.querySelector('#gcc122-country');
 const role=root.querySelector('#gcc122-role');
 const query=root.querySelector('#gcc122-query');
 const summary=root.querySelector('#gcc122-summary');
 let people=[];let generation=0;
 const empty=(headline,message,action=false)=>{
  const panel=el('div','gcc122-empty');
  const mark=el('div','gcc122-empty-icon','🌍');mark.setAttribute('aria-hidden','true');
  panel.append(mark,el('h3','',headline),el('p','',message));
  if(action){const button=el('button','gcc122-empty-action','I can help! →');button.type='button';button.addEventListener('click',()=>root.querySelector('#gcc122-join-form')?.scrollIntoView({behavior:'smooth',block:'start'}));panel.append(button);}
  cards.replaceChildren(panel);
 };
 async function render(){
  const id=++generation;
  const term=query.value.trim().toLocaleLowerCase();
  const visible=people.filter(p=>(!country.value||p.country_code===country.value)&&
   (!role.value||(role.value==='host'?p.gc_host:p.facilitator))&&
   (!term||[p.name,p.school,p.country,p.city,p.title].join(' ').toLocaleLowerCase().includes(term)));
  summary.textContent=`${visible.length} volunteer${visible.length===1?'':'s'} · ${new Set(visible.map(p=>p.country_code).filter(Boolean)).size} countr${new Set(visible.map(p=>p.country_code).filter(Boolean)).size===1?'y':'ies'}`;
  if(!people.length){empty('Your name could be here!','Our volunteer gallery is just beginning. Be among the first approved Global Classroom educators to join the team.',true);return;}
  if(!visible.length){empty('No matches yet','Try another country, role or name.');return;}
  const list=document.createDocumentFragment();
  for(const person of visible){
   const card=el('article','gcc122-person');
   const frame=el('div','gcc122-person-photo');
   const placeholder=el('span','gcc122-person-placeholder',(person.name||'G').slice(0,1).toLocaleUpperCase());
   frame.append(placeholder);
   const body=el('div','gcc122-person-body');
   const location=el('div','gcc122-person-location');const iso=(person.country_code||'').toUpperCase();
   if(flags[iso]){const img=el('img');img.src=flags[iso];img.alt='';img.width=24;img.height=17;location.append(img);}else location.append(el('span','gcc122-country-icon','🌐'));
   location.append(el('span','',person.country||iso||'Global Classroom'));
   const badges=el('div','gcc122-person-roles');
   if(person.facilitator)badges.append(el('span','gcc122-role-facilitator','Facilitator'));
   if(person.gc_host)badges.append(el('span','gcc122-role-host','GC Session Host'));
   const name=el('h3','gcc122-person-name',person.name||'Global Classroom Educator');
   const school=el('p','gcc122-person-school',[person.school,person.school_level].filter(Boolean).join(' · '));
   body.append(location,name,school,badges);
   if(person.bio)body.append(el('p','gcc122-person-bio',person.bio));
   const links=el('div','gcc122-links');
   for(const [key,label] of [['website','Website'],['instagram','Instagram'],['facebook','Facebook']]){
    const href=validHttps(person[key]);if(!href)continue;
    const a=el('a','',label+' ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);
   }
   if(links.childElementCount)body.append(links);
   card.append(frame,body);list.append(card);
   if(person.photo_path){signedTeacherPhotoV116(person.photo_path).then(url=>{
     if(!url||id!==generation)return;
     const img=el('img');img.src=url;img.alt=`${person.name||'Teacher'} profile photograph`;img.loading='lazy';img.decoding='async';
     img.addEventListener('error',()=>img.remove());frame.append(img);
    }).catch(()=>{});}
  }
  cards.replaceChildren(list);
 }
 async function refresh(){
  try{people=await volunteerGalleryV122();
   const selected=country.value;country.replaceChildren(new Option('All countries',''));
   const countries=new Map();for(const p of people)if(p.country_code)countries.set(p.country_code,p.country||p.country_code);
   for(const [code,name] of [...countries.entries()].sort((a,b)=>a[1].localeCompare(b[1])))country.append(new Option(name,code));
   country.value=countries.has(selected)?selected:'';
   await render();
  }catch(e){people=[];summary.textContent='Unable to load the volunteer gallery';empty('Unable to load our team','Please try again in a moment. Your volunteer registration form below is still available.');}
 }
 for(const field of [country,role,query])field.addEventListener(field===query?'input':'change',()=>{render().catch(()=>{});});
 refresh().catch(()=>{});
 return refresh;
}
