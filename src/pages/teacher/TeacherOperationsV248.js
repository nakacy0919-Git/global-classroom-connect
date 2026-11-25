import {teacherOperationsV248} from '../../services/teacherOperationsV248.js';
import {teacherApply} from '../../services/teacherSelfService.js';
import {operationsHashV248,parseRosterV248} from '../../lib/teacherOperationsV248.js';
import '../../styles/teacherOperationsV248.css';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const label=(title,input)=>{const n=el('label','',title);n.append(input);return n;};
const number=(value,min,max)=>{const n=el('input');n.type='number';n.min=String(min);n.max=String(max);n.value=String(value);n.required=true;return n;};
const integer=n=>{if(!n.checkValidity()||!Number.isInteger(Number(n.value)))throw Error('Check the number fields.');return Number(n.value);};
const select=(choices,value='')=>{const n=el('select');for(const [v,t] of choices){const o=el('option','',t);o.value=String(v);n.append(o);}n.value=String(value);return n;};
const panel=title=>{const p=el('section','gcc248-panel');p.append(el('h3','',title));return p;};
const flag=code=>/^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌐';
const stages=[['Invite teachers','Share the registration form'],['Review requests','Accept, decline and message'],['Registrations','Student lists and withdrawals'],['Arrange rooms','Fixed pairs and facilitators'],['Publish & share','Zoom and permanent room chart']];
export async function mountTeacherOperationsV248(root,params,{rpc=teacherOperationsV248,apply=teacherApply}={}){
 if(!root)return;
 root.replaceChildren();const status=el('p','gcc248-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const body=el('div','gcc248-body');root.append(status,body);
 if(!params){status.textContent='Invalid session link.';return;}
 let state=null,busy=false,dirty=false,stage=params.tab==='chart'?4:0,participantStage=params.tab==='chart'?'chart':'roster',threadId='';
 const say=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
 const button=(text,action,primary=false)=>{const b=el('button',primary?'gct-primary':'gct-secondary',text);b.type='button';b.onclick=async()=>{
  if(busy)return;busy=true;b.disabled=true;say('');
  try{await action();}catch(e){say(e.message||'Unable to complete this action.',true);}
  finally{busy=false;b.disabled=false;}
 };return b;};
 const discard=()=>!dirty||confirm('Discard unsaved changes on this screen?');
 const load=async()=>{state=await rpc(params.id);if(root.isConnected)render();};
 const mutate=async(action,data={},message='Saved successfully.')=>{state=await rpc(params.id,action,{...data,revision:state.revision});dirty=false;if(root.isConnected)render();say(message);};
 const linkFor=tab=>location.origin+location.pathname+operationsHashV248(params.id,tab);
 const share=(title,tab)=>{
  const box=el('div','gcc248-share'),input=el('input');input.readOnly=true;input.value=linkFor(tab);input.setAttribute('aria-label',title);
  box.append(label(title,input),button('Copy link',async()=>{try{await navigator.clipboard.writeText(input.value);say('Link copied.');}catch{input.focus();input.select();say('Select and copy the link manually.');}}));return box;
 };
 function navigation(s){
  const wrap=el('div','gcc249-steps');
  if(s.role==='host'){
   stages.forEach(([name,desc],i)=>{const b=button('',()=>{if(!discard())return;dirty=false;stage=i;render();});b.className='gcc249-step';b.setAttribute('aria-current',stage===i?'step':'false');
    b.append(el('span','gcc249-step-no',String(i+1).padStart(2,'0')),el('strong','',name),el('small','',desc));wrap.append(b);});
  }else{
   for(const [key,name] of [['roster','My registration'],['messages','Private messages'],['chart','Room chart & Zoom']]){
    const b=button(name,()=>{if(!discard())return;dirty=false;participantStage=key;render();});b.className='gcc249-step';b.setAttribute('aria-current',participantStage===key?'step':'false');wrap.append(b);
   }
  }return wrap;
 }
 function threads(s,host){
  const p=panel('Private teacher messages');
  p.append(el('p','','Messages are visible only to the host and the selected approved partner. Do not include sensitive student information. Refresh to check for replies.'));
  const approved=host?(s.requests||[]).filter(r=>r.status==='approved'&&!r.reconfirmation):[];
  if(host&&!approved.length){p.append(el('p','','No approved partner yet. Accept a request first.'));return p;}
  const choices=approved.map(r=>[r.id,r.school+' · '+r.teacher]);
  if(host){if(!approved.some(r=>r.id===threadId))threadId=approved[0].id;const picker=select(choices,threadId);picker.onchange=()=>{if(!discard()){picker.value=threadId;return;}dirty=false;threadId=picker.value;render();};p.append(label('Partner teacher',picker));}
  const req=host?threadId:s.request_id;
  const list=el('div','gcc249-thread');
  const messages=(s.messages||[]).filter(m=>m.request_id===req);
  if(!messages.length)list.append(el('p','','No messages yet.'));
  for(const m of messages){
   const item=el('article','gcc249-message'+(m.sender_id===s.teacher_id?' mine':''));
   item.append(el('strong','',m.sender),el('small','',new Date(m.created_at).toLocaleString()),el('p','',m.body));
   if(m.registration_link){const a=el('a','gct-secondary','Open registration form');a.href=operationsHashV248(params.id);item.append(a);}list.append(item);
  }p.append(list);
  const message=el('textarea');message.rows=3;message.maxLength=2000;message.oninput=()=>{dirty=true;};
  p.append(label('Message',message));
  const include=el('input');include.type='checkbox';include.checked=host;include.onchange=()=>{dirty=true;};
  if(host){const l=el('label','gcc249-check','Include registration form link');l.prepend(include);p.append(l);}
  p.append(button('Send message',async()=>{if(!message.value.trim())throw Error('Enter a message.');await mutate('message',{request_id:req,body:message.value.trim(),registration_link:host&&include.checked},'Message sent.');},true));
  return p;
 }
 function requests(s){
  const p=panel('Review participation requests');
  if(!s.requests?.length)p.append(el('p','','No participation requests yet.'));
  const cards=el('div','gcc249-school-grid');
  for(const r of s.requests||[]){
   const row=el('article','gcc248-request');row.append(el('strong','',r.school),el('span','',r.teacher),el('span','gcc249-state',r.students+' students · '+r.status+(r.reconfirmation?' · Awaiting schedule confirmation':'')));
   if(r.status==='pending'){
    const actions=el('div','gcc248-actions');
    for(const [decision,caption] of [['approved','Accept'],['declined','Deny']])actions.append(button(caption,async()=>{
     if(!discard()||!confirm(caption+' this participation request?'))return;threadId=r.id;
     await mutate('review',{request_id:r.id,decision},decision==='approved'?'Accepted. Registration invitation sent in GCC.':'Request declined.');
    },decision==='approved'));row.append(actions);
   }else if(r.status==='approved'&&!r.reconfirmation)row.append(button('Message teacher',()=>{if(!discard())return;dirty=false;threadId=r.id;render();body.querySelector('.gcc249-thread')?.scrollIntoView({block:'center'});}));
   cards.append(row);
  }p.append(cards);return p;
 }
 function rosters(s,host){
  const p=panel(host?'Student registration & editing':'Teacher Mode · My student registration');
  p.append(el('p','','Use student display names only. Save a draft or confirm your final registration. Edit existing rows to keep student identities and fixed pairs. A complete finalized edit automatically updates an already published chart.'));
  const cards=el('div','gcc249-school-grid');
  for(const m of s.members||[]){
   const section=el('article','gcc248-roster');
   section.append(el('h4','',flag(m.country)+' '+m.school),el('p','gcc248-meta',m.teacher+' · '+m.students.length+' / '+m.expected+' registered · '+(m.finalized?'Final registration complete':'Draft')));
   const rows=el('div','gcc249-student-rows');
   const addRow=(st={})=>{
    const row=el('div','gcc249-student-row');if(st.id)row.dataset.studentId=st.id;
    const name=el('input');name.value=st.name||'';name.maxLength=100;name.placeholder='Student name';name.setAttribute('aria-label','Student name');
    const grade=el('input');grade.value=st.grade||'';grade.maxLength=30;grade.placeholder='Grade';grade.setAttribute('aria-label','Grade');
    name.oninput=grade.oninput=()=>{dirty=true;};
    const remove=button('×',()=>{row.remove();dirty=true;});remove.setAttribute('aria-label','Remove student row');
    row.append(name,grade,remove);rows.append(row);
   };
   for(const st of m.students)addRow(st);
   if(!m.students.length)addRow();
   section.append(rows,button('+ Add student',()=>{if(rows.children.length>=m.expected)throw Error('Approved allocation reached.');addRow();dirty=true;}));
   const bulk=el('details');bulk.append(el('summary','','Paste a class list'));const paste=el('textarea');paste.rows=3;paste.placeholder='One name per line; optional tab-separated grade';paste.oninput=()=>{dirty=true;};
   bulk.append(paste,button('Append names',()=>{const newStudents=parseRosterV248(paste.value,m.expected);const blank=[...rows.children].filter(row=>!row.dataset.studentId&&!row.querySelector('input').value.trim());if(rows.children.length-blank.length+newStudents.length>m.expected)throw Error('Approved allocation reached.');blank.forEach(row=>row.remove());for(const st of newStudents)addRow(st);paste.value='';dirty=true;}));section.append(bulk);
   const collect=()=>[...rows.children].map(row=>{const inputs=row.querySelectorAll('input');const name=inputs[0].value.trim(),grade=inputs[1].value.trim();if(!name&&grade)throw Error('Student name is required.');return {id:row.dataset.studentId||undefined,name,grade};}).filter(x=>x.name);
   const helpers=el('div','gcc249-student-rows');
   const addHelper=(person={})=>{const row=el('div','gcc249-helper-row');if(person.id)row.dataset.helperId=person.id;
    const name=el('input');name.value=person.name||'';name.maxLength=100;name.placeholder='Adult facilitator display name';name.setAttribute('aria-label','Adult facilitator display name');name.oninput=()=>{dirty=true;};
    const remove=button('×',()=>{row.remove();dirty=true;});remove.setAttribute('aria-label','Remove facilitator');row.append(name,remove);helpers.append(row);};
   for(const person of m.helpers||[])addHelper(person);
   section.append(el('h4','','Additional adult facilitators'),el('p','','Optional: register adult helpers from your school. The host assigns them to rooms.'),helpers,button('+ Add facilitator',()=>{if(helpers.children.length>=100)throw Error('Maximum 100 helpers per class.');addHelper();dirty=true;}));
   const collectHelpers=()=>[...helpers.children].map(row=>({id:row.dataset.helperId||undefined,name:row.querySelector('input').value.trim()})).filter(x=>x.name);
   const actions=el('div','gcc248-actions');
   for(const [finalized,caption] of [[false,'Save draft'],[true,'Confirm final registration']])actions.append(button(caption,async()=>{
    const students=collect();if(students.length>m.expected||finalized&&!students.length)throw Error('A final list must have 1 to '+m.expected+' students.');
    if(finalized&&students.length<m.expected&&!confirm('Finalize with '+students.length+' students and release '+(m.expected-students.length)+' reserved places?'))return;
    if(!confirm(caption+' for '+m.school+'? Unsaved changes in other class cards will be discarded.'))return;
    await mutate('save_roster',{teacher_id:m.teacher_id,students,helpers:collectHelpers(),finalized},finalized?'Final registration saved.':'Draft saved.');
   },finalized));section.append(actions);
   if(host&&!m.is_host){const removal=el('details');removal.append(el('summary','','Participation withdrawal'));
    for(const [scope,value,caption] of [['teacher',m.teacher_id,'Remove this class'],['school',m.school_id,'Remove all classes from this school'],['country',m.country,'Remove all guest classes from '+m.country]])if(value)removal.append(button(caption,async()=>{if(!discard()||!confirm(caption+'? This will remove the selected guest registration(s), release their places and update any complete room chart.'))return;await mutate('withdraw',{scope,value},'Withdrawal saved. Room chart updated if all remaining registrations are final.');}));
    section.append(removal);
   }cards.append(section);
  }p.append(cards);
  if(host){const w=panel('Withdraw a participating class');
   const choices=(s.requests||[]).filter(r=>r.status==='approved').map(r=>[r.teacher_id,r.school+' · '+r.teacher]);if(choices.length){const picker=select(choices,choices[0][0]);w.append(label('Approved class (including unconfirmed schedule)',picker),button('Withdraw selected class',async()=>{if(!discard()||!confirm('Withdraw the selected approved class?'))return;await mutate('withdraw',{scope:'teacher',value:picker.value},'Class withdrawn.');}));}else w.append(el('p','','No guest classes to withdraw.'));p.append(w);}
  return p;
 }
 function roomSetup(s){
  const p=panel('Arrange breakout rooms');
  p.append(el('p','',s.ready?'All approved registrations are final.':'Complete every approved class registration before arranging rooms.'));
  const count=number(s.room_count||1,1,100);count.oninput=()=>{dirty=true;};
  p.append(label('Number of rooms',count),button('Arrange / rearrange rooms',async()=>{if(!confirm('Rebalance the rooms while preserving fixed pairs and existing placements where possible?'))return;await mutate('arrange',{room_count:integer(count)},'Room arrangement saved.');},true));
  if(s.plan_stale)p.append(el('p','gcc248-warning','Session or participation changed. Rebuild the chart before sharing.'));return p;
 }
 function fixedPairs(s){
  const p=panel('Fixed pairs');p.append(el('p','','Keep two students together through room changes. A student may belong to one fixed pair.'));
  const people=new Map((s.people||[]).map(x=>[x.id,x]));
  const pairs=(s.pairs||[]).filter(pair=>people.has(pair[0])&&people.has(pair[1])).map(x=>[...x]);
  const list=el('div','gcc249-pairs');
  const refresh=()=>{list.replaceChildren();for(const [i,pair] of pairs.entries()){const r=el('div','gcc249-pair');r.append(el('span','',people.get(pair[0]).name+' · '+people.get(pair[0]).school+' ↔ '+people.get(pair[1]).name+' · '+people.get(pair[1]).school),button('Remove pair',()=>{pairs.splice(i,1);dirty=true;refresh();}));list.append(r);}};
  refresh();const choices=[['','Select student'],...[...people.values()].map(x=>[x.id,x.name+' · '+x.school])];const one=select(choices),two=select(choices);
  const fields=el('div','gcc249-two');fields.append(label('Student 1',one),label('Student 2',two));
  p.append(list,fields,button('Add fixed pair',()=>{if(!one.value||!two.value||one.value===two.value||pairs.flat().includes(one.value)||pairs.flat().includes(two.value))throw Error('Choose two different, unpaired students.');pairs.push([one.value,two.value]);dirty=true;refresh();}),button('Save fixed pairs',async()=>{if(!confirm('Save fixed pairs? Existing rooms will be rebalanced if a complete chart exists.'))return;await mutate('save_pairs',{pairs},'Fixed pairs saved.');},true));return p;
 }
 function facilitators(s){
  const p=panel('Facilitator placement');
  p.append(el('p','','Assign participating teachers and registered adult helpers to rooms. Several facilitators may share one room.'));
  const byTeacher=new Map((s.facilitators||[]).map(x=>[x.teacher_id,x.room])),choices=[['','Unassigned'],...Array.from({length:s.room_count||1},(_,i)=>[i+1,'Room '+(i+1)])],items=[];
  for(const m of s.facilitator_pool||(s.members||[]).map(m=>({id:m.teacher_id,name:m.teacher,school:m.school,country:m.country}))){const picker=select(choices,byTeacher.get(m.id)||'');picker.onchange=()=>{dirty=true;};items.push({id:m.id,picker});p.append(label(flag(m.country)+' '+m.name+' · '+m.school,picker));}
  p.append(button('Save facilitator placements',async()=>{if(!confirm('Save facilitator assignments?'))return;await mutate('save_facilitators',{facilitators:items.filter(x=>x.picker.value).map(x=>({teacher_id:x.id,room:Number(x.picker.value)}))},'Facilitators saved.');},true));return p;
 }
 function chart(s,edit){
  const p=panel(edit?'Review room assignments':'Breakout room chart');
  p.append(el('p','gcc248-meta',s.published?'Published · same permanent URL':s.chart?'Draft · host only':'No current room chart.'));
  if(!s.chart)return p;
  const grid=el('div','gcc248-room-grid'),selects=new Map(),pairMap=new Map();
  for(const pair of s.pairs||[]){pairMap.set(pair[0],pair[1]);pairMap.set(pair[1],pair[0]);}
  const sizes=Array.from({length:s.room_count},(_,i)=>s.chart.filter(x=>x.room===i+1).length);
  if(Math.max(...sizes)-Math.min(...sizes)>1)p.append(el('p','gcc248-warning','Room sizes differ by more than one. Check fixed-pair constraints and room balance.'));
  for(let room=1;room<=s.room_count;room++){
   const box=el('section','gcc248-room'),students=s.chart.filter(x=>x.room===room);box.append(el('h4','','Room '+room+' · '+students.length+' students'));
   for(const f of (s.facilitators||[]).filter(x=>x.room===room))box.append(el('p','gcc249-facilitator','Facilitator: '+f.teacher+' · '+f.school));
   for(const st of students){const row=el('div','gcc248-person');row.append(el('strong','',st.name+(st.grade?' · '+st.grade:'')),el('span','',flag(st.country)+' '+st.school));
    if(edit){
     const picker=select(Array.from({length:s.room_count},(_,i)=>[i+1,'Room '+(i+1)]),st.room);
     picker.setAttribute('aria-label','Room for '+st.name);selects.set(st.student_id,picker);
     if(pairMap.has(st.student_id))row.append(el('span','gcc249-state','Fixed pair'));
     picker.onchange=()=>{dirty=true;const paired=selects.get(pairMap.get(st.student_id));if(paired)paired.value=picker.value;};row.append(picker);
    }box.append(row);
   }grid.append(box);
  }p.append(grid);
  if(edit)p.append(button('Save room adjustments',async()=>{if(!confirm('Save room assignments? Fixed pairs will remain together.'))return;await mutate('save_plan',{plan:[...selects].map(([student_id,picker])=>({student_id,room:Number(picker.value)}))},'Room assignments saved.');},true));return p;
 }
 function publication(s,host){
  const p=panel(host?'Publish & share':'Meeting link');
  if(host){
   const zoom=el('input');zoom.type='url';zoom.maxLength=2000;zoom.value=s.zoom_url||'';zoom.placeholder='https://zoom.us/j/...';zoom.oninput=()=>{dirty=true;};
   p.append(label('Zoom meeting link',zoom),button('Save Zoom link',async()=>{if(!zoom.value.trim())throw Error('Enter a Zoom meeting link.');await mutate('save_zoom',{zoom_url:zoom.value.trim()},'Zoom link saved.');},true),
    share('Permanent room chart / Teacher Mode','chart'),button('Publish room chart',async()=>{if(dirty)throw Error('Save your changes first.');if(!confirm('Publish the current room chart and Zoom link to approved participants?'))return;await mutate('publish',{},'Published. The existing share link is unchanged.');},true));
  }
  if(s.zoom_url&&s.published){
   try{const u=new URL(s.zoom_url);if(u.protocol==='https:'&&(u.hostname==='zoom.us'||u.hostname.endsWith('.zoom.us'))){const a=el('a','gct-primary','Join Zoom meeting');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';p.append(a);}}catch{}
  }else if(!host)p.append(el('p','','The host has not published the meeting link yet.'));
  return p;
 }
 function render(){
  body.replaceChildren();const s=state,host=s.role==='host';
  const header=el('header','gcc249-header');header.append(el('span','gcc249-kicker',host?'HOST WORKSPACE':'TEACHER MODE'),el('h2','gcc248-title',s.title||'International exchange'));
  const date=el('p','gcc248-meta');try{date.textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:s.timezone}).format(new Date(s.starts_at))+' · '+s.timezone;}catch{date.textContent='Check session date and time';}
  header.append(date,button('Refresh',async()=>{if(!discard())return;dirty=false;await load();}));body.append(header);
  if(s.role==='applicant'){
   const p=panel('Request participation');
   p.append(el('p','',s.request_status==='none'?'Request a place for your class. Once accepted, return to this link for student registration.':'Request status: '+s.request_status+'. Return after acceptance and schedule confirmation.'));
   if(s.can_apply){const count=number(1,1,500),min=number(12,3,99),max=number(18,3,99),message=el('textarea');message.maxLength=500;message.rows=2;
    const fields=el('div','gcc248-fields');fields.append(label('Number of students',count),label('Youngest age',min),label('Oldest age',max));p.append(fields,label('Message to host (optional)',message),button('Send join request',async()=>{const a=integer(min),b=integer(max);if(a>b)throw Error('Check the age range.');await apply(params.id,message.value.trim(),integer(count),a,b);await load();say('Request sent.');},true));}
   body.append(p);return;
  }
  body.append(navigation(s));
  if(host){
   const stats=el('div','gcc249-stats');
   for(const [v,t] of [[(s.requests||[]).filter(r=>r.status==='pending').length,'Pending requests'],[(s.members||[]).length,'Participating classes'],[(s.members||[]).reduce((n,m)=>n+m.students.length,0),'Registered students'],[s.room_count||0,'Rooms']]){
    const card=el('div','gcc249-stat');card.append(el('strong','',String(v)),el('span','',t));stats.append(card);}
   body.append(stats,el('div','gcc249-stage-heading','STEP '+(stage+1)+' OF '+stages.length+' · '+stages[stage][0]));
   if(stage===0){const p=panel('Invite teachers');p.append(el('p','','Your session title and schedule have already been registered. Share this link with teachers. They sign in, apply, and complete student registration after acceptance.'),share('Registration form','register'));body.append(p);}
   if(stage===1)body.append(requests(s),threads(s,true));
   if(stage===2)body.append(rosters(s,true));
   if(stage===3)body.append(roomSetup(s),fixedPairs(s),facilitators(s),chart(s,true));
   if(stage===4)body.append(publication(s,true),chart(s,false));
   const footer=el('footer','gcc249-footer');if(stage>0)footer.append(button('← Back',()=>{if(!discard())return;dirty=false;stage--;render();}));if(stage<stages.length-1)footer.append(button('Next: '+stages[stage+1][0]+' →',()=>{if(!discard())return;dirty=false;stage++;render();},true));body.append(footer);
  }else if(participantStage==='roster')body.append(rosters(s,false));
  else if(participantStage==='messages')body.append(threads(s,false));
  else body.append(publication(s,false),chart(s,false));
 }
 try{say('Loading your session…');await load();say('');}catch(e){say(e.code==='PGRST202'?'Session operations are not enabled on this server yet.':e.message||'Unable to load session.',true);}
}
