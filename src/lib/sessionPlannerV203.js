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
 add('preferred','Preferred students *','input',{type:'number',min:1,max:2000,value:20,required:true});
 add('countries','Preferred partner countries (optional)','input',{maxLength:200,placeholder:'Any, or Japan, Korea, Philippines'});
 add('minage','Minimum acceptable age *','input',{type:'number',min:5,max:30,value:12,required:true});
 add('maxage','Maximum acceptable age *','input',{type:'number',min:5,max:30,value:18,required:true});
 add('grades','Accepted grades (optional)','input',{maxLength:100,placeholder:'Grades 7–12'});
 add('flow','Detailed schedule * (HH:MM | activity, one line per stage)','textarea',{rows:6,maxLength:4000,required:true,placeholder:'13:10 | Welcome and goals\n13:20 | Breakout Round 1: introductions\n13:40 | Breakout Round 2: discussion\n13:55 | Closing reflection'});
 section.append(node('p','gcc203-hint','At least two timed activities, in order, covering the start and ending period of this session. Times use the session local time zone.'));
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
 add('flyerfile','Upload a JPG, PNG or WebP flyer (up to 3 MB)','input',{type:'file'});
 root.append(section);return section;
}
export const TYPE_LABEL_V203=id=>SESSION_TYPES_V203.find(x=>x[0]===id)?.[1]||'International Exchange';
export const PLATFORM_LABEL_V203=id=>PLATFORMS_V203.find(x=>x[0]===id)?.[1]||'Online meeting';
const minutes=t=>{const m=/^(\d\d):(\d\d)$/.exec(t||'');return m&&+m[1]<24&&+m[2]<60?+m[1]*60+ +m[2]:null;};
export function parseFlowV203(value,start,end){
 const rows=String(value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(rows.length<2||rows.length>20)throw Error('A session flow of 2–20 timed stages is required.');
 const a=minutes(start),b=minutes(end);if(a===null||b===null||b<=a)throw Error('Use start and end times on the same day.');
 let previous=-1;
 const stages=rows.map(row=>{
  const match=/^(\d{2}:\d{2})\s*[|｜]\s*(.{5,250})$/.exec(row);
  if(!match)throw Error('Each session flow line must be HH:MM | description (5+ characters).');
  const m=minutes(match[1]);
  if(m===null||m<a||m>=b||m<=previous)throw Error('Agenda times must be ordered within the session hours.');
  previous=m;return {time:match[1],activity:match[2].trim()};
 });
 if(minutes(stages[0].time)!==a)throw Error('The agenda must begin at the session start time.');
 if(b-previous>25)throw Error('Add a closing activity within 25 minutes of the end.');
 return stages;
}
const safeUrl=value=>{if(!value)return '';try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.href;}catch{throw Error('Please use a valid HTTPS meeting link.');}};
export function readPlanV203(root,prefix,slot,deadlineIso){
 const value=k=>root.querySelector('#'+prefix+'-'+k)?.value?.trim()||'';
 const min=Number(value('minage')),max=Number(value('maxage')),preferred=Number(value('preferred'));
 if(!Number.isInteger(min)||!Number.isInteger(max)||min<5||max>30||min>max)throw Error('Accepted ages must be between 5 and 30, with minimum no greater than maximum.');
 if(!Number.isInteger(preferred)||preferred<1||preferred>2000)throw Error('Enter the desired number of students (1–2000).');
 if(!deadlineIso||Date.parse(deadlineIso)<=Date.now()||Date.parse(deadlineIso)>Date.parse(slot.startsAt))throw Error('Registration deadline must be in the future and no later than the session start.');
 if(value('description').length<25)throw Error('Write at least 25 characters describing objectives and preparations.');
 const d={session_type:value('type'),preferred_students:preferred,preferred_countries:value('countries'),
  min_age:min,max_age:max,accepted_grades:value('grades'),flow:parseFlowV203(value('flow'),slot.startTime,slot.endTime),
  description:value('description'),platform:value('platform'),platform_option:value('platform-option'),meeting_url:safeUrl(value('meeting')),
  breakout_mode:value('breakout'),breakout_notes:value('breakoutnotes'),registration_closes_at:deadlineIso,
  flyer_url:''};
 if(!SESSION_TYPES_V203.some(x=>x[0]===d.session_type)||!PLATFORMS_V203.some(x=>x[0]===d.platform))throw Error('Choose a valid session type and platform.');
 if(JSON.stringify(d).length>12000)throw Error('Session plan is too long.');
 return d;
}
export function renderSessionDetailsV203(root,details,{privateLink=false}={}){
 const d=details&&typeof details==='object'?details:{};
 if(d.flyer_url){try{const u=new URL(d.flyer_url);if(u.protocol==='https:'){const img=node('img','gcc203-flyer');img.src=u.href;img.alt='Session flyer';img.loading='lazy';root.append(img);}}catch{/* older data */}}
 const meta=node('div','gcc203-metadata');
 const add=(title,value)=>{if(value!==undefined&&value!==null&&value!==''){const row=node('div','gcc203-meta');row.append(node('strong','',title),node('span','',value));meta.append(row);}};
 add('Format',d.session_type?TYPE_LABEL_V203(d.session_type):'Not specified');
 add('Platform',d.platform?PLATFORM_LABEL_V203(d.platform):'Not specified');
 add('Platform controls',d.platform_option);
 add('Desired participants',d.preferred_students);
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
