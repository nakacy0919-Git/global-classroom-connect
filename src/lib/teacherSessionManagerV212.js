import {mountPlanFieldsV203,readPlanV203} from './sessionPlannerV203.js';
import {makeSlot,toUtc} from './matching.js';
import {timePartsV112} from './sessionTimeV112.js';
import {GCC_LEVELS_V150,GCC_MODES_V150} from './sessionStudioV150.js';
import {teacherManageSession,teacherEditSession,teacherReopenSession} from '../services/teacherSelfService.js';
import {uploadSessionFlyerV203} from '../services/sessionPlanServiceV203.js';
import {sessionReadinessV212} from './sessionManagementV212.js';

const node=(tag,cls='',value='')=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(value)e.textContent=value;return e;
};
const field=(form,id,label,type='text',options={})=>{
 const wrap=node('label','gcs212-field',label),input=node(type==='textarea'?'textarea':type==='select'?'select':'input');
 input.id='gcs212-'+id;
 if(type!=='textarea'&&type!=='select')input.type=type;
 if(options.required)input.required=true;
 if(options.min!==undefined)input.min=String(options.min);
 if(options.max!==undefined)input.max=String(options.max);
 if(options.maxLength)input.maxLength=options.maxLength;
 if(type==='select')for(const [value,title] of options.values||[]){
  const o=node('option','',title);o.value=value;input.add(o);
 }
 wrap.append(input);form.append(wrap);return input;
};
const localIso=(date,zone)=>{
 if(!date||!zone)return '';
 const p=timePartsV112(date,zone);
 return p.date+'T'+p.time;
};

