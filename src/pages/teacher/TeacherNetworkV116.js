import '../../styles/teacherNetworkV116.css';
import {myDetailsV117,saveSocialV117} from '../../services/teacherExtrasV117.js';
import {myTeacherProfileV116,teacherDirectoryV116,saveTeacherProfileV116,signedTeacherPhotoV116,uploadMyTeacherPhotoV116} from '../../services/teacherNetworkV116.js';
const node=(tag,cls='',value='')=>{const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;return e;};
export function teacherNetworkMarkupV116(){return `<div class="gcn116-network">
 <header class="gct-section-head"><span>🌍</span><div><h3>Your teacher profile &amp; global directory</h3><p>Complete your profile, then find teachers by country and school level.</p></div></header>
 <div class="gcn116-layout"><form id="gcn116-profile" class="gct-panel" novalidate>
   <h3>My teacher profile</h3><div id="gcn116-photo-preview" class="gcn116-photo-preview" aria-label="Profile photograph">Photo</div>
   <label>Upload a photo (JPEG, PNG, WebP; max 5MB)<input type="file" id="gcn116-photo" accept="image/jpeg,image/png,image/webp"></label>
   <p class="gcn116-help">Photos are resized to 512px and compressed to WebP before upload. They remain private unless you choose to appear in the teacher directory.</p>
   <label>Your name *<input id="gcn116-name" required maxlength="120" autocomplete="name"></label>
   <label>Job title<input id="gcn116-title" maxlength="120" placeholder="English teacher"></label>
   <label>Languages (comma-separated)<input id="gcn116-languages" placeholder="English, Japanese"></label>
   <label>Introduction<textarea id="gcn116-bio" maxlength="3000" rows="3" placeholder="About your teaching and your classroom"></textarea></label>
   <p class="gcn116-help">Your links help teachers stay in touch after the exchange. Use complete https:// links.</p>
   <label>My website<input type="url" id="gcc117-site" placeholder="https://my-school.example.org" maxlength="240"></label>
   <label>Instagram<input type="url" id="gcc117-ig" placeholder="https://www.instagram.com/youraccount/" maxlength="240"></label>
   <label>Facebook<input type="url" id="gcc117-fb" placeholder="https://www.facebook.com/yourpage" maxlength="240"></label>
   <label>Other social media<input type="url" id="gcc117-other" placeholder="https://..." maxlength="240"></label>
   <div id="gcn116-school" class="gcn116-school"></div>
   <label class="gcn116-check"><input id="gcn116-visible" type="checkbox"><span>Show my name, school, photo, introduction and social links to other approved GCC teachers.</span></label>
   <button type="submit" class="gct-primary" id="gcn116-save">Save profile</button><p id="gcn116-message" role="status" aria-live="polite"></p>
 </form><div class="gct-panel"><h3>Teachers around the world</h3>
   <p class="gcn116-help">Only teachers who have opted in are listed. Email addresses are never shown.</p>
   <div class="gcn116-filters"><label>Country<select id="gcn116-country"><option value="">All countries</option></select></label>
   <label>School level<select id="gcn116-level"><option value="">All levels</option></select></label>
   <label>Search<input id="gcn116-query" type="search" placeholder="Teacher, school, country"></label></div>
   <p id="gcn116-count" class="gcn116-help"></p><div id="gcn116-list" class="gcn116-list"></div>
 </div></div></div>`;}

