import {teacherOperationsV248} from '../../services/teacherOperationsV248.js';
import {teacherApply,teacherReview} from '../../services/teacherSelfService.js';
import {operationsHashV248,parseRosterV248,rosterTextV248} from '../../lib/teacherOperationsV248.js';
import '../../styles/teacherOperationsV248.css';
const node=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const label=(title,input)=>{const n=node('label','',title);n.append(input);return n;};
const number=(value,min,max)=>{const n=node('input');n.type='number';n.min=String(min);n.max=String(max);n.value=String(value);n.required=true;return n;};
const integer=n=>{if(!n.checkValidity()||!Number.isInteger(Number(n.value)))throw Error('Check the number fields.');return Number(n.value);};
const panel=(title)=>{const p=node('section','gcc248-panel');p.append(node('h3','',title));return p;};
export async function mountTeacherOperationsV248(root,params,{rpc=teacherOperationsV248,apply=teacherApply,review=teacherReview}={}){
 if(!root)return;
 root.replaceChildren();const status=node('p','gcc248-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const body=node('div','gcc248-body');root.append(status,body);
 if(!params){status.textContent='Invalid session link.';return;}
 let state=null,busy=false,dirty=false;
 const say=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
 const button=(text,action,primary=false)=>{const b=node('button',primary?'gct-primary':'gct-secondary',text);b.type='button';b.onclick=async()=>{
  if(busy)return;busy=true;b.disabled=true;say('');
  try{await action();}catch(e){say(e.message||'Unable to complete this action.',true);}
  finally{busy=false;b.disabled=false;}
 };return b;};
 const load=async()=>{state=await rpc(params.id);if(root.isConnected)render();};
 const mutate=async(action,data={})=>{state=await rpc(params.id,action,{...data,revision:state.revision});dirty=false;if(root.isConnected)render();say('Saved successfully.');};
 const share=(title,tab)=>{
  const box=node('div','gcc248-share'),input=node('input');input.readOnly=true;
  input.value=location.origin+location.pathname+operationsHashV248(params.id,tab);
  input.setAttribute('aria-label',title);
  box.append(label(title,input),button('Copy link',async()=>{
   try{await navigator.clipboard.writeText(input.value);say('Link copied.');}
   catch{input.focus();input.select();say('Select and copy this link manually.');}
  }));return box;
 };
 function render(){
  body.replaceChildren();const s=state,host=s.role==='host';
  body.append(node('h2','gcc248-title',s.title||'International exchange'));
  const date=node('p','gcc248-meta');try{date.textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:s.timezone}).format(new Date(s.starts_at))+' · '+s.timezone;}catch{date.textContent='Check session date and time';}body.append(date);
  body.append(button('Refresh',async()=>{if(dirty&&!confirm('Discard unsaved changes and refresh?'))return;dirty=false;await load();}));
  if(s.role==='applicant'){
   const p=panel('Request participation');
   p.append(node('p','',s.request_status==='none'?'Request a place for your class. After the host approves, return to this link to register student display names.':'Your request status: '+s.request_status+'. Return after approval and any required schedule confirmation.'));
   if(s.can_apply){
    const count=number(1,1,500),min=number(12,3,99),max=number(18,3,99),message=node('textarea');message.maxLength=500;message.rows=2;
    const fields=node('div','gcc248-fields');fields.append(label('Number of students',count),label('Youngest age',min),label('Oldest age',max));p.append(fields,label('Message to host (optional)',message),button('Send join request',async()=>{const a=integer(min),b=integer(max);if(a>b)throw Error('Check the age range.');await apply(params.id,message.value.trim(),integer(count),a,b);await load();say('Request sent. The host must approve before roster registration.');},true));
   }body.append(p);return;
  }
  if(host){
   const links=panel('1 · Share registration and Teacher Mode links');
   links.append(node('p','','Share the registration link with partner teachers. A verified GCC account and host approval are required. The chart link stays the same when you rearrange rooms.'),share('Registration form','register'),share('Teacher Mode / Room chart','chart'));body.append(links);
   const requests=panel('2 · Review participating schools');
   if(!s.requests?.length)requests.append(node('p','','No join requests yet.'));
   for(const r of s.requests||[]){
    const row=node('div','gcc248-request');row.append(node('strong','',r.school+' · '+r.teacher),node('span','',r.students+' students · '+r.status+(r.reconfirmation?' · Awaiting schedule confirmation':'')));
    if(r.status==='pending'){
     const actions=node('div','gcc248-actions');
     for(const [decision,caption] of [['approved','Approve'],['declined','Decline']])actions.append(button(caption,async()=>{if(dirty&&!confirm('Discard unsaved changes to review this request?'))return;if(!confirm(caption+' this participation request?'))return;await review(r.id,decision);dirty=false;await load();say('Request updated.');},decision==='approved'));
     row.append(actions);
    }requests.append(row);
   }body.append(requests);
  }
  const rosterPanel=panel(host?'3 · Student registration & editing':'Teacher Mode · Edit your own class');
  rosterPanel.append(node('p','','Use student display names only (no email addresses, birthdays or sensitive information). One name per line; optional grade after a tab. A saved change invalidates the current room arrangement.'));
  for(const m of s.members||[]){
   const section=node('div','gcc248-roster');section.append(node('h4','',m.school+' · '+m.teacher),node('p','gcc248-meta',m.students.length+' / '+m.expected+' registered'));
   const area=node('textarea');area.rows=5;area.value=rosterTextV248(m.students);area.setAttribute('aria-label','Student list for '+m.school+' '+m.teacher);area.oninput=()=>{dirty=true;};
   section.append(area,button('Save student list',async()=>{
    const students=parseRosterV248(area.value,m.expected);
    if(students.length<m.expected&&!confirm('This list is incomplete. Save it anyway? Rooms cannot be published until all approved places have names.'))return;
    if(dirty&&!confirm('Save this class list? Any unsaved changes in other fields will be discarded. Existing room arrangements will need to be rebuilt.'))return;
    await mutate('save_roster',{teacher_id:m.teacher_id,students});
   },true));rosterPanel.append(section);
  }
  body.append(rosterPanel);
  if(host){
   const rooms=panel('4 · Arrange breakout rooms');const count=number(s.room_count||1,1,100);
   rooms.append(node('p','','Automatic arrangement distributes students from each school across rooms. All approved class lists must be complete. You can adjust individual room assignments before publishing.'),label('Number of rooms',count));
   count.oninput=()=>{dirty=true;};
   rooms.append(button('Arrange / rearrange rooms',async()=>{if(!confirm('Replace the current room arrangement? Unsaved changes will be discarded.'))return;await mutate('arrange',{room_count:integer(count)});},true));
   if(s.plan_stale)rooms.append(node('p','gcc248-warning','Session or participation changed. Arrange rooms again before sharing.'));
   body.append(rooms);
  }
  const chartPanel=panel(host?'5 · Review & publish room chart':'Breakout room chart');
  chartPanel.append(node('p','gcc248-meta',s.published?'Published · shared with approved participating teachers':s.chart?'Draft · only you can see it':'No current published chart. The host must arrange and publish rooms.'));
  if(s.chart){
   const grid=node('div','gcc248-room-grid'),selects=[];
   for(let room=1;room<=s.room_count;room++){
    const box=node('section','gcc248-room');const students=s.chart.filter(p=>p.room===room);box.append(node('h4','','Room '+room+' · '+students.length));
    for(const p of students){
     const row=node('div','gcc248-person');row.append(node('strong','',p.name+(p.grade?' · '+p.grade:'')),node('span','',p.school));
     if(host){
      const select=node('select');select.setAttribute('aria-label','Room for '+p.name+' from '+p.school);
      for(let i=1;i<=s.room_count;i++){const option=node('option','','Room '+i);option.value=String(i);select.append(option);}select.value=String(p.room);
      select.onchange=()=>{dirty=true;};selects.push({p,select});row.append(select);
     }box.append(row);
    }grid.append(box);
   }chartPanel.append(grid);
   if(host){
    const actions=node('div','gcc248-actions');actions.append(button('Save room adjustments',async()=>{if(!confirm('Save room assignments? Other unsaved changes will be discarded.'))return;await mutate('save_plan',{plan:selects.map(({p,select})=>({teacher_id:p.teacher_id,student_no:p.student_no,room:Number(select.value)}))});}),button('Publish room chart',async()=>{if(dirty)throw Error('Save your changes before publishing.');if(!confirm('Publish the current room chart to approved participating teachers?'))return;await mutate('publish');},true));chartPanel.append(actions);
   }
  }
  body.append(chartPanel);
  if(params.tab==='chart')chartPanel.scrollIntoView({block:'start'});
 }
 try{say('Loading your session…');await load();say('');}catch(e){say(e.code==='PGRST202'?'Session operations are not enabled on this server yet.':e.message||'Unable to load session.',true);}
}
