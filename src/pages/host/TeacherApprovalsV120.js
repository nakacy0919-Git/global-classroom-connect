import '../../styles/teacherJoinV120.css';
import {pendingApprovalsV120,reviewApplicationV120,previewApplicationPhotoV120} from '../../services/teacherOnboardingV120.js';
import {supabase} from '../../services/supabase.js';
const el=(tag,cls='',str='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=str;return n;};
export function TeacherApprovalsV120(){return `<main class="gcc120-page gcc120-admin-page"><section class="gcc120-join gcc120-admin">
 <a class="gcc120-back" href="#/dashboard">← Host dashboard</a><div class="gcc120-title"><span>GLOBAL CLASSROOM · ADMIN</span><h1>Teacher applications</h1><p>Verify the teacher's face, introduction, websites, and school details. Decide whether to grant Teacher access or Teacher + Host Admin.</p></div>
 <p id="gcc120-review-msg" role="status" aria-live="polite" class="gcc120-message"></p><div id="gcc120-review-list" class="gcc120-review-list">Loading…</div>
 </section></main>`;}
export function bindTeacherApprovalsV120(){
 const root=document.querySelector('.gcc120-admin');if(!root)return;
 const message=root.querySelector('#gcc120-review-msg'),list=root.querySelector('#gcc120-review-list');
 const notify=(s,error=false)=>{message.textContent=s;message.classList.toggle('error',error);};
 async function refresh(){list.replaceChildren();const applications=await pendingApprovalsV120();
  if(!applications.length){list.append(el('p','gcc120-panel','No pending applications.'));return;}
  const {data:schools,error:schoolErr}=await supabase.from('schools').select('id,name,country_name').eq('is_active',true).order('name');
  if(schoolErr)throw schoolErr;
  for(const a of applications){const card=el('article','gcc120-panel gcc120-review-card');
    const header=el('div','gcc120-review-head');const image=el('div','gcc120-review-photo','Photo not available');
    if(a.photo_path){try{const src=await previewApplicationPhotoV120(a.photo_path);if(src){const pic=el('img');pic.src=src;pic.alt='Applicant face photograph (verify manually)';image.replaceChildren(pic);}}catch{}}
    const detail=el('div');detail.append(el('h2','',a.name||''),el('p','',a.email||''));const facts=[
     ['Teacher website',a.website],['Introduction',a.bio],['School',a.school],['School type / level',`${a.school_type} · ${a.school_level}`],
     ['Location',`${a.city}, ${a.region}, ${a.country}`],['School website',a.school_website],['Time zone',a.timezone]
    ];for(const [title,value] of facts){const p=el('p');p.append(el('strong','',title+': '));
      if(['Teacher website','School website'].includes(title)&&value){try{const u=new URL(value);if(u.protocol==='https:'){const link=el('a','',u.hostname);link.href=u.href;link.rel='noopener noreferrer';link.target='_blank';p.append(link);}else p.append(document.createTextNode(value));}catch{p.append(document.createTextNode(value));}}
      else p.append(document.createTextNode(value||'—'));detail.append(p);}
    header.append(image,detail);card.append(header);
    const existing=el('label','','Use existing school (optional; otherwise create new school)');const select=el('select');select.append(new Option('Create a new school',''));
    for(const s of schools){const opt=new Option(`${s.name} · ${s.country_name}`,s.id);select.append(opt);}existing.append(select);card.append(existing);
    const roles=el('fieldset','gcc120-role');roles.append(el('legend','','Grant access after approval'));
    const teacher=el('label');const basic=el('input');basic.type='radio';basic.name=`role-${a.id}`;basic.value='teacher';basic.checked=true;teacher.append(basic,document.createTextNode(' Teacher only'));
    const admin=el('label');const elevated=el('input');elevated.type='radio';elevated.name=`role-${a.id}`;elevated.value='host';admin.append(elevated,document.createTextNode(' Teacher + Host Admin (can approve others and manage GCC)'));
    roles.append(teacher,admin);card.append(roles);
    const checks=el('div','gcc120-review-checks');const checkedFace=el('label');const faceBox=el('input');faceBox.type='checkbox';checkedFace.append(faceBox,document.createTextNode(' I checked that the photograph shows a recognizable face'));
    const checkedSchool=el('label');const schoolBox=el('input');schoolBox.type='checkbox';checkedSchool.append(schoolBox,document.createTextNode(' I verified the school website and application details'));checks.append(checkedFace,checkedSchool);card.append(checks);
    const actions=el('div','gcc120-review-actions');for(const [decision,label] of [['approved','Approve application'],['rejected','Reject application']]){
     const btn=el('button',decision==='approved'?'gcc120-primary':'gcc120-secondary',label);btn.type='button';btn.addEventListener('click',async()=>{
      const grantHost=elevated.checked,school=select.value||null;
      if(decision==='approved'&&(!faceBox.checked||!schoolBox.checked)){notify('Verify the face photo and school information before approval.',true);return;}
      const warning=decision==='approved'?`Approve ${a.name} as ${grantHost?'HOST ADMIN + Teacher':'Teacher'}? ${grantHost?'This grants full GCC administrative powers.':''}`:`Reject ${a.name}?`;
      if(!confirm(warning))return;
      if(grantHost&&!confirm(`HIGH PRIVILEGE: Confirm granting Host Admin to ${a.email}. This user can approve future teachers.`))return;
      btn.disabled=true;try{await reviewApplicationV120(a.id,decision,grantHost,school);notify(`${a.name}: ${decision}.`);await refresh();}
      catch(e){notify(e.message||'Review failed.',true);btn.disabled=false;}
     });actions.append(btn);}card.append(actions);list.append(card);
  }
 }
 refresh().catch(e=>notify(e.message||'Could not load applications.',true));
}
