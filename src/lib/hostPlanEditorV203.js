import {mountPlanFieldsV203,readPlanV203,renderSessionDetailsV203} from './sessionPlannerV203.js';
import {uploadSessionFlyerV203,saveHostPlanV203} from '../services/sessionPlanServiceV203.js';
import {toUtc} from './matching.js';
import {timePartsV112} from './sessionTimeV112.js';
const el=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
const localTime=(iso,zone)=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
 return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;
};
export function mountHostPlanEditorV203(panel,event,onSaved,onError){
 const wrap=el('section');wrap.className='gcc203-host-editor';
 wrap.append(el('h3','Session details and flyer'));
 const overview=el('div');renderSessionDetailsV203(overview,event.session_details||{},{privateLink:true});wrap.append(overview);
 const toggle=el('button','Edit session plan');toggle.type='button';toggle.className='gcc-v8-secondary';wrap.append(toggle);
 const form=el('form');form.hidden=true;mountPlanFieldsV203(form,'gcc203edit');wrap.append(form);
 toggle.addEventListener('click',()=>{form.hidden=!form.hidden;});
 const get=k=>form.querySelector('#gcc203edit-'+k);
 const plan=event.session_details||{};
 for(const [key,value] of [['type',plan.session_type],['preferred',plan.preferred_students],['countries',plan.preferred_countries],
 ['minage',plan.min_age],['maxage',plan.max_age],['grades',plan.accepted_grades],['description',plan.description],
 ['platform',plan.platform],['meeting',plan.meeting_url],['breakout',plan.breakout_mode],['breakoutnotes',plan.breakout_notes]]){
  if(value!==undefined&&value!==null)get(key).value=String(value);
 }
 if(Array.isArray(plan.flow))get('flow').value=plan.flow.map(x=>x.time+' | '+x.activity).join('\n');
 if(plan.registration_closes_at)get('deadline').value=localTime(plan.registration_closes_at,event.timezone||'Asia/Tokyo');
 const save=el('button','Save session plan');save.type='submit';save.className='gcc-v8-primary';form.append(save);
 form.addEventListener('submit',async e=>{
  e.preventDefault();save.disabled=true;
  try{
   const zone=event.timezone||'Asia/Tokyo',local=get('deadline').value;
   if(!local||local.length!==16)throw Error('Choose the registration deadline.');
   const deadline=toUtc(local.slice(0,10),local.slice(11),zone);
   if(deadline.error)throw Error(deadline.error);
   const data=readPlanV203(form,'gcc203edit',{
    startsAt:event.starts_at,endsAt:event.ends_at,
    startTime:timePartsV112(event.starts_at,zone).time,
    endTime:timePartsV112(event.ends_at,zone).time
   },deadline.iso);
   const file=get('flyerfile').files?.[0];
   data.flyer_url=file?await uploadSessionFlyerV203(file):plan.flyer_url||'';
   await saveHostPlanV203(event.id,data);await onSaved();
  }catch(err){onError(err);}finally{save.disabled=false;}
 });
 panel.append(wrap);
}