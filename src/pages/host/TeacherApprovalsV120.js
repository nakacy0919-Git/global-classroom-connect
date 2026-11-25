import '../../styles/teacherJoinV120.css';
import '../../styles/teacherApprovalStatusV134.css';
import {pendingApprovalsV120,signupOverviewV134,reviewApplicationV120,previewApplicationPhotoV120} from '../../services/teacherOnboardingV120.js';
import {supabase} from '../../services/supabase.js';
import {newestApplicationsV250,rejectionDraftV250,rejectionReasonsV250,validSchoolWebsiteV250} from '../../lib/teacherReviewV250.js';
import '../../styles/teacherReviewV250.css';
const el=(tag,cls='',str='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=str;return n;};
export function TeacherApprovalsV120(){return `<main class="gcc120-page gcc120-admin-page"><section class="gcc120-join gcc120-admin">
 <a class="gcc120-back" href="#/dashboard">← Host dashboard</a><div class="gcc120-title"><span>GLOBAL CLASSROOM · ADMIN</span><h1>Teacher applications</h1><p>Review new applications first. Verify a recognizable face photograph and official school website before approval. Teacher access is the default; Host Admin is reserved for trusted administrators.</p></div>
 <section class="gcc250-queue" aria-label="Applications awaiting approval">
  <div class="gcc134-tracker-head"><div><h2 class="gcc134-queue-title">Applications awaiting approval <span id="gcc250-pending-count" aria-live="polite"></span></h2><p>Newest submissions first. Review the face photograph and official school information.</p></div><button id="gcc134-refresh" type="button" class="gcc120-secondary">↻ Refresh now</button></div>
  <p id="gcc134-refresh-time" class="gcc134-time" role="status" aria-live="polite">Checking applications…</p>
  <p id="gcc120-review-msg" role="status" aria-live="polite" class="gcc120-message"></p>
  <section id="gcc250-prepared-mail" class="gcc120-panel" hidden aria-label="Prepared rejection email"></section>
  <div id="gcc120-review-list" class="gcc120-review-list">Loading…</div>
 </section>
 <details class="gcc134-tracker gcc250-collapsible"><summary>All teacher registration statuses</summary>
  <div class="gcc134-tracker-head">
   <div><h2>Teacher registration status</h2><p>New sign-ups appear here before email confirmation or profile submission.</p></div>

  </div>

  <div id="gcc134-counts" class="gcc134-counts"></div>
  <div id="gcc134-accounts" class="gcc134-accounts">Loading registration status…</div>
 </details>
 <details class="gcc153-host-school-queue gcc120-panel gcc250-collapsible"><summary>School information correction requests</summary>
  <div class="gcc134-tracker-head"><div><h2>School information corrections</h2><p>Review changes requested by approved teachers. Approved changes may affect everyone linked to the same school.</p></div>
  <button type="button" id="gcc153-refresh-school" class="gcc120-secondary">↻ Refresh corrections</button></div>
  <p id="gcc153-host-school-msg" class="gcc120-message" role="status" aria-live="polite"></p>
  <div id="gcc153-host-school-list" class="gcc120-review-list">Loading requests…</div>
 </details>
 </section></main>`;}
export function bindTeacherApprovalsV120({pending=pendingApprovalsV120,overview=signupOverviewV134,review=reviewApplicationV120,previewPhoto=previewApplicationPhotoV120,client=supabase}={}){
 const root=document.querySelector('.gcc120-admin');if(!root)return;
 const message=root.querySelector('#gcc120-review-msg'),list=root.querySelector('#gcc120-review-list');
 const accountsBox=root.querySelector('#gcc134-accounts'),countBox=root.querySelector('#gcc134-counts');
 const lastCheck=root.querySelector('#gcc134-refresh-time'),refreshButton=root.querySelector('#gcc134-refresh');
 const schoolList=root.querySelector('#gcc153-host-school-list');
 const schoolStatus=root.querySelector('#gcc153-host-school-msg');
 const schoolRefresh=root.querySelector('#gcc153-refresh-school');
 let schoolBusy=false;
 let loading=false,reviewBusy=false,lastAccountKey=null,lastQueueKey=null;
 const pendingCount=root.querySelector('#gcc250-pending-count'),prepared=root.querySelector('#gcc250-prepared-mail');
 const showMail=(draft)=>{prepared.hidden=false;prepared.replaceChildren(el('h3','','Rejection email ready — not sent'),el('p','','To: '+draft.to),el('p','','Subject: '+draft.subject));const area=el('textarea');area.readOnly=true;area.rows=10;area.value=draft.body;area.setAttribute('aria-label','Rejection email body');prepared.append(area);const actions=el('div','gcc120-review-actions');const copy=el('button','gcc120-secondary','Copy email text');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText('Subject: '+draft.subject+'\n\n'+draft.body);notify('Email text copied.');}catch{area.focus();area.select();notify('Select and copy the email text.');}};const mail=el('a','gcc120-primary gcc120-inline','Open email draft');mail.href=draft.mailto;const close=el('button','gcc120-secondary','Dismiss');close.type='button';close.onclick=()=>{prepared.hidden=true;prepared.replaceChildren();};actions.append(copy,mail,close);prepared.append(actions);};
 const stages={
  email_unconfirmed:['Email confirmation needed','Ask the teacher to confirm their email.'],
  profile_incomplete:['Profile not submitted','The teacher needs to sign in and submit their school profile.'],
  pending:['Awaiting review','Ready for administrator review.'],
  approved:['Approved','Teacher access is approved.'],
  rejected:['Rejected','The application was not approved.']
 };
 function renderAccounts(data){
  const accounts=Array.isArray(data)?data:[];
  const counts=Object.fromEntries(Object.keys(stages).map(key=>[key,accounts.filter(a=>a.status===key).length]));
  countBox.replaceChildren();
  for(const code of ['email_unconfirmed','profile_incomplete','pending','approved']){
   const card=el('div','gcc134-stat');
   card.append(el('strong','',String(counts[code])),el('span','',stages[code][0]));
   countBox.append(card);
  }
  accountsBox.replaceChildren();
  if(!accounts.length){accountsBox.append(el('p','gcc134-no-accounts','No registered accounts have been found.'));return;}
  accountsBox.append(el('p','gcc134-account-caption',`Latest ${accounts.length} registered account${accounts.length===1?'':'s'} (up to 200)`));
  for(const account of accounts){
   const row=el('article','gcc134-account-row');
   const main=el('div','gcc134-account-main');
   main.append(el('strong','gcc134-account-name',account.name||account.email||'Registered teacher'));
   if(account.name&&account.email)main.append(el('span','gcc134-account-email',account.email));
   if(account.school)main.append(el('span','gcc134-account-school',account.school));
   const detail=el('div','gcc134-account-detail'),code=stages[account.status]?account.status:'profile_incomplete';
   detail.append(el('span','gcc134-status gcc134-status-'+code,stages[code][0]));
   detail.append(el('span','gcc134-created',account.created_at?new Date(account.created_at).toLocaleString():''));
   row.append(main,detail);accountsBox.append(row);
  }
 }
 const notify=(s,error=false)=>{message.textContent=s;message.classList.toggle('error',error);};
 async function refresh(){
  if(loading||reviewBusy||!root.isConnected)return;
  loading=true;refreshButton.disabled=true;
  try{
   const [rawApplications,accounts]=await Promise.all([pending(),overview().catch(()=>null)]);
   const applications=newestApplicationsV250(rawApplications);pendingCount.textContent='('+applications.length+')';
   if(!root.isConnected)return;
   lastCheck.textContent='Last checked: '+new Date().toLocaleTimeString()+' · Refreshes every 15 seconds';
   const aKey=JSON.stringify(accounts);
   if(accounts!==null&&aKey!==lastAccountKey){renderAccounts(accounts);lastAccountKey=aKey;}
   const qKey=JSON.stringify(applications);
   if(qKey===lastQueueKey)return;
   list.replaceChildren();
   if(!applications.length){list.append(el('p','gcc120-panel','No pending applications.'));lastQueueKey=qKey;return;}
  const {data:schools,error:schoolErr}=await client.from('schools').select('id,name,country_name').eq('is_active',true).order('name');
  if(schoolErr)throw schoolErr;
  lastQueueKey=qKey;
  for(const a of applications){const card=el('article','gcc120-panel gcc120-review-card');
    const header=el('div','gcc120-review-head');const image=el('div','gcc120-review-photo','Photo not available');
    let photoReady=false;let faceBox;let photoStatus=el('p','gcc250-photo-status','Photo not available');
    if(a.photo_path){try{const src=await previewPhoto(a.photo_path);if(src){const pic=el('img');pic.alt='Applicant face photograph (verify manually)';pic.addEventListener('load',()=>{photoReady=true;photoStatus.textContent='Photo loaded · verify manually';if(faceBox)faceBox.disabled=false;});pic.addEventListener('error',()=>{photoReady=false;photoStatus.textContent='Photo could not be loaded. Refresh before reviewing.';if(faceBox){faceBox.checked=false;faceBox.disabled=true;}});pic.src=src;image.replaceChildren(pic);}}catch{photoStatus.textContent='Photo could not be loaded. Refresh before reviewing.';}}
    const detail=el('div');detail.append(el('h2','',a.name||''),el('p','',a.email||''));const facts=[
     ['Teacher website',a.website],['Introduction',a.bio],['School',a.school],['School type / level',`${a.school_type} · ${a.school_level}`],
     ['Location',[a.city,a.region,a.country].filter(Boolean).join(', ')],['School website',a.school_website],['Time zone',a.timezone]
    ];for(const [title,value] of facts){const p=el('p');p.append(el('strong','',title+': '));
      if(['Teacher website','School website'].includes(title)&&value){try{const u=new URL(value);if(u.protocol==='https:'){const link=el('a','',u.hostname);link.href=u.href;link.rel='noopener noreferrer';link.target='_blank';p.append(link);}else p.append(document.createTextNode(value));}catch{p.append(document.createTextNode(value));}}
      else p.append(document.createTextNode(value||'—'));detail.append(p);}
    detail.append(el('p','gcc250-submitted','Submitted: '+(a.submitted_at?new Date(a.submitted_at).toLocaleString():'Unknown')),photoStatus);header.append(image,detail);card.append(header);
    const existing=el('label','','Use existing school (optional; otherwise create new school)');const select=el('select');select.append(new Option('Create a new school',''));
    for(const s of schools){const opt=new Option(`${s.name} · ${s.country_name}`,s.id);select.append(opt);}existing.append(select);card.append(existing);
    const roles=el('fieldset','gcc120-role');roles.append(el('legend','','Grant access after approval'));
    const teacher=el('label');const basic=el('input');basic.type='radio';basic.name=`role-${a.id}`;basic.value='teacher';basic.checked=true;teacher.append(basic,document.createTextNode(' Teacher only'));
    const admin=el('label');const elevated=el('input');elevated.type='radio';elevated.name=`role-${a.id}`;elevated.value='host';admin.append(elevated,document.createTextNode(' Teacher + Host Admin (can approve others and manage GCC)'));
    roles.append(teacher,admin);card.append(roles);
    const checks=el('div','gcc120-review-checks');const checkedFace=el('label');faceBox=el('input');faceBox.type='checkbox';faceBox.disabled=!photoReady;checkedFace.append(faceBox,document.createTextNode(' I checked that the photograph shows a recognizable face'));
    const checkedSchool=el('label');const schoolBox=el('input');schoolBox.type='checkbox';checkedSchool.append(schoolBox,document.createTextNode(' I verified the official school website and school affiliation'));schoolBox.disabled=!validSchoolWebsiteV250(a.school_website);checks.append(checkedFace,checkedSchool);card.append(checks);
    if(schoolBox.disabled)card.append(el('p','gcc250-warning','Official school website is missing or invalid. This application cannot be approved.'));
    const rejection=el('details','gcc250-rejection');rejection.append(el('summary','','Rejection reasons and email preview'));const reasonBoxes=new Map();for(const [key,title] of rejectionReasonsV250){const l=el('label','gcc250-reason');const cb=el('input');cb.type='checkbox';cb.checked=key==='school'&&!validSchoolWebsiteV250(a.school_website)||key==='photo'&&!a.photo_path;reasonBoxes.set(key,cb);l.append(cb,document.createTextNode(title));rejection.append(l);}const note=el('textarea');note.rows=2;note.maxLength=500;note.placeholder='Optional specific explanation (English)';note.setAttribute('aria-label','Additional rejection explanation');const preview=el('textarea');preview.rows=9;preview.readOnly=true;preview.setAttribute('aria-label','Rejection email preview');const selected=()=>[...reasonBoxes].filter(([,v])=>v.checked).map(([k])=>k);const draft=()=>rejectionDraftV250(a,selected(),note.value);const renderPreview=()=>{try{const d=draft();preview.value='Subject: '+d.subject+'\n\n'+d.body;}catch{preview.value='Select at least one rejection reason.';}};for(const cb of reasonBoxes.values())cb.addEventListener('change',renderPreview);note.addEventListener('input',renderPreview);rejection.append(note,preview);card.append(rejection);renderPreview();
    const actions=el('div','gcc120-review-actions');for(const [decision,label] of [['approved','Approve application'],['rejected','Reject application']]){
     const btn=el('button',decision==='approved'?'gcc120-primary':'gcc120-secondary',label);btn.type='button';btn.addEventListener('click',async()=>{
      if(reviewBusy)return;const grantHost=decision==='approved'&&elevated.checked,school=select.value||null;
      let rejectMail=null;if(decision==='rejected'){rejection.open=true;if(!prepared.hidden&&!confirm('An earlier rejection email draft is still on this page. Replace it with a new draft?'))return;try{rejectMail=draft();}catch(e){notify(e.message,true);return;}}
      if(decision==='approved'&&(!photoReady||!validSchoolWebsiteV250(a.school_website)||!faceBox.checked||!schoolBox.checked)){notify('Verify the face photo and school information before approval.',true);return;}
      const warning=decision==='approved'?`Approve ${a.name} as ${grantHost?'HOST ADMIN + Teacher':'Teacher'}? ${grantHost?'This grants full GCC administrative powers.':''}`:`Reject ${a.name}?`;
      if(!confirm(warning))return;
      if(grantHost&&!confirm(`HIGH PRIVILEGE: Confirm granting Host Admin to ${a.email}. This user can approve future teachers.`))return;
      btn.disabled=true;reviewBusy=true;try{await review(a.id,decision,grantHost,school);if(rejectMail)showMail(rejectMail);notify(decision==='approved'?a.name+': approved. Approval confirmation email queued.':a.name+': rejected. Review and send the prepared email manually.');}
      catch(e){notify(e.message||'Review failed.',true);btn.disabled=false;return;}
      finally{reviewBusy=false;}await refresh();
     });actions.append(btn);}card.append(actions);list.append(card);
  }
  }catch(e){
   lastCheck.textContent='Unable to refresh registration status.';
   if(lastQueueKey===null)list.replaceChildren(el('p','gcc120-panel','Could not load applications. Reload this page or contact your GCC administrator.'));
   if(lastAccountKey===null)accountsBox.replaceChildren(el('p','gcc134-no-accounts','Could not load registered accounts.'));
   notify(e.message||'Could not load applications.',true);
  }finally{loading=false;refreshButton.disabled=false;}
 }
 async function refreshSchoolEdits(){
  if(schoolBusy||!root.isConnected)return;
  schoolBusy=true;schoolRefresh.disabled=true;
  try{
   const {data,error}=await client.rpc('gcc_v153_host_school_edits');if(error)throw error;
   schoolList.replaceChildren();
   if(!data?.length){schoolList.append(el('p','gcn116-help','No school correction requests are waiting.'));return;}
   for(const request of data){
    const card=el('article','gcc120-panel gcc153-school-review');
    card.append(el('h3','',request.school_name||'School'));
    card.append(el('p','',`Requested by ${request.teacher_name||'approved teacher'}`));
    for(const [key,label] of [['name','School name'],['school_type','School type'],['school_level','School level'],
       ['city','City'],['region','Region'],['website_url','Website']]){
      const oldValue=String(request.current?.[key]||'');
      const newValue=String(request.requested?.[key]||'');
      if(oldValue===newValue)continue;
      const row=el('p','gcc153-school-diff');
      row.append(el('strong','',label+': '),document.createTextNode((oldValue||'—')+' → '+(newValue||'—')));
      card.append(row);
    }
    const actions=el('div','gcc120-review-actions');
    for(const [approve,label] of [[true,'Approve school changes'],[false,'Decline changes']]){
     const button=el('button',approve?'gcc120-primary':'gcc120-secondary',label);
     button.type='button';
     button.addEventListener('click',async()=>{
      if(!confirm(approve?
       'Approve changes to '+request.school_name+'? All teachers linked to this school will see the new details.':
       'Decline this school correction request?'))return;
      button.disabled=true;
      try{
       const {error}=await client.rpc('gcc_v153_review_school_edit',{p_id:request.id,p_accept:approve});
       if(error)throw error;
       schoolStatus.textContent=approve?'School correction approved.':'School correction declined.';
       await refreshSchoolEdits();
      }catch(err){schoolStatus.textContent=err.message||'Could not review the correction.';button.disabled=false;}
     });
     actions.append(button);
    }
    card.append(actions);schoolList.append(card);
   }
  }catch(err){schoolStatus.textContent=err.message||'Could not load school correction requests.';}
  finally{schoolBusy=false;schoolRefresh.disabled=false;}
 }
 schoolRefresh.addEventListener('click',refreshSchoolEdits);
 refreshButton.addEventListener('click',()=>{if(loading||reviewBusy)return;lastQueueKey=null;refresh();refreshSchoolEdits();});
 const onActive=()=>{if(root.isConnected&&document.visibilityState==='visible'){refresh();refreshSchoolEdits();}};
 window.addEventListener('focus',onActive);
 document.addEventListener('visibilitychange',onActive);
 const timer=window.setInterval(()=>{
  if(!root.isConnected){window.clearInterval(timer);window.removeEventListener('focus',onActive);
   document.removeEventListener('visibilitychange',onActive);return;}
  if(document.visibilityState==='visible'){refresh();refreshSchoolEdits();}
 },15000);
 refresh();refreshSchoolEdits();
}
