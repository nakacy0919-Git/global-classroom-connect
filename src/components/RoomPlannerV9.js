import '../styles/roomPlannerV9.css';
import {collectApproved,buildRoomDraft,moveStudent,setFacilitator,roomStatistics,exportRoomCSV} from '../lib/roomPlannerV9.js';
import {packRoomDraft} from '../lib/roomDraftV91.js';
import {mergeSavedRoomDraftV129} from '../lib/roomIncrementalV129.js';
import {fetchRoomDraft,saveRoomDraft} from '../services/roomDraftV91.js';
import {countryIsoCode,countryFlagEmoji} from '../lib/roomCountryFlagsV104.js';
import jpPlannerFlag from '../assets/room-flags/jp.svg';
import phPlannerFlag from '../assets/room-flags/ph.svg';
import lkPlannerFlag from '../assets/room-flags/lk.svg';
import bdPlannerFlag from '../assets/room-flags/bd.svg';

const elem=(tag,cls='',label='')=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(label!==undefined&&label!==null)e.textContent=String(label);
 return e;
};
const option=(text,value)=>{const e=elem('option','',text);e.value=String(value);return e;};
// Decorative illustrated avatars: role distinction without adding repeated text.
// Artwork stays as local vector assets. Names and choices remain plain DOM text.
// Use the same bundled SVG flags as the public room chart and world clocks.
const plannerFlagAssetsV115=Object.freeze({JP:jpPlannerFlag,PH:phPlannerFlag,LK:lkPlannerFlag,BD:bdPlannerFlag});
const plannerCountryFlagV115=(country,countryCode)=>{
 const iso=String(countryCode||countryIsoCode(country)).trim().toUpperCase();
 const source=plannerFlagAssetsV115[iso];
 if(source){
  const flag=elem('img','gcc-v115-country-flag');
  flag.src=source;flag.alt='';flag.width=23;flag.height=16;
  flag.setAttribute('aria-hidden','true');
  return flag;
 }
 const fallback=elem('span','gcc-v115-country-fallback',countryFlagEmoji(country||iso));
 fallback.setAttribute('aria-hidden','true');
 return fallback;
};

const avatar=(role)=>{
 const person=elem('span',`gcc-v9-avatar gcc-v9-avatar-${role}`);
 person.setAttribute('aria-hidden','true');
 return person;
};
const personHeading=(label,role)=>{
 const heading=elem('h5','gcc-v9-person-heading');
 heading.append(avatar(role),elem('span','',label));
 return heading;
};
const demoSignups=()=>[
  {id:'demo-jp',status:'approved',school_name:'Sakura High School',country_name:'Japan',country_code:'JP',students:[{id:'demo-1',name:'Aiko Mori'},{id:'demo-2',name:'Ken Tanaka'},{id:'demo-3',name:'Yui Sato'}],facilitators:['Mika Ito','Daiki Ono']},
  {id:'demo-ph',status:'approved',school_name:'Cebu Science School',country_name:'Philippines',country_code:'PH',students:[{id:'demo-4',name:'Maria Cruz'},{id:'demo-5',name:'Ana Reyes'},{id:'demo-6',name:'Juan Ramos'}],facilitators:['Maria Santos','Ben Cruz']},
  {id:'demo-vn',status:'approved',school_name:'Hanoi Secondary School',country_name:'Vietnam',country_code:'VN',students:[{id:'demo-7',name:'Linh Tran'},{id:'demo-8',name:'Mai Nguyen'},{id:'demo-9',name:'Tuan Le'}],facilitators:['Linh Mai']},
  {id:'demo-id',status:'approved',school_name:'Jakarta School',country_name:'Indonesia',country_code:'ID',students:[{id:'demo-10',name:'Putri Sari'},{id:'demo-11',name:'Rizky Putra'},{id:'demo-12',name:'Dewi Ayu'}],facilitators:['Ayu Kartika']},
];

