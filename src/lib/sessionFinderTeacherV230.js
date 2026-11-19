// GCC V23.0 — opt-in teacher profiles for Find a Session.
// Teacher directory data is public to verified teachers only after explicit opt-in.
// Never fetch an unlisted teacher's private biography, photo, contact or social links.
const node=(tag,cls='',value='')=>{
 const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=String(value||'');return n;
};
const initials=name=>String(name||'?').trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase()||'?';
export function teacherIdentityCardV230(offer,profile,onOpen,getSignedPhoto){
 const group=node('div','gcs230-identity');
 const school=node('div','gcs230-school');
 school.append(node('span','gcs230-school-icon','⌂'),node('strong','gcs230-school-name',offer.school_name||'School name unavailable'));
 const teacher=node('div','gcs230-teacher');
 const avatar=node('span','gcs230-avatar',initials(offer.teacher_name));avatar.setAttribute('aria-hidden','true');
 if(profile?.photo_path&&getSignedPhoto){
  getSignedPhoto(profile.photo_path).then(url=>{
   if(!url||!avatar.isConnected)return;
   const image=document.createElement('img');image.src=url;image.alt='';image.loading='lazy';
   image.addEventListener('error',()=>{avatar.textContent=initials(offer.teacher_name);},{once:true});
   avatar.replaceChildren(image);
  }).catch(()=>{/* Keep teacher initials. */});
 }
 const person=node('div','gcs230-person');
 person.append(node('strong','gcs230-person-name',offer.teacher_name||'Host teacher'));
 const link=node('button','gcs230-profile-link','View teacher profile →');
 link.type='button';link.setAttribute('aria-label','View teacher profile for '+(offer.teacher_name||'host teacher'));
 link.addEventListener('click',()=>onOpen(offer,profile||null));
 person.append(link);teacher.append(avatar,person);group.append(school,teacher);
 if(offer.is_mine&&!profile){
  const hint=node('p','gcs230-own-photo-hint','Your public profile is not showing here. Check your sharing setting: ');
  const settings=node('a','gcs230-photo-settings','Edit my teacher profile →');
  settings.href='#/teacher-portal?view=profile';
  hint.append(settings);group.append(hint);
 }
 return group;
}
export function showTeacherProfileV230(root,offer,profile,getSignedPhoto){
 let dialog=root.querySelector('#gcs230-profile');
 if(!dialog){
  dialog=node('dialog','gcs230-profile-dialog');dialog.id='gcs230-profile';
  dialog.setAttribute('aria-label','Teacher profile');
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  root.append(dialog);
 }
 dialog.dataset.profileTeacher=String(offer.teacher_id||offer.teacher_name||'');
 dialog.replaceChildren();
 const top=node('div','gcs230-profile-head');
 const heading=node('h2','',profile?.name||offer.teacher_name||'Host teacher');
 const close=node('button','gcs230-profile-close','✕ Close');
 close.type='button';close.addEventListener('click',()=>dialog.close());
 top.append(heading,close);dialog.append(top);
 const school=node('p','gcs230-profile-school',profile?.school||offer.school_name||'School not specified');
 dialog.append(school);
 // Session details (name/school) are already visible to eligible teachers in Find a Session.
 // Everything further below must come exclusively from an opted-in directory record.
 if(!profile){
  dialog.append(node('p','gcs230-profile-private',
   'This teacher has not shared a public GCC profile. You can still view the session details and send a join request.'));
  dialog.showModal();return;
 }
 const row=node('div','gcs230-profile-overview');
 const avatar=node('div','gcs230-profile-avatar',initials(profile.name));
 row.append(avatar);
 const texts=node('div');
 if(profile.job_title)texts.append(node('strong','',profile.job_title));
 if(profile.country_name)texts.append(node('p','',profile.country_name));
 if(profile.school_level)texts.append(node('p','',profile.school_level));
 row.append(texts);dialog.append(row);
 if(profile.bio)dialog.append(node('p','gcs230-profile-bio',profile.bio));
 if(Array.isArray(profile.languages)&&profile.languages.length)
  dialog.append(node('p','gcs230-profile-lang','Languages: '+profile.languages.join(', ')));
 const links=node('div','gcs230-profile-links');
 for(const [key,label] of [
  ['website_url','Website'],['instagram_url','Instagram'],['facebook_url','Facebook'],['other_social_url','Other profile']
 ]){
  if(!profile[key])continue;
  try{
   const url=new URL(profile[key]);
   if(url.protocol!=='https:')continue;
   const a=node('a','',label+' ↗');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';
   links.append(a);
  }catch{/* Unusable URLs are not shown. */}
 }
 if(links.childElementCount)dialog.append(links);
 dialog.showModal();
 if(profile.photo_path&&getSignedPhoto){
  getSignedPhoto(profile.photo_path).then(url=>{
   if(!url||!dialog.open||dialog.dataset.profileTeacher!==String(offer.teacher_id||offer.teacher_name||''))return;
   const image=document.createElement('img');image.src=url;image.alt='';image.loading='lazy';
   image.addEventListener('error',()=>{avatar.textContent=initials(profile.name);},{once:true});
   avatar.replaceChildren(image);
  }).catch(()=>{/* Keep initials if photo cannot be loaded. */});
 }
}
