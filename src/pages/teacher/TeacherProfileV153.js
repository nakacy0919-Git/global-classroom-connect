import '../../styles/teacherProfileV153.css';
import {myTeacherProfileV116,saveTeacherProfileV116,signedTeacherPhotoV116,uploadMyTeacherPhotoV116} from '../../services/teacherNetworkV116.js';
import {myDetailsV117,saveSocialV117} from '../../services/teacherExtrasV117.js';
import {supabase} from '../../services/supabase.js';

const rpc=async(name,args={})=>{if(!supabase)throw Error('GCC is not connected.');const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;};
const el=(tag,cls='',txt='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=txt;return n;};
const schoolFields=[['name','School name'],['school_type','School type'],['school_level','School level'],['city','City'],['region','Region'],['website_url','School website (HTTPS)']];
export function teacherProfileMarkupV153(){
 return `<div class="gcc153-page">
  <header class="gcc153-hero"><div><span>YOUR GLOBAL CLASSROOM IDENTITY</span><h2>My Teacher Profile</h2><p>Keep your information up to date and show the world who you are.</p></div><a href="#/teacher-portal?view=network" class="gcc153-network-link">Explore Teacher Network →</a></header>
  <div class="gcc153-layout">
   <form id="gcc153-editor" class="gct-panel gcc153-editor" novalidate>
    <div class="gcc153-heading"><span class="gcc153-heading-icon">📸</span><div><h3>Your photo</h3><p>Show a friendly face to other GCC teachers.</p></div></div>
    <div class="gcc153-photo-row"><div class="gcc153-avatar" id="gcc153-avatar">Photo</div><div class="gcc153-photo-actions">
     <label for="gcc153-file" class="gcc153-upload">📷 Change photo</label>
     <input id="gcc153-file" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="gcc153-photo-help">
     <button type="button" id="gcc153-remove-photo" class="gct-secondary">Remove photo</button>
     <small id="gcc153-photo-help">JPEG, PNG or WebP · 5 MB maximum. Optimized privately to WebP before upload.</small>
    </div></div>
    <div class="gcc153-heading"><span class="gcc153-heading-icon">👩‍🏫</span><div><h3>About you</h3><p>Edit your teacher information whenever it changes.</p></div></div>
    <label>Full name *<input id="gcc153-name" type="text" minlength="2" maxlength="120" required autocomplete="name"></label>
    <label>Job title / subject<input id="gcc153-title" type="text" maxlength="120" placeholder="English teacher"></label>
    <label>Languages spoken<input id="gcc153-languages" maxlength="325" placeholder="English, Japanese"></label>
    <label>Self-introduction <span class="gcc153-optional">(up to 3,000 characters)</span><textarea id="gcc153-bio" rows="5" maxlength="3000" placeholder="Share your interests and how you teach."></textarea><small id="gcc153-bio-count">0 / 3,000</small></label>
    <div class="gcc153-heading"><span class="gcc153-heading-icon">🔗</span><div><h3>Links</h3><p>Optional HTTPS links to share with approved GCC teachers.</p></div></div>
    <div class="gcc153-link-grid">
     <label>Personal website<input id="gcc153-website" type="url" maxlength="240" placeholder="https://..."></label>
     <label>Instagram<input id="gcc153-instagram" type="url" maxlength="240" placeholder="https://instagram.com/..."></label>
     <label>Facebook<input id="gcc153-facebook" type="url" maxlength="240" placeholder="https://facebook.com/..."></label>
     <label>Other social media<input id="gcc153-other" type="url" maxlength="240" placeholder="https://..."></label>
    </div>
    <label class="gcc153-consent"><input id="gcc153-visible" type="checkbox"><span>Show my name, school, photo, introduction and links in the <strong>approved GCC teacher directory</strong>. You can switch this off at any time.</span></label>
    <div class="gcc153-savebar"><button type="submit" id="gcc153-save" class="gct-primary">Save my profile ✓</button></div>
    <p id="gcc153-message" role="status" aria-live="polite" class="gcc153-status"></p>
   </form>
   <div class="gcc153-school-column">
    <section class="gct-panel gcc153-school-panel">
     <div class="gcc153-heading"><span class="gcc153-heading-icon">🏫</span><div><h3>Your school</h3><p>School details are verified by the GCC host.</p></div></div>
     <p id="gcc153-location" class="gcc153-location"></p>
     <form id="gcc153-school-form" class="gcc153-school-form">
      ${schoolFields.map(([id,label])=>`<label>${label}<input id="gcc153-school-${id}" maxlength="${id==='name'?160:id==='website_url'?240:id==='school_type'||id==='school_level'?80:120}" ${id==='name'?'required minlength="2"':''} ${id==='website_url'?'type="url"':'type="text"'}></label>`).join('')}
      <p class="gcc153-school-note">School changes affect other teachers from your school. Your changes will be sent for host approval. The verified country and time zone must be corrected by the GCC host.</p>
      <button id="gcc153-school-request" type="submit" class="gct-secondary">Request school information update →</button>
      <p id="gcc153-school-status" class="gcc153-status" role="status" aria-live="polite"></p>
     </form>
    </section>
   </div>
  </div>
 </div>`;
}
export async function mountTeacherProfileV153(root,onNameSaved=()=>{}){
 const $=id=>root.querySelector('#'+id);
 if(!$('gcc153-editor'))return;
 const notify=(message,error=false)=>{const e=$('gcc153-message');e.textContent=message;e.classList.toggle('error',error);};
 const schoolNotify=(message,error=false)=>{const e=$('gcc153-school-status');e.textContent=message;e.classList.toggle('error',error);};
 let profile=null;
 const avatar=$('gcc153-avatar');
 const photoPreview=async(path)=>{
  avatar.replaceChildren();
  if(!path){avatar.textContent='Your photo';return;}
  try{const src=await signedTeacherPhotoV116(path);
   if(!src){avatar.textContent='No photo';return;}
   const image=el('img');image.src=src;image.alt='Your teacher profile photograph';
   image.addEventListener('error',()=>{avatar.textContent='Photo unavailable';},{once:true});
   avatar.append(image);
  }catch{avatar.textContent='Photo unavailable';}
 };
 const validateLink=value=>{
  if(!value)return true;
  try{const u=new URL(value);return u.protocol==='https:'&&Boolean(u.hostname)&&!u.username&&!u.password;}catch{return false;}
 };
 try{
  profile=await myTeacherProfileV116();
  const social=await myDetailsV117();
  $('gcc153-name').value=profile.name||'';
  $('gcc153-title').value=profile.job_title||'';
  $('gcc153-languages').value=(profile.languages||[]).join(', ');
  $('gcc153-bio').value=profile.bio||'';
  $('gcc153-visible').checked=Boolean(profile.directory_visible);
  for(const [id,key] of [['website','website_url'],['instagram','instagram_url'],['facebook','facebook_url'],['other','other_social_url']])
   $('gcc153-'+id).value=social?.[key]||'';
  $('gcc153-bio-count').textContent=Array.from($('gcc153-bio').value).length.toLocaleString('en-US')+' / 3,000';
  await photoPreview(profile.photo_path);
  $('gcc153-remove-photo').hidden=!profile.photo_path;
  const school=await rpc('gcc_v153_my_school_details');
  $('gcc153-location').textContent=[school.country_name,school.timezone].filter(Boolean).join(' · ');
  for(const [id] of schoolFields)$('gcc153-school-'+id).value=school?.[id]||'';
  const request=await rpc('gcc_v153_my_school_edit');
  if(request?.status==='pending')schoolNotify('A school correction request is awaiting host approval. You can submit an updated request.');
  else if(request?.status==='approved')schoolNotify('Your previous school correction was approved.');
  else if(request?.status==='rejected')schoolNotify('Your previous school correction was declined. Contact the GCC host if needed.');
 }catch(e){notify(e.message||'Could not load your profile.',true);return;}
 $('gcc153-bio').addEventListener('input',()=>{
  $('gcc153-bio-count').textContent=Array.from($('gcc153-bio').value).length.toLocaleString('en-US')+' / 3,000';
 });
 $('gcc153-editor').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('gcc153-save');
  const name=$('gcc153-name').value.trim(),languages=$('gcc153-languages').value.split(',').map(x=>x.trim()).filter(Boolean);
  if(name.length<2||name.length>120)return notify('Enter your full name (2–120 characters).',true);
  if(languages.length>8||languages.some(v=>v.length<1||v.length>40))return notify('Enter up to eight languages, each under 40 characters.',true);
  if(Array.from($('gcc153-bio').value).length>3000)return notify('Please shorten your introduction.',true);
  const links=Object.fromEntries(['website','instagram','facebook','other'].map(id=>[id,$('gcc153-'+id).value.trim()]));
  if(Object.values(links).some(v=>!validateLink(v)))return notify('Links must be valid HTTPS URLs (https://).',true);
  button.disabled=true;notify('Saving your profile…');
  try{
   profile=await saveTeacherProfileV116({name,jobTitle:$('gcc153-title').value.trim(),bio:$('gcc153-bio').value.trim(),languages,visible:$('gcc153-visible').checked});
   await saveSocialV117(links);
   onNameSaved(profile);
   notify('✓ Your teacher profile and links have been saved.');
  }catch(e){notify(e.message||'Profile could not be saved.',true);}
  finally{button.disabled=false;}
 });
 $('gcc153-file').addEventListener('change',async()=>{
  const input=$('gcc153-file'),file=input.files?.[0];if(!file)return;
  const old=profile.photo_path;
  input.disabled=true;$('gcc153-remove-photo').disabled=true;notify('Optimizing and uploading your new photo…');
  try{
   const result=await uploadMyTeacherPhotoV116(profile.id,file);
   profile.photo_path=result.path;await photoPreview(result.path);
   $('gcc153-remove-photo').hidden=false;
   notify('✓ Your new photo is saved ('+Math.round(result.bytes/1024)+' KB).');
   // Only remove an earlier image after a successful save.
   if(old&&old!==result.path){
    try{await supabase.storage.from('teacher-photos').remove([old]);}catch{/* New photo is valid regardless. */}
   }
  }catch(e){notify(e.message||'Photo upload failed.',true);}
  finally{input.value='';input.disabled=false;$('gcc153-remove-photo').disabled=false;}
 });
 $('gcc153-remove-photo').addEventListener('click',async()=>{
  if(!profile.photo_path||!confirm('Remove your profile photo?'))return;
  const button=$('gcc153-remove-photo');button.disabled=true;notify('Removing photo…');
  try{
   const path=await rpc('gcc_v153_clear_my_photo');profile.photo_path=null;
   await photoPreview(null);button.hidden=true;
   if(path){try{await supabase.storage.from('teacher-photos').remove([path]);}catch{/* Photo is already hidden from the profile. */}}
   notify('✓ Profile photo removed.');
  }catch(e){notify(e.message||'Could not remove photo.',true);}
  finally{button.disabled=false;}
 });
 $('gcc153-school-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('gcc153-school-request');
  const requested=Object.fromEntries(schoolFields.map(([id])=>[id,$('gcc153-school-'+id).value.trim()]));
  if(requested.name.length<2||requested.name.length>160)return schoolNotify('Enter a valid school name.',true);
  if(!validateLink(requested.website_url))return schoolNotify('Use an HTTPS school website URL.',true);
  button.disabled=true;schoolNotify('Sending your correction request…');
  try{await rpc('gcc_v153_request_school_edit',{p_changes:requested});
   schoolNotify('✓ Request sent. A GCC host will verify the changes before they go live.');
  }catch(e){schoolNotify(e.message||'Unable to send your school request.',true);}
  finally{button.disabled=false;}
 });
 return profile;
}