/** Mounts a privacy-preserving, in-memory draft planner; no database writes. */
export function mountRoomPlannerV9({root,event,signups,settings}) {
 if(!root)return;
 let {students,facilitators}=collectApproved(signups);
 let sample=false,plan=null,screen='settings',moveMode=false,moveTarget=null;
 let savedMeta=null,revision=0,dirty=true,busy=false,loadError='';
 let checkingSaved=Boolean(event?.id);
 const configured=Number(settings?.breakout_rooms||10),initialFac=Number(settings?.facilitators_per_room??1);
 const prefs={rooms:Math.max(1,Math.min(60,configured)),facilitatorsPerRoom:initialFac,countryMode:'prefer',schoolMode:'prefer'};
 const message=(text,error=false)=>{const n=root.querySelector('[data-v9-message]');if(n){n.textContent=text;n.classList.toggle('error',error);}};
 const makeLabel=(name,label,widget)=>{const wrap=elem('label','gcc-v9-field');wrap.append(elem('span','',label));widget.name=name;wrap.append(widget);return wrap;};
 // Show a single, actionable explanation when this is a demonstration, not a real roster.
 const demoNotice=(preview=false)=>{
   const notice=elem('div','gcc-v9-demo-guide');
   notice.append(elem('strong','',preview?'SAMPLE PREVIEW — practice only':'Demo mode — practice only'));
   notice.append(elem('p','','These 12 students are fictional. To save and share a real seating plan, first approve school registrations in Step 2.'));
   const back=elem('button','gcc-v9-outline gcc-v9-demo-back','← Review registrations');
   back.type='button';
   back.addEventListener('click',()=>document.getElementById('gcc-v8-host-back')?.click());
   notice.append(back);
   return notice;
 };

 function renderSettings() {
   root.replaceChildren();const shell=elem('section','gcc-v9');root.append(shell);
   const heading=elem('div','gcc-v9-head');heading.append(elem('span','gcc-v9-step','STEP 1 OF 2 · SETUP'),elem('h3','','Set up your breakout rooms'),elem('p','','Choose your room settings. The next screen will show your student groups.'));shell.append(heading);
 if(checkingSaved){shell.append(elem('p','gcc-v9-message','Checking for a saved arrangement before enabling room generation…'));return;}
 if(loadError){shell.append(elem('p','gcc-v9-warning',`Room generation is paused because the saved arrangement could not be checked: ${loadError}. Reload the session and try again.`));return;}
   if(sample){shell.append(demoNotice());}
   if(!students.length){const empty=elem('div','gcc-v9-empty');empty.append(elem('strong','','No approved students yet'),elem('p','','Approve the school registrations to use actual student names. You can explore the planner with sample names now.'));
     const reviewBtn=elem('button','gcc-v9-primary','← Review registrations');reviewBtn.type='button';reviewBtn.addEventListener('click',()=>document.getElementById('gcc-v8-host-back')?.click());empty.append(reviewBtn);
     const sampleBtn=elem('button','gcc-v9-outline','Try with sample students');sampleBtn.type='button';sampleBtn.addEventListener('click',()=>{const x=collectApproved(demoSignups());students=x.students;facilitators=x.facilitators;sample=true;prefs.rooms=4;renderSettings();});empty.append(sampleBtn);shell.append(empty);return;}
   if(!sample && savedMeta){
     const resume=elem('section','gcc-v91-resume');
     const info=elem('div');info.append(elem('strong','','Saved room arrangement found'),elem('p','',`Last saved ${new Date(savedMeta.updated_at).toLocaleString()}. Keep every existing room and fixed pair; only new participants will be added.`));
     const open=elem('button','gcc-v9-primary','Continue saved plan →');open.type='button';
     open.addEventListener('click',()=>{try{
       const restored=mergeSavedRoomDraftV129(savedMeta.draft,students,facilitators);
       plan=restored.rooms;Object.assign(prefs,restored.prefs);revision=savedMeta.revision;dirty=restored.addedStudents>0||restored.addedFacilitators>0;screen='preview';moveMode=false;renderPreview();
       if(restored.addedStudents||restored.addedFacilitators)message(`${restored.addedStudents} new student(s) and ${restored.addedFacilitators} facilitator(s) added; saved placements were preserved. Save this updated arrangement, then publish the new chart in Step 4.`);
     }catch(err){message(err.message,true);}});
     resume.append(info,open);shell.append(resume);
     shell.append(elem('p','gcc-v9-foot','Existing room assignments are protected. Whole-group Generate / Shuffle is disabled for this saved session.'));
     return;
   }
   if(loadError) shell.append(elem('p','gcc-v9-warning',`Saved plan could not be loaded: ${loadError}`));
   const summary=elem('div','gcc-v9-intro');summary.append(elem('strong','',`${students.length} students`),elem('span','',`${new Set(students.map(s=>s.schoolKey)).size} schools`),elem('span','',`${facilitators.length} facilitators available`));shell.append(summary);
   const form=elem('form','gcc-v9-options');
   const rooms=elem('input');rooms.type='number';rooms.min='1';rooms.max='60';rooms.required=true;rooms.value=prefs.rooms;
   const fac=elem('select');for(const n of [0,1,2])fac.append(option(`${n} per room`,n));fac.value=String(prefs.facilitatorsPerRoom);
   const country=elem('select');for(const [id,text] of [['strong','Avoid same country'],['prefer','Prefer different countries'],['ignore','Ignore country']])country.append(option(text,id));country.value=prefs.countryMode;
   const school=elem('select');for(const [id,text] of [['strong','Avoid same school'],['prefer','Prefer different schools'],['ignore','Ignore school']])school.append(option(text,id));school.value=prefs.schoolMode;
   form.append(makeLabel('rooms','Number of breakout rooms',rooms),makeLabel('facs','Facilitators in each room',fac),makeLabel('country','Country mixing',country),makeLabel('school','School mixing',school));
   const actions=elem('div','gcc-v9-generate-area');actions.append(elem('strong','','Ready to make groups?'));actions.append(elem('span','','Next, review the students in each room.'));const generate=elem('button','gcc-v9-primary gcc-v9-main-action','Generate rooms →');generate.type='submit';actions.append(generate);form.append(actions);shell.append(form);
   const foot=elem('p','gcc-v9-foot','“Avoid” is best-effort. When schools or countries have too many students, perfect separation may be impossible.');shell.append(foot);
   const status=elem('p','gcc-v9-message','');status.setAttribute('data-v9-message','');shell.append(status);
   form.addEventListener('submit',e=>{e.preventDefault();if(savedMeta||checkingSaved||loadError){message('Saved arrangements must be continued, not shuffled.',true);return;}prefs.rooms=Number(rooms.value);prefs.facilitatorsPerRoom=Number(fac.value);prefs.countryMode=country.value;prefs.schoolMode=school.value;
     try{plan=buildRoomDraft(students,facilitators,prefs);dirty=true;screen='preview';moveMode=false;moveTarget=null;renderPreview();}
     catch(err){message(err.message,true);}
   });
 }
 function csvDownload(){if(!plan||sample)return;
   const payload=exportRoomCSV(event?.title||'Global Classroom',plan);
   const blob=new Blob([payload],{type:'text/csv;charset=utf-8;'});
   const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
   a.download=`GCC_Room_Plan_${String(event?.title||'Session').replace(/[^a-z0-9_-]+/gi,'_').slice(0,35)}.csv`;
   document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
   message(dirty?'CSV downloaded. Remember to save the arrangement to keep it online.':'CSV downloaded. Your saved arrangement remains available online.');
 }
 async function persistDraft() {
   if(sample||!event?.id||!plan||busy)return;
   busy=true;
   const primary=root.querySelector('[data-v91-save]');if(primary)primary.disabled=true;
   try{
     const payload=packRoomDraft(plan,prefs);
     const saved=await saveRoomDraft(event.id,payload,revision);
     revision=Number(saved.revision);savedMeta={...saved,draft:payload,revision,updated_at:saved.updated_at||new Date().toISOString()};dirty=false;
     renderPreview();message('✓ Room arrangement safely saved. You can reopen this session later.');
   }catch(err){message(`Could not save: ${err.message}. Your draft is still on this screen; download CSV as a backup.`,true);if(primary)primary.disabled=false;}
   finally{busy=false;}
 }
 function renderPreview(){
   root.replaceChildren();const shell=elem('section','gcc-v9 gcc-v9-preview');root.append(shell);
   const head=elem('div','gcc-v9-head');
   head.append(elem('span','gcc-v9-step','STEP 2 OF 2 · REVIEW'));
   head.append(elem('h3','','Check your breakout rooms'));
   head.append(elem('p','','Review the groups below. Need to move someone? Choose “Move students”.'));
   shell.append(head);
   if(sample)shell.append(demoNotice(true));

   const stats=roomStatistics(plan);
   const summary=elem('div','gcc-v9-stats gcc-v9-stats-main');
   for(const label of [`${plan.length} rooms`,`${stats.students} students`])summary.append(elem('span','',label));
   shell.append(summary);
   const insights=elem('details','gcc-v9-insights');
   insights.append(elem('summary','','Mixing details'));
   const details=elem('p','',`${stats.sameCountryPairs} same-country pairs · ${stats.sameSchoolPairs} same-school pairs`);
   insights.append(details);shell.append(insights);
   if(stats.emptyRooms||stats.unfilledFacilitators){
     const note=elem('p','gcc-v9-warning',`${stats.emptyRooms?`${stats.emptyRooms} empty room(s). `:''}${stats.unfilledFacilitators?`${stats.unfilledFacilitators} facilitator slot(s) unfilled.`:''}`);
     shell.append(note);
   }

   // One primary action only. This toolbar remains visible while reviewing large groups.
   const actionBar=elem('section','gcc-v9-guide');
   const actionText=elem('div','gcc-v9-guide-copy');
   actionText.append(elem('span','gcc-v9-step','NEXT ACTION'));
   actionText.append(elem('strong','',sample?(moveMode?'Finish moving students':'Try moving a student'):(dirty?'Save your room arrangement':'Ready to share your saved plan')));
   actionText.append(elem('p','',sample?'Try moving students, or return to Step 2 to approve real registrations.':(dirty?'Save so you can reopen and edit this arrangement later.':'The arrangement is saved. Continue to Step 4 to publish your seating plan.')));
   actionBar.append(actionText);
    if(!sample){
      if(dirty){
        const save=elem('button','gcc-v9-primary gcc-v9-main-action','Save arrangement →');save.type='button';
        save.setAttribute('data-v91-save','');save.addEventListener('click',persistDraft);actionBar.append(save);
      }else{
        const go=elem('button','gcc-v9-primary gcc-v9-main-action','Continue to Share →');go.type='button';
        go.addEventListener('click',()=>document.getElementById('gcc-v8-host-next')?.click());actionBar.append(go);
      }
    }else{
     const next=elem('button','gcc-v9-primary gcc-v9-main-action',moveMode?'✓ Done moving':'⇄ Try moving students');next.type='button';
     next.addEventListener('click',()=>{moveMode=!moveMode;moveTarget=null;renderPreview();});actionBar.append(next);
   }
   shell.append(actionBar);

   const tools=elem('div','gcc-v9-tools');
   const back=elem('button','gcc-v9-outline','← Change settings');back.type='button';back.addEventListener('click',()=>{screen='settings';moveMode=false;moveTarget=null;renderSettings();});tools.append(back);
   if(!savedMeta){const remix=elem('button','gcc-v9-outline','↻ Shuffle again');remix.type='button';remix.addEventListener('click',()=>{plan=buildRoomDraft(students,facilitators,prefs);dirty=true;moveMode=false;moveTarget=null;renderPreview();message('A new room mix is ready. Save it to keep these changes.');});tools.append(remix);}
   if(!sample){
     const edit=elem('button','gcc-v9-outline gcc-v9-edit-toggle',moveMode?'✓ Done moving':'⇄ Move students');edit.type='button';edit.setAttribute('aria-pressed',String(moveMode));
     edit.addEventListener('click',()=>{moveMode=!moveMode;moveTarget=null;renderPreview();});tools.append(edit);
   }
   if(!sample){const csv=elem('button','gcc-v9-outline','↓ Download CSV');csv.type='button';csv.addEventListener('click',csvDownload);tools.append(csv);}
   shell.append(tools);
   const msg=elem('p','gcc-v9-message');msg.setAttribute('data-v9-message','');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');shell.append(msg);
   if(moveMode){
     const hint=elem('p','gcc-v9-move-hint','Move mode: choose “Move” next to a student, then select their destination room.');
     shell.append(hint);
   }

   const grid=elem('div','gcc-v9-rooms');shell.append(grid);
   for(const room of plan){
     const card=elem('article','gcc-v9-room');
     const h=elem('div','gcc-v9-room-head');h.append(elem('h4','',room.name),elem('span','',`${room.students.length} students`));card.append(h);
     if(room.facilitators.length){
       card.append(personHeading('Facilitators','teacher'));
       for(const [slot,f] of room.facilitators.entries()){
         const sel=elem('select','gcc-v9-fac-select');sel.setAttribute('aria-label',`${room.name} facilitator ${slot+1}`);
         sel.append(option(`Slot ${slot+1}: unassigned`,''));
         for(const f2 of facilitators)sel.append(option(`${f2.name} · ${f2.school}`,f2.id));
         sel.value=f?.id||'';
         sel.addEventListener('change',()=>{try{setFacilitator(plan,room.number,slot,sel.value,facilitators);dirty=true;renderPreview();message('Facilitator updated. Save to keep the change.');}catch(err){message(err.message,true);}});
         const field=elem('div','gcc-v9-fac-row');field.append(avatar('teacher'),sel);card.append(field);
       }
     }
     card.append(personHeading('Students','student'));
     if(!room.students.length)card.append(elem('p','gcc-v9-muted','No students assigned'));
     for(const st of room.students){
       const row=elem('div','gcc-v9-student');
       const info=elem('div','gcc-v9-student-info');
       const metadata=elem('small','gcc-v115-country-line');
       metadata.append(plannerCountryFlagV115(st.country,st.countryCode),elem('span','gcc-v115-country-description',`${st.country} · ${st.school}`));
       info.append(elem('strong','',st.name),metadata);
       row.append(avatar('student'),info);
       // In normal view there is NO repeated Room 01 / Room 02 dropdown per student.
       if(moveMode){
         if(moveTarget===st.id){
           const chooser=elem('div','gcc-v9-move-picker');
           const sel=elem('select','gcc-v9-move');sel.setAttribute('aria-label',`Destination room for ${st.name}`);
           sel.append(option('Move to…',''));
           for(const r of plan){if(r.number!==room.number)sel.append(option(r.name,r.number));}
           sel.value='';
           sel.addEventListener('change',()=>{
             if(!sel.value)return;
             const destination=plan.find(r=>r.number===Number(sel.value));
             try{moveStudent(plan,st.id,sel.value);dirty=true;moveTarget=null;renderPreview();message(`${st.name} moved to ${destination?.name||'the selected room'}. Save to keep the change.`);}
             catch(err){message(err.message,true);}
           });
           const cancel=elem('button','gcc-v9-cancel','Cancel');cancel.type='button';cancel.addEventListener('click',()=>{moveTarget=null;renderPreview();});
           chooser.append(sel,cancel);row.append(chooser);
         }else{
           const btn=elem('button','gcc-v9-move-button','Move');btn.type='button';btn.setAttribute('aria-label',`Move ${st.name}`);
           btn.addEventListener('click',()=>{moveTarget=st.id;renderPreview();});row.append(btn);
         }
       }
       card.append(row);
     }
     grid.append(card);
   }
   const foot=elem('p','gcc-v9-foot',sample?'Sample preview only. No data was changed.':dirty?'UNSAVED CHANGES — Save your arrangement or download CSV before leaving.':'SAVED DRAFT — Only hosts can access this plan. Not yet published to teachers or students.');shell.append(foot);
 }

 renderSettings();
 // Tests and the sample planner have no event ID; only real host sessions query the DB.
 if(!sample && event?.id && typeof fetchRoomDraft === 'function'){
   fetchRoomDraft(event.id).then(saved=>{
     checkingSaved=false;
     if(!saved){if(screen==='settings')renderSettings();return;}
     savedMeta=saved;revision=Number(saved.revision)||0;
     if(screen==='settings')renderSettings();
   }).catch(err=>{checkingSaved=false;loadError=err.message||'Connection error';if(screen==='settings')renderSettings();});
 }
}
