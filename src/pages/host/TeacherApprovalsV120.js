import '../../styles/teacherJoinV120.css';
import '../../styles/teacherApprovalStatusV134.css';
import {pendingApprovalsV120,signupOverviewV134,reviewApplicationV120,previewApplicationPhotoV120} from '../../services/teacherOnboardingV120.js';
import {supabase} from '../../services/supabase.js';
import {mountRegistrationConsoleV226} from '../../lib/registrationConsoleV226.js';
const el=(tag,cls='',str='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=str;return n;};
export function TeacherApprovalsV120(){return `<main class="gcc120-page gcc120-admin-page"><section class="gcc120-join gcc120-admin gcc226-admin">
 <a class="gcc120-back" href="#/dashboard">← Host dashboard</a><div class="gcc120-title"><span>GLOBAL CLASSROOM · ADMIN</span><h1>Teacher Registration Center</h1><p>Review registration progress by status or country, then open the approval queue when action is needed. Teachers without websites may still be approved after verifying their school information. Teacher + Host Admin grants full administrative access and should be reserved for trusted organizers.</p></div>
 <nav class="gcc226-admin-tabs" aria-label="Admin views" role="tablist">
  <button type="button" role="tab" id="gcc226-tab-registrations" aria-controls="gcc226-panel-registrations" data-gcc226-tab="registrations" aria-selected="true">Registrations</button>
  <button type="button" role="tab" id="gcc226-tab-countries" aria-controls="gcc226-panel-countries" data-gcc226-tab="countries" aria-selected="false">By country</button>
  <button type="button" role="tab" id="gcc226-tab-applications" aria-controls="gcc226-panel-applications" data-gcc226-tab="applications" aria-selected="false">Approval queue</button>
  <button type="button" role="tab" id="gcc226-tab-corrections" aria-controls="gcc226-panel-corrections" data-gcc226-tab="corrections" aria-selected="false">School corrections</button>
 </nav>
 <section class="gcc134-tracker gcc226-view" id="gcc226-panel-registrations" role="tabpanel" aria-labelledby="gcc226-tab-registrations" data-gcc226-view="registrations" aria-label="Teacher registration status">
  <div class="gcc134-tracker-head">
   <div><h2>Teacher registration status</h2><p>New sign-ups appear here before email confirmation or profile submission.</p></div>
   <button id="gcc134-refresh" type="button" class="gcc120-secondary">↻ Refresh now</button>
  </div>
  <p id="gcc134-refresh-time" class="gcc134-time" role="status" aria-live="polite">Checking registered accounts…</p>
  <div id="gcc134-counts" class="gcc134-counts"></div>
  <div id="gcc134-accounts" class="gcc134-accounts">Loading registration status…</div>
 </section>
 <section class="gcc226-country-container gcc226-view" id="gcc226-panel-countries" role="tabpanel" aria-labelledby="gcc226-tab-countries" data-gcc226-view="countries" aria-label="Registration statistics by country" hidden>
   <h2>Teacher registrations by country</h2>
   <p>Select a country to see its teachers. Accounts without a completed profile appear under “Not provided”.</p>
   <div id="gcc226-countries-list" aria-live="polite"></div>
   <div id="gcc226-country-pagination" aria-label="Country pages"></div>
 </section>
 <section class="gcc153-host-school-queue gcc120-panel gcc226-view" id="gcc226-panel-corrections" role="tabpanel" aria-labelledby="gcc226-tab-corrections" data-gcc226-view="corrections" aria-label="School information correction requests" hidden>
  <div class="gcc134-tracker-head"><div><h2>School information corrections</h2><p>Review changes requested by approved teachers. Approved changes may affect everyone linked to the same school.</p></div>
  <button type="button" id="gcc153-refresh-school" class="gcc120-secondary">↻ Refresh corrections</button></div>
  <p id="gcc153-host-school-msg" class="gcc120-message" role="status" aria-live="polite"></p>
  <div id="gcc153-host-school-list" class="gcc120-review-list">Loading requests…</div>
 </section>
 <section class="gcc226-view" id="gcc226-panel-applications" role="tabpanel" aria-labelledby="gcc226-tab-applications" data-gcc226-view="applications" hidden><h2 class="gcc134-queue-title">Applications awaiting approval</h2>
 <p id="gcc120-review-msg" role="status" aria-live="polite" class="gcc120-message"></p><div id="gcc120-review-list" class="gcc120-review-list">Loading…</div><div id="gcc226-review-pagination" aria-label="Application pages"></div></section>
 </section></main>`;}
export function bindTeacherApprovalsV120(){
 const root=document.querySelector('.gcc120-admin');if(!root)return;
 const message=root.querySelector('#gcc120-review-msg'),list=root.querySelector('#gcc120-review-list');
 const accountsBox=root.querySelector('#gcc134-accounts'),countBox=root.querySelector('#gcc134-counts');
 const lastCheck=root.querySelector('#gcc134-refresh-time'),refreshButton=root.querySelector('#gcc134-refresh');
 const schoolList=root.querySelector('#gcc153-host-school-list');
 const schoolStatus=root.querySelector('#gcc153-host-school-msg');
 const schoolRefresh=root.querySelector('#gcc153-refresh-school');
 let schoolBusy=false;
 let loading=false,lastQueueKey=null,queueRerun=false;
 const registrationConsole=mountRegistrationConsoleV226(root);
 const reviewPager=root.querySelector('#gcc226-review-pagination');
 const reviewPage={number:1};
 const schoolPager=el('div','gcc226-pagination');
 schoolPager.id='gcc226-school-pagination';schoolList.after(schoolPager);
 const schoolPage={number:1};
 function updatePager(container,pager,state,selector,pageSize){
  const cards=[...container.querySelectorAll(selector)];
  const pages=Math.max(1,Math.ceil(cards.length/pageSize));
  state.number=Math.min(Math.max(1,state.number),pages);
  cards.forEach((card,index)=>{card.hidden=Math.floor(index/pageSize)!==(state.number-1);});
  pager.replaceChildren();
  if(cards.length<=pageSize)return;
  const back=el('button','gcc226-page-button','← Previous');back.type='button';back.disabled=state.number===1;
  back.addEventListener('click',()=>{state.number--;updatePager(container,pager,state,selector,pageSize);});
  const forward=el('button','gcc226-page-button','Next →');forward.type='button';forward.disabled=state.number===pages;
  forward.addEventListener('click',()=>{state.number++;updatePager(container,pager,state,selector,pageSize);});
  pager.append(back,el('span','',`Page ${state.number} of ${pages}`),forward);
 }
 const updateReviewPager=()=>updatePager(list,reviewPager,reviewPage,'.gcc226-review-card',6);
 const updateSchoolPager=()=>updatePager(schoolList,schoolPager,schoolPage,'.gcc153-school-review',6);
 const stages={
  email_unconfirmed:['Email confirmation needed','Ask the teacher to confirm their email.'],
  profile_incomplete:['Profile not submitted','The teacher needs to sign in and submit their school profile.'],
  pending:['Awaiting review','Ready for administrator review.'],
  approved:['Approved','Teacher access is approved.'],
  rejected:['Rejected','The application was not approved.']
 };
 const notify=(s,error=false)=>{message.textContent=s;message.classList.toggle('error',error);};
 async function refresh(){
  if(!root.isConnected)return;
  if(loading){queueRerun=true;return;}
  loading=true;refreshButton.disabled=true;
  try{
   const [applications]=await Promise.all([pendingApprovalsV120(),registrationConsole.refresh()]);
   if(!root.isConnected)return;
   const qKey=JSON.stringify(applications);
   if(qKey===lastQueueKey)return;
   list.replaceChildren();
   if(!applications.length){list.append(el('p','gcc120-panel','No pending applications.'));updateReviewPager();lastQueueKey=qKey;return;}
  const {data:schools,error:schoolErr}=await supabase.from('schools').select('id,name,country_name').eq('is_active',true).order('name');
  if(schoolErr)throw schoolErr;
  for(const a of applications){const card=el('article','gcc120-panel gcc120-review-card gcc226-review-card');
    const disclosure=el('details','gcc226-review-disclosure');
    const summary=el('summary','',a.name+' · '+(a.school||'School not provided')+' · '+(a.country||'Country not provided'));
    disclosure.append(summary);card.append(disclosure);
    const reviewBody=el('div','gcc226-review-body');disclosure.append(reviewBody);
    const header=el('div','gcc120-review-head');const image=el('div','gcc120-review-photo','Photo not available');
    if(a.photo_path){
      let photoAttempted=false;
      disclosure.addEventListener('toggle',async()=>{
        if(!disclosure.open||photoAttempted||!root.isConnected)return;
        photoAttempted=true;
        image.textContent='Loading photo…';
        try{
          const src=await previewApplicationPhotoV120(a.photo_path);
          if(!src||!root.isConnected){image.textContent='Photo unavailable';return;}
          const pic=el('img');pic.src=src;pic.alt='Applicant face photograph (verify manually)';
          image.replaceChildren(pic);
        }catch{image.textContent='Photo unavailable';}
      });
    }
    const detail=el('div');detail.append(el('h2','',a.name||''),el('p','',a.email||''));const facts=[
     ['Teacher website',a.website],['Introduction',a.bio],['School',a.school],['School type / level',`${a.school_type} · ${a.school_level}`],
     ['Location',[a.city,a.region,a.country].filter(Boolean).join(', ')],['School website',a.school_website],['Time zone',a.timezone]
    ];for(const [title,value] of facts){const p=el('p');p.append(el('strong','',title+': '));
      if(['Teacher website','School website'].includes(title)&&value){try{const u=new URL(value);if(u.protocol==='https:'){const link=el('a','',u.hostname);link.href=u.href;link.rel='noopener noreferrer';link.target='_blank';p.append(link);}else p.append(document.createTextNode(value));}catch{p.append(document.createTextNode(value));}}
      else p.append(document.createTextNode(value||'—'));detail.append(p);}
    header.append(image,detail);reviewBody.append(header);
    const existing=el('label','','Use existing school (optional; otherwise create new school)');const select=el('select');select.append(new Option('Create a new school',''));
    for(const s of schools){const opt=new Option(`${s.name} · ${s.country_name}`,s.id);select.append(opt);}existing.append(select);reviewBody.append(existing);
    const roles=el('fieldset','gcc120-role');roles.append(el('legend','','Grant access after approval'));
    const teacher=el('label');const basic=el('input');basic.type='radio';basic.name=`role-${a.id}`;basic.value='teacher';basic.checked=true;teacher.append(basic,document.createTextNode(' Teacher only'));
    const admin=el('label');const elevated=el('input');elevated.type='radio';elevated.name=`role-${a.id}`;elevated.value='host';admin.append(elevated,document.createTextNode(' Teacher + Host Admin (can approve others and manage GCC)'));
    const advanced=el('details','gcc226-privilege');
    advanced.append(el('summary','','Advanced: grant Host Administrator permissions'));
    advanced.append(el('p','','Host Admins can approve other teachers and manage GCC. Grant this role only to trusted organizers.'));
    advanced.append(admin);
    roles.append(teacher,advanced);reviewBody.append(roles);
    const checks=el('div','gcc120-review-checks');const checkedFace=el('label');const faceBox=el('input');faceBox.type='checkbox';checkedFace.append(faceBox,document.createTextNode(' I checked that the photograph shows a recognizable face'));
    const checkedSchool=el('label');const schoolBox=el('input');schoolBox.type='checkbox';checkedSchool.append(schoolBox,document.createTextNode(' I verified the school information and any website provided (if available)'));checks.append(checkedFace,checkedSchool);reviewBody.append(checks);
    const actions=el('div','gcc120-review-actions');for(const [decision,label] of [['approved','Approve application'],['rejected','Reject application']]){
     const btn=el('button',decision==='approved'?'gcc120-primary':'gcc120-secondary',label);btn.type='button';btn.addEventListener('click',async()=>{
      const grantHost=elevated.checked,school=select.value||null;
      if(decision==='approved'&&(!faceBox.checked||!schoolBox.checked)){notify('Verify the face photo and school information before approval.',true);return;}
      const warning=decision==='approved'?`Approve ${a.name} as ${grantHost?'HOST ADMIN + Teacher':'Teacher'}? ${grantHost?'This grants full GCC administrative powers.':''}`:`Reject ${a.name}?`;
      if(!confirm(warning))return;
      if(grantHost&&!confirm(`HIGH PRIVILEGE: Confirm granting Host Admin to ${a.email}. This user can approve future teachers.`))return;
      btn.disabled=true;try{await reviewApplicationV120(a.id,decision,grantHost,school);notify(`${a.name}: ${decision}.${decision==='approved'?' Approval confirmation email queued.':''}`);await refresh();}
      catch(e){notify(e.message||'Review failed.',true);btn.disabled=false;}
     });actions.append(btn);}reviewBody.append(actions);list.append(card);
  }
  updateReviewPager();
  lastQueueKey=qKey;
  }catch(e){
   if(lastQueueKey===null)list.replaceChildren(el('p','gcc120-panel','Could not load applications. Reload this page or contact your GCC administrator.'));
   notify(e.message||'Could not load applications.',true);
  }finally{
   loading=false;refreshButton.disabled=false;
   if(queueRerun){queueRerun=false;void refresh();}
  }
 }
 async function refreshSchoolEdits(){
  if(schoolBusy||!root.isConnected)return;
  schoolBusy=true;schoolRefresh.disabled=true;
  try{
   const {data,error}=await supabase.rpc('gcc_v153_host_school_edits');if(error)throw error;
   schoolList.replaceChildren();
   if(!data?.length){schoolList.append(el('p','gcn116-help','No school correction requests are waiting.'));updateSchoolPager();return;}
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
       const {error}=await supabase.rpc('gcc_v153_review_school_edit',{p_id:request.id,p_accept:approve});
       if(error)throw error;
       schoolStatus.textContent=approve?'School correction approved.':'School correction declined.';
       await refreshSchoolEdits();
      }catch(err){schoolStatus.textContent=err.message||'Could not review the correction.';button.disabled=false;}
     });
     actions.append(button);
    }
    card.append(actions);schoolList.append(card);
   }
   updateSchoolPager();
  }catch(err){schoolStatus.textContent=err.message||'Could not load school correction requests.';}
  finally{schoolBusy=false;schoolRefresh.disabled=false;}
 }
 schoolRefresh.addEventListener('click',refreshSchoolEdits);
 refreshButton.addEventListener('click',()=>{refresh();refreshSchoolEdits();});
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
