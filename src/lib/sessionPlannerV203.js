import {prepareFlyerOnceV207,describeFlyerV207} from './flyerWebpV207.js';
// GCC V20.3 session pedagogy, planning and public detail presentation.
export const SESSION_TYPES_V203=[
 ['cultural_exchange','Cultural Exchange'],['guided_discussion','Guided Discussion'],
 ['structured_debate','Structured Debate'],['conversation_practice','Conversation Practice'],
 ['language_exchange','Language Exchange'],['collaborative_project','Collaborative Project'],
 ['presentation_qa','Presentation & Q&A'],['global_issues','Global Issues / SDGs'],
 ['icebreaking','Icebreaking & Networking'],['other','Other / Custom']
];
export const PLATFORMS_V203=[
 ['zoom','Zoom'],['google_meet','Google Meet'],['teams','Microsoft Teams'],
 ['webex','Cisco Webex'],['other','Other platform']
];
const hints={
 zoom:'Zoom host/co-host can manage breakout rooms. Pre-assignment may require signed-in participants.',
 google_meet:'Google Meet breakout rooms require an eligible Workspace edition. The host starts them on a computer.',
 teams:'Microsoft Teams organizer or appointed breakout manager controls rooms; Teams Free participants have assignment limits.',
 webex:'Check your Webex plan and breakout permissions before using this option.',
 other:'Confirm this platform supports breakout rooms; choose no rooms if not.'
};
const node=(tag,cls='',str='')=>{const x=document.createElement(tag);x.className=cls;x.textContent=String(str);return x;};
const label=(text,child)=>{const x=node('label','gcc203-label',text);x.append(child);return x;};
export function mountPlanFieldsV203(root,prefix){
 const section=node('section','gcc203-fields');section.id=prefix+'-planner';section.append(node('h3','','Session details · required'));
 const add=(key,title,tag='input',opts={})=>{
  const x=node(tag);x.id=prefix+'-'+key;
  if(opts.type)x.type=opts.type;if(opts.required)x.required=true;
  if(opts.maxLength)x.maxLength=opts.maxLength;
  if(opts.min!==undefined)x.min=opts.min;if(opts.max!==undefined)x.max=opts.max;
  if(opts.value!==undefined)x.value=opts.value;
  if(opts.placeholder)x.placeholder=opts.placeholder;
  if(opts.rows)x.rows=opts.rows;
  section.append(label(title,x));return x;
 };
 const choose=(key,title,options)=>{const s=add(key,title,'select',{required:true});
  for(const [value,text] of options){const o=node('option','',text);o.value=value;s.append(o);}return s;
 };
 choose('type','Educational session type *',SESSION_TYPES_V203);
 // Maximum total attendance is entered once in Basics (teacher) or event settings (host).
 add('countries','Preferred partner countries (optional)','input',{maxLength:200,placeholder:'Any, or Japan, Korea, Philippines'});
 add('minage','Minimum acceptable age *','input',{type:'number',min:5,max:30,value:12,required:true});
 add('maxage','Maximum acceptable age *','input',{type:'number',min:5,max:30,value:18,required:true});
 add('grades','Accepted grades (optional)','input',{maxLength:100,placeholder:'Grades 7–12'});
 add('flow','Session agenda * (time + activity per line; no special symbol needed)','textarea',{rows:6,maxLength:4000,required:true,placeholder:'13:10 Welcome and goals\n13:20 Breakout Round 1: introductions\n13:40 Breakout Round 2: discussion\n13:55 Closing reflection'});
 section.append(node('p','gcc203-hint','Write at least two timed activities. For example: 13:10 Welcome, 13:20 Group discussion. Use your school time zone. Separators such as |, – or : are optional; the first activity need not start at the exact session time.'));
 add('description','Objectives and preparation details *','textarea',{rows:3,maxLength:1200,required:true,placeholder:'Explain what students do, language level and preparation needed.'});
 const platform=choose('platform','Video meeting platform *',PLATFORMS_V203);
 const hint=node('p','gcc203-hint');section.append(hint);
 const breakoutOption=choose('platform-option','Platform-specific breakout setup *',[['standard','Standard host controls']]);
 const choices={
  zoom:[['manual','Assign in Zoom during meeting'],['preassign','Zoom pre-assignment (signed-in emails required)'],['standard','Standard Zoom breakout controls']],
  google_meet:[['workspace','Eligible Workspace host uses Meet breakout rooms'],['standard','Meet main room only; no breakout']],
  teams:[['organizer','Teams organizer manages breakout rooms'],['manager','Appointed breakout rooms manager'],['standard','Teams main meeting only']],
  webex:[['enabled','Webex account supports breakout sessions'],['standard','No breakout rooms']],
  other:[['verified','Platform breakout features verified'],['standard','Whole-group meeting only']]
 };
 const updateHint=()=>{
  hint.textContent=hints[platform.value]||'';
  breakoutOption.replaceChildren();
  for(const [value,label] of choices[platform.value]||choices.other){const o=node('option','',label);o.value=value;breakoutOption.append(o);}
  const mode=section.querySelector('#'+prefix+'-breakout');
  if(mode){const self=mode.querySelector('option[value="self_select"]');
   if(self)self.disabled=platform.value!=='zoom';
   if(self&&self.disabled&&mode.value==='self_select')mode.value='manual';
  }
 };
 platform.addEventListener('change',updateHint);
 updateHint();
 add('meeting','Meeting link (optional, only shown after room access verification)','input',{type:'url',maxLength:600,placeholder:'https://...'});
 choose('breakout','Breakout room assignment *',[
 ['manual','Host manually assigns'],['automatic','Platform assigns automatically'],
 ['self_select','Participants choose (if supported)'],['none','Whole-group only, no breakouts']
 ]);
 add('breakoutnotes','Breakout room instructions (optional)','textarea',{rows:2,maxLength:600});
 add('deadline','Registration deadline in host local time *','input',{type:'datetime-local',required:true});
 updateHint();section.append(node('h3','','Optional flyer'));
 const flyer=add('flyerfile','Upload a JPG, PNG or WebP flyer (up to 24 MB original)','input',{type:'file'});
 flyer.accept='image/jpeg,image/png,image/webp';
 const flyerMessage=node('p','gcc203-hint gcc207-flyer-status','Images are compressed to WebP on your device before uploading (target 500 KB, maximum 800 KB).');
 flyerMessage.setAttribute('role','status');flyer.setAttribute('aria-describedby',prefix+'-flyer-status');
 flyerMessage.id=prefix+'-flyer-status';
 const preview=node('img','gcc207-flyer-preview');preview.alt='Optimized WebP flyer preview';preview.hidden=true;
 flyer.addEventListener('change',async()=>{
  const original=flyer.files?.[0];
  preview.hidden=true;preview.removeAttribute('src');
  flyer.removeAttribute('aria-invalid');flyerMessage.classList.remove('gcc207-flyer-error');
  if(!original){flyerMessage.textContent='No flyer selected (optional).';return;}
  flyerMessage.textContent='Optimizing flyer image on this device…';
  try{
   const result=await prepareFlyerOnceV207(original);
   if(flyer.files?.[0]!==original)return;
   flyerMessage.textContent=describeFlyerV207(result);
   const localUrl=URL.createObjectURL(result.blob);
   preview.onload=()=>URL.revokeObjectURL(localUrl);
   preview.onerror=()=>{URL.revokeObjectURL(localUrl);preview.hidden=true;};
   preview.src=localUrl;preview.hidden=false;
  }catch(error){
   if(flyer.files?.[0]!==original)return;
   flyerMessage.textContent=error.message||'Could not optimize the flyer. Choose another image.';
   flyerMessage.classList.add('gcc207-flyer-error');
   flyer.setAttribute('aria-invalid','true');
  }
 });
 section.append(flyerMessage,preview);
 root.append(section);return section;
}
export const TYPE_LABEL_V203=id=>SESSION_TYPES_V203.find(x=>x[0]===id)?.[1]||'International Exchange';
export const PLATFORM_LABEL_V203=id=>PLATFORMS_V203.find(x=>x[0]===id)?.[1]||'Online meeting';
const minutes=t=>{const m=/^(\d\d):(\d\d)$/.exec(t||'');return m&&+m[1]<24&&+m[2]<60?+m[1]*60+ +m[2]:null;};
export function parseFlowV203(value,start,end){
 const rows=String(value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(rows.length<2||rows.length>20)throw Error('Please describe 2–20 timed agenda activities.');
 const a=minutes(start),b=minutes(end);
 if(a===null||b===null||b<=a)throw Error('Use a valid same-day start and end time.');
 let previous=-1;
 return rows.map(row=>{
  const match=/^(?:[-*•・]\s*)?(\d{1,2}:\d{2})\s*(?:[|｜:：–—-]\s*)?(.+)$/.exec(row);
  if(!match)throw Error('Please begin each agenda line with a time, such as 13:10 Welcome.');
  const m=minutes(match[1].padStart(5,'0'));
  const activity=match[2].trim();
  if(m===null||m<a||m>b)throw Error('Please keep agenda times within the session hours.');
  if(m<=previous)throw Error('Please list agenda activities in time order.');
  if(activity.length<2||activity.length>250)throw Error('Please write a brief activity after each time.');
  previous=m;
  return {time:match[1].padStart(5,'0'),activity};
 });
}
const safeUrl=value=>{if(!value)return '';try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.href;}catch{throw Error('Please use a valid HTTPS meeting link.');}};
export function readPlanV203(root,prefix,slot,deadlineIso,maxParticipants){
 const value=k=>root.querySelector('#'+prefix+'-'+k)?.value?.trim()||'';
 const min=Number(value('minage')),max=Number(value('maxage')),preferred=Number(maxParticipants);
 if(!Number.isInteger(min)||!Number.isInteger(max)||min<5||max>30||min>max)throw Error('Accepted ages must be between 5 and 30, with minimum no greater than maximum.');
 if(!Number.isInteger(preferred)||preferred<1||preferred>2000)throw Error('Enter the maximum total participants, including the host school (1–2000).');
 if(!deadlineIso||Date.parse(deadlineIso)<=Date.now()||Date.parse(deadlineIso)>Date.parse(slot.startsAt))throw Error('Registration deadline must be in the future and no later than the session start.');
 if(value('description').length<25)throw Error('Write at least 25 characters describing objectives and preparations.');
 const d={session_type:value('type'),preferred_students:preferred,max_participants:preferred,preferred_countries:value('countries'),
  min_age:min,max_age:max,accepted_grades:value('grades'),flow:parseFlowV203(value('flow'),slot.startTime,slot.endTime),
  description:value('description'),platform:value('platform'),platform_option:value('platform-option'),meeting_url:safeUrl(value('meeting')),
  breakout_mode:value('breakout'),breakout_notes:value('breakoutnotes'),registration_closes_at:deadlineIso,
  flyer_url:''};
 if(!SESSION_TYPES_V203.some(x=>x[0]===d.session_type)||!PLATFORMS_V203.some(x=>x[0]===d.platform))throw Error('Choose a valid session type and platform.');
 if(JSON.stringify(d).length>12000)throw Error('Session plan is too long.');
 return d;
}
// Empty legacy plans often contain only a maximum headcount. The room chart
// already shows attendance, so omit a section made entirely of placeholders.
export function hasUsefulSessionDetailsV203(details){
 if(!details||typeof details!=='object'||Array.isArray(details))return false;
 const fields=['session_type','platform','platform_option','description','flyer_url',
  'meeting_url','breakout_mode','breakout_notes','accepted_grades',
  'preferred_countries','registration_closes_at'];
 return fields.some(key=>details[key]!==undefined&&details[key]!==null&&String(details[key]).trim()!=='')
  ||(Array.isArray(details.flow)&&details.flow.length>0)
  ||(Number(details.min_age)>0&&Number(details.max_age)>0);
}
export function renderSessionDetailsV203(root,details,{privateLink=false}={}){
 const d=details&&typeof details==='object'?details:{};
 if(d.flyer_url){try{const u=new URL(d.flyer_url);if(u.protocol==='https:'){const img=node('img','gcc203-flyer');img.src=u.href;img.alt='Session flyer';img.loading='lazy';root.append(img);}}catch{/* older data */}}
 const meta=node('div','gcc203-metadata');
 const add=(title,value)=>{if(value!==undefined&&value!==null&&value!==''){const row=node('div','gcc203-meta');row.append(node('strong','',title),node('span','',value));meta.append(row);}};
 add('Format',d.session_type?TYPE_LABEL_V203(d.session_type):'Not specified');
 add('Platform',d.platform?PLATFORM_LABEL_V203(d.platform):'Not specified');
 add('Platform controls',d.platform_option);
 add('Maximum participants (including host school)',d.max_participants||d.preferred_students);
 add('Accepted ages',d.min_age&&d.max_age?d.min_age+'–'+d.max_age:'');
 add('Grades',d.accepted_grades);
 add('Preferred countries',d.preferred_countries);
 add('Registration closes',d.registration_closes_at?new Date(d.registration_closes_at).toLocaleString():'');
 root.append(meta);
 if(d.description)root.append(node('p','gcc203-description',d.description));
 if(Array.isArray(d.flow)&&d.flow.length){
  const section=node('section','gcc203-flow');section.append(node('h3','','Session flow'));
  for(const item of d.flow){const row=node('div','gcc203-flow-row');row.append(node('time','',item.time),node('p','',item.activity));section.append(row);}root.append(section);
 }else root.append(node('p','gcc203-missing','Detailed session flow has not yet been entered by the host.'));
 if(d.breakout_mode)root.append(node('p','gcc203-description','Breakout setup: '+d.breakout_mode.replace('_',' ')+(d.breakout_notes?' · '+d.breakout_notes:'')));
 if(privateLink&&d.meeting_url){try{const u=new URL(d.meeting_url);if(u.protocol==='https:'){const a=node('a','gcc203-join','Join '+PLATFORM_LABEL_V203(d.platform));a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';root.append(a);}}catch{/* ignored */}}
}