export async function mountTeacherNetworkV116(root){
 const $=id=>root.querySelector('#'+id);if(!$('gcn116-profile'))return;
 const message=(text,error=false)=>{const e=$('gcn116-message');e.textContent=text;e.classList.toggle('error',error);};
 let profile;let people=[];
 const preview=async path=>{const area=$('gcn116-photo-preview');area.replaceChildren();if(!path){area.textContent='No photo';return;}
  try{const url=await signedTeacherPhotoV116(path);if(url){const img=node('img');img.src=url;img.alt='Your profile photo';area.append(img);}}
  catch{area.textContent='Photo unavailable';}};
 async function loadProfile(){profile=await myTeacherProfileV116();$('gcn116-name').value=profile.name||'';
  $('gcn116-title').value=profile.job_title||'';$('gcn116-bio').value=profile.bio||'';
  $('gcn116-languages').value=(profile.languages||[]).join(', ');$('gcn116-visible').checked=!!profile.directory_visible;
  const extra=await myDetailsV117();
  for(const [id,key] of [['gcc117-site','website_url'],['gcc117-ig','instagram_url'],['gcc117-fb','facebook_url'],['gcc117-other','other_social_url']])$(id).value=extra?.[key]||'';
  $('gcn116-school').textContent=`School: ${profile.school||'Not linked'} · ${profile.country_name||''} · ${profile.school_level||'Level not specified'} · ${profile.timezone||''}. Ask the host to correct your school details.`;
  await preview(profile.photo_path);}
 const render=async()=>{
  const country=$('gcn116-country').value,level=$('gcn116-level').value,q=$('gcn116-query').value.trim().toLocaleLowerCase();
  const filtered=people.filter(t=>(!country||t.country_code===country)&&(!level||t.school_level===level)&&
   (!q||[t.name,t.school,t.country_name,t.job_title].join(' ').toLocaleLowerCase().includes(q)));
  $('gcn116-count').textContent=`${filtered.length} teacher${filtered.length===1?'':'s'} listed`;
  const list=$('gcn116-list');list.replaceChildren();if(!filtered.length){list.append(node('p','gcn116-help','No teachers match these filters yet.'));return;}
  let last='';for(const person of filtered){if(person.country_name!==last){last=person.country_name;list.append(node('h4','gcn116-country-head',last));}
   const card=node('article','gcn116-card');const imgWrap=node('div','gcn116-card-photo');imgWrap.textContent=(person.name||'?').slice(0,1).toUpperCase();
   if(person.photo_path){try{const url=await signedTeacherPhotoV116(person.photo_path);if(url){imgWrap.replaceChildren();const img=node('img');img.src=url;img.alt='';img.loading='lazy';imgWrap.append(img);}}catch{}}
   const body=node('div');body.append(node('strong','',person.name),node('div','gcn116-school-label',`${person.school} · ${person.school_level||'Level not specified'}`));
   if(person.job_title)body.append(node('div','gcn116-help',person.job_title));if(person.bio)body.append(node('p','gcn116-help',person.bio));
   const links=node('div','gcc117-social-links');for(const [key,label] of [['website_url','Website'],['instagram_url','Instagram'],['facebook_url','Facebook'],['other_social_url','Social']]){
    const href=person[key];if(!href)continue;try{const u=new URL(href);if(u.protocol!=='https:')continue;
     const a=node('a','',label);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}catch{}}
   if(links.childElementCount)body.append(links);card.append(imgWrap,body);list.append(card);
  }
 };
 async function loadDirectory(){people=await teacherDirectoryV116();const countries=new Map(),levels=new Set();for(const p of people){if(p.country_code)countries.set(p.country_code,p.country_name);if(p.school_level)levels.add(p.school_level);}
  const cs=$('gcn116-country'),ls=$('gcn116-level');cs.replaceChildren(new Option('All countries',''));ls.replaceChildren(new Option('All levels',''));
  for(const [code,name] of [...countries.entries()].sort((a,b)=>a[1].localeCompare(b[1])))cs.add(new Option(name,code));
  for(const level of [...levels].sort())ls.add(new Option(level,level));await render();}
 $('gcn116-profile').addEventListener('submit',async event=>{event.preventDefault();const btn=$('gcn116-save');btn.disabled=true;
  try{const langs=$('gcn116-languages').value.split(',').map(x=>x.trim()).filter(Boolean);
   profile=await saveTeacherProfileV116({name:$('gcn116-name').value.trim(),jobTitle:$('gcn116-title').value.trim(),bio:$('gcn116-bio').value.trim(),languages:langs,visible:$('gcn116-visible').checked});
   await saveSocialV117({website:$('gcc117-site').value.trim(),instagram:$('gcc117-ig').value.trim(),facebook:$('gcc117-fb').value.trim(),other:$('gcc117-other').value.trim()});
   message('Profile and links saved.');await loadDirectory();}catch(e){message(e.message||'Could not save profile.',true);}finally{btn.disabled=false;}});
 $('gcn116-photo').addEventListener('change',async()=>{const file=$('gcn116-photo').files?.[0];if(!file||!profile)return;
  message('Compressing and uploading photo…');try{const result=await uploadMyTeacherPhotoV116(profile.id,file);profile.photo_path=result.path;await preview(result.path);message(`Photo saved (${Math.round(result.bytes/1024)} KB WebP).`);await loadDirectory();}
  catch(e){message(e.message||'Photo upload failed.',true);}finally{$('gcn116-photo').value='';}});
 for(const id of ['gcn116-country','gcn116-level','gcn116-query'])$(id).addEventListener(id==='gcn116-query'?'input':'change',()=>{render().catch(e=>message(e.message,true));});
 try{await loadProfile();await loadDirectory();return profile;}catch(e){message(e.message||'Could not load teacher network.',true);return null;}
}