export function mountSessionManagerV212(root,{identity,onSaved,onError}){
 const dialog=node('dialog','gcs212-dialog');
 dialog.id='gcs212-manage-dialog';dialog.setAttribute('aria-labelledby','gcs212-manager-title');
 const head=node('div','gcs212-modal-head');
 head.append(node('div','gcs212-eyebrow','SESSION MANAGEMENT'),node('h3','','Edit your hosted session'));
 head.querySelector('h3').id='gcs212-manager-title';
 const banner=node('div','gcs212-readiness');
 const info=node('p','gcs212-hint','Edit the schedule, capacity, and session plan. Approved partners are notified if the schedule changes.');
 const form=node('form','gcs212-form');
 form.id='gcs212-form';form.noValidate=true;
 form.append(head,banner,info);
 const basics=node('div','gcs212-basics');form.append(basics);
 const input={};
 input.title=field(basics,'name','Session title *','text',{required:true,maxLength:120});
 input.date=field(basics,'date','Session date *','date',{required:true});
 input.from=field(basics,'from','Start time (your school) *','time',{required:true});
 input.until=field(basics,'until','End time (your school) *','time',{required:true});
 input.students=field(basics,'students','Students from your school *','number',{required:true,min:1,max:500});
 input.capacity=field(basics,'capacity','Total maximum (including host school) *','number',{required:true,min:1,max:2000});
 input.rooms=field(basics,'rooms','Breakout rooms *','number',{required:true,min:1,max:100});
 input.band=field(basics,'band','Your school level *','select',
  {values:GCC_LEVELS_V150.map(([code,label])=>[code,label])});
 input.mode=field(basics,'mode','Connection format *','select',
  {values:Object.entries(GCC_MODES_V150).map(([code,data])=>[code,data.name])});
 input.topic=field(basics,'topic','Session topic','text',{maxLength:120});
 input.notes=field(basics,'notes','Notes to other teachers','textarea',{maxLength:500});
 const target=node('fieldset','gcs212-target-levels');
 target.append(node('legend','','Partner school levels you welcome *'));
 for(const [code,label] of GCC_LEVELS_V150){
  const l=node('label','gcs212-target-label');const checkbox=node('input');
  checkbox.type='checkbox';checkbox.value=code;checkbox.name='gcs212-level';
  l.append(checkbox,node('span','',label));target.append(l);
 }
 form.append(target);
 const planSlot=node('div','gcs212-planner');form.append(planSlot);
 mountPlanFieldsV203(planSlot,'gcs212plan');
 const message=node('p','gcs212-feedback');message.setAttribute('role','alert');form.append(message);
 const actions=node('div','gcs212-actions');
 const cancel=node('button','gct-secondary','Cancel');cancel.type='button';
 const save=node('button','gct-primary','Save session changes');save.type='submit';
 actions.append(cancel,save);form.append(actions);dialog.append(form);root.append(dialog);
 cancel.addEventListener('click',()=>dialog.close());
 let current=null,base=null;

 const setPlan=(key,value)=>{
  const el=planSlot.querySelector('#gcs212plan-'+key);
  if(el&&value!==undefined&&value!==null)el.value=String(value);
 };
 const showMessage=(text)=>{
  message.textContent=text;message.hidden=!text;
  if(text){message.scrollIntoView?.({behavior:'smooth',block:'center'});}
 };
 async function open(offer){
  current=null;base=null;message.textContent='';
  const data=await teacherManageSession(offer.id);
  const id=identity();if(!id||data.teacher_id!==id.id)throw Error('Only the owning teacher can edit this session');
  current=data.id;base=data;
  const d=data.session_details||{};
  const zone=data.timezone||id.timezone;
  input.title.value=d.session_name||'';
  input.date.value=timePartsV112(data.starts_at,zone).date;
  input.from.value=timePartsV112(data.starts_at,zone).time;
  input.until.value=timePartsV112(data.ends_at,zone).time;
  input.students.value=String(data.student_count);
  input.capacity.value=String(d.max_participants||'');
  input.rooms.value=String(data.room_count);
  input.band.value=data.age_band;
  input.mode.value=d.mode||'classroom';
  input.topic.value=data.topic||'';
  input.notes.value=data.notes||'';
  for(const checkbox of target.querySelectorAll('input[type=checkbox]')){
   checkbox.checked=Array.isArray(d.target_levels)&&d.target_levels.includes(checkbox.value);
  }
  const vals={type:d.session_type,countries:d.preferred_countries,minage:d.min_age,
   maxage:d.max_age,grades:d.accepted_grades,description:d.description,
   platform:d.platform,meeting:d.meeting_url,breakout:d.breakout_mode,
   breakoutnotes:d.breakout_notes};
  for(const [key,value] of Object.entries(vals))setPlan(key,value);
  const flow=(d.flow||[]).filter(x=>x?.time&&x?.activity)
   .map(x=>x.time+' '+x.activity).join('\n');
  setPlan('flow',flow);
  setPlan('deadline',localIso(d.registration_closes_at,zone));
  if(d.platform){
   planSlot.querySelector('#gcs212plan-platform').dispatchEvent(new Event('change'));
   setPlan('platform-option',d.platform_option);
  }
  const file=planSlot.querySelector('#gcs212plan-flyerfile');file.value='';
  const readiness=sessionReadinessV212(data);
  banner.textContent=readiness.ready?
   '✓ Session information complete':
   'Needs attention: '+readiness.missing.join(' · ')+'. Fill these fields before saving.';
  banner.classList.toggle('gcs212-needs-attention',!readiness.ready);
  if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.open=true;}
  input.title.focus();
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!current||!base)return;
  save.disabled=true;showMessage('');
  try{
   if(!form.checkValidity()){
    const invalid=form.querySelector(':invalid');
    invalid?.focus();invalid?.scrollIntoView?.({block:'center',behavior:'smooth'});
    throw Error('Please complete the highlighted required field.');
   }
   const zone=base.timezone;
   const slot=makeSlot({date:input.date.value,startTime:input.from.value,
    endTime:input.until.value,timezone:zone});
   if(slot.error)throw Error(slot.error);
   if(Date.parse(slot.startsAt)<=Date.now())throw Error('Choose a future session date and time');
   const deadlineField=planSlot.querySelector('#gcs212plan-deadline').value;
   if(!deadlineField)throw Error('Choose a registration deadline');
   const deadline=toUtc(deadlineField.slice(0,10),deadlineField.slice(11),zone);
   if(deadline.error)throw Error(deadline.error);
   const levels=[...target.querySelectorAll('input:checked')].map(x=>x.value);
   if(!levels.length)throw Error('Select at least one welcome partner school level');
   const students=Number(input.students.value),capacity=Number(input.capacity.value);
   if(!Number.isInteger(students)||!Number.isInteger(capacity)||capacity<students)
    throw Error('Total capacity must include all students from the host school');
   const updated=readPlanV203(planSlot,'gcs212plan',
    {...slot,startTime:input.from.value,endTime:input.until.value},deadline.iso,capacity);
   const own=identity();
   const plan={...base.session_details,...updated,session_name:input.title.value.trim(),
    mode:input.mode.value,target_levels:levels,
    host_country_code:own.country_code,host_country_name:own.country,
    flyer_url:base.session_details?.flyer_url||''};
   const file=planSlot.querySelector('#gcs212plan-flyerfile').files?.[0];
   if(file)plan.flyer_url=await uploadSessionFlyerV203(file);
   await teacherEditSession({offerId:current,slot,students,rooms:Number(input.rooms.value),
    band:input.band.value,topic:input.topic.value,notes:input.notes.value,details:plan});
   dialog.close();current=null;base=null;
   await onSaved();
  }catch(e){
   showMessage(e.message||'Could not save your changes');
   onError?.(e);
  }finally{save.disabled=false;}
 });
 return {open,reopen:async(offer)=>{await teacherReopenSession(offer.id);await onSaved();}};
}
