import '../styles/teacherRoomsV106.css';
import '../styles/teacherRoomsV108.css';
import {openTeacherEditorV106,applyTeacherRoomEditV106} from '../services/teacherRoomEditV106.js';
import {overviewColumnsV106,roomChoiceLabelV106,buildEditorDiffV106} from './roomOverviewV106.js';
const elt=(tag,cls='',label='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=String(label);return n;};
const button=(label,fn,cls='gcc-v106-tool')=>{const b=elt('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;};
export function setupRoomToolsV106({root,token,getCode,onRefresh}){
 const chart=root.querySelector('#gcc-v104-chart'),list=root.querySelector('#gcc-v104-room-list');
 const toolbar=elt('div','gcc-v106-toolbar');toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Room chart tools');
 const compact=button('Compact overview',()=>{const on=root.classList.toggle('gcc-v106-compact');compact.setAttribute('aria-pressed',String(on));});compact.setAttribute('aria-pressed','false');
 const print=button('Print A4 landscape',()=>window.print());
 const teacher=button('Teacher Mode',()=>{panel.hidden=!panel.hidden;if(panel.hidden)clearEditor();});
 toolbar.append(compact,print,teacher);
 const panel=elt('section','gcc-v106-mode gcc-v108-mode');panel.hidden=true;panel.setAttribute('aria-label','Teacher room editor');
 const intro=elt('div','gcc-v108-section-head');intro.append(elt('span','gcc-v108-eyebrow','SCHOOL-ONLY EDITING'),elt('h3','','Teacher Mode'));
 panel.append(intro);
 const auth=elt('form','gcc-v108-auth');
 const pinLabel=elt('label','','Your own 4-digit code');const pin=elt('input');pin.type='password';pin.inputMode='numeric';pin.pattern='[0-9]{4}';pin.maxLength=4;pin.required=true;pin.autocomplete='off';pin.placeholder='••••';pinLabel.append(pin);
 const unlock=elt('button','gcc-v108-main','Open my school editor');unlock.type='submit';auth.append(pinLabel,unlock);
 panel.append(elt('p','gcc-v106-note','Ask the host for your personal code. It identifies your registered school and teacher — no email address is needed.'),auth);
 const editing=elt('div','gcc-v106-editor gcc-v108-editor');editing.hidden=true;panel.append(editing);
 const status=elt('p','gcc-v106-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
 list.before(toolbar,panel);
 let credentials=null,editorData=null,chartData=null,busy=false,timer=null,mode='pair';
 const setStatus=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
 function clearEditor(){credentials=null;editorData=null;editing.hidden=true;auth.hidden=false;pin.value='';editing.replaceChildren();setStatus('');}
 function renderEditor(){
  if(!editorData)return;
  editing.replaceChildren();editing.hidden=false;
  const students=editorData.students||[],pairs=editorData.pairs||[];
  const byId=new Map(students.map(s=>[String(s.id),s]));
  const summary=elt('div','gcc-v108-identity');summary.append(elt('strong','',editorData.teacher||'Teacher'),elt('span','',`${editorData.school||'Your school'} · ${students.length} students you can edit`));editing.append(summary);
  editing.append(elt('p','gcc-v106-note','Other schools are view-only. Only the students below can be moved or paired. Your registered teacher name is recorded automatically.'));
  const tabs=elt('div','gcc-v108-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Edit action');
  const pairTab=button('1. Keep two together',()=>{mode='pair';renderEditor();},'gcc-v108-tab');
  const moveTab=button('2. Move to a room',()=>{mode='move';renderEditor();},'gcc-v108-tab');
  pairTab.setAttribute('aria-pressed',String(mode==='pair'));moveTab.setAttribute('aria-pressed',String(mode==='move'));tabs.append(pairTab,moveTab);editing.append(tabs);
  const form=elt('div','gcc-v108-edit-form');
  if(!students.length){form.append(elt('p','gcc-v106-note','No students in your approved school roster. Ask the host.'));editing.append(form);return;}
  const makeSelect=()=>{const s=elt('select');for(const member of students){const o=elt('option','',roomChoiceLabelV106(member));o.value=String(member.id);s.append(o);}return s;};
  const firstLabel=elt('label','',mode==='pair'?'Student 1 — keep in this room':'Select your student');const first=makeSelect();firstLabel.append(first);form.append(firstLabel);
  let second=null,room=null;
  if(mode==='pair'){
    const secondLabel=elt('label','','Student 2 — bring into the same room');second=makeSelect();
    if(students.length>1)second.selectedIndex=1;
    secondLabel.append(second);form.append(secondLabel);
  }else{
    const roomLabel=elt('label','','Destination room');room=elt('select');
    for(let n=1;n<=Number(editorData.room_count||chartData?.rooms?.length||0);n++){
      const opt=elt('option','',`Room ${String(n).padStart(2,'0')}`);opt.value=String(n);room.append(opt);
    }
    roomLabel.append(room);form.append(roomLabel);
  }
  const explain=elt('div','gcc-v108-preview');
  function updatePreview(){const a=byId.get(first.value),b=second?byId.get(second.value):null;
    if(mode==='pair')explain.textContent=a&&b?`${b.name} will join ${a.name} in Room ${String(a.room).padStart(2,'0')}. They will remain a fixed pair.`:'Choose two students.';
    else explain.textContent=a?`${a.name}${pairs.some(p=>p.a===a.id||p.b===a.id)?' and their paired student':''} will move from Room ${String(a.room).padStart(2,'0')} to Room ${String(room.value).padStart(2,'0')}.`:'Select a student.';
  }
  first.addEventListener('change',updatePreview);if(second)second.addEventListener('change',updatePreview);if(room)room.addEventListener('change',updatePreview);
  const save=button(mode==='pair'?'Save this pair':'Save room move',()=>saveEdit(mode,first.value,second?.value||null,room?Number(room.value):null),'gcc-v108-main gcc-v108-save');
  form.append(explain,save);editing.append(form);updatePreview();
  const locked=elt('section','gcc-v108-locked');locked.append(elt('h4','','Already fixed pairs'));
  if(!pairs.length)locked.append(elt('p','gcc-v106-note','No pairs registered for your school yet.'));
  for(const pair of pairs){const a=byId.get(String(pair.a)),b=byId.get(String(pair.b));if(!a||!b)continue;
   const line=elt('div','gcc-v108-pair-row');line.append(elt('span','',`${a.name} + ${b.name}`),button('Release',()=>saveEdit('unpair',String(pair.a),String(pair.b),null)));
   locked.append(line);
  }
  editing.append(locked);
  editing.append(button('Exit Teacher Mode',()=>{panel.hidden=true;clearEditor();}));
 }
 async function saveEdit(action,aId,bId,room){
  if(busy||!credentials||!editorData)return;
  let payload;
  try{const lookup=new Map((editorData.students||[]).map(s=>[String(s.id),s]));
   payload=buildEditorDiffV106(action,lookup.get(aId),lookup.get(bId),room,Number(editorData.revision));
  }catch(e){setStatus(e.message,true);return;}
  busy=true;setStatus('Saving your changes…');
  try{const result=await applyTeacherRoomEditV106(credentials,payload);
   editorData=await openTeacherEditorV106(credentials);renderEditor();
   const fresh=await onRefresh(getCode());if(fresh)onDraw(fresh);
   setStatus(`${result.message||'Saved.'} Other viewers will receive the updated chart.`);
  }catch(e){setStatus(`${e.message}. Please refresh if another teacher edited the chart.`,true);
   try{editorData=await openTeacherEditorV106(credentials);renderEditor();}catch{/* keep old board visible */}}
  finally{busy=false;}
 }
 auth.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;
  busy=true;unlock.disabled=true;setStatus('Checking your school code…');
  const candidate={token,code:getCode(),pin:pin.value};
  try{editorData=await openTeacherEditorV106(candidate);credentials=candidate;auth.hidden=true;mode='pair';renderEditor();setStatus('Editor unlocked — only your school is editable.');}
  catch(e){setStatus(e.message,true);}finally{busy=false;unlock.disabled=false;}
 });
 async function refresh(){if(!chart.isConnected){if(timer)clearInterval(timer);timer=null;return;}
  if(chart.hidden||busy||document.visibilityState==='hidden'||!chartData)return;
  try{const fresh=await onRefresh(getCode());if(fresh)onDraw(fresh);}catch{/* retain confirmed chart */}
 }
 function onDraw(data){chartData=data;root.style.setProperty('--gcc-overview-cols',String(overviewColumnsV106(data.rooms?.length||0)));
  if(!timer)timer=setInterval(refresh,30000);
 }
 return {onDraw,reset:()=>{chartData=null;clearEditor();panel.hidden=true;}};
}
