import '../styles/teacherRoomsV106.css';
import '../styles/teacherRoomsV108.css';
import {openTeacherEditorV106,applyTeacherRoomEditV106} from '../services/teacherRoomEditV106.js';
import {overviewColumnsV106,roomChoiceLabelV106,buildEditorDiffV106} from './roomOverviewV106.js';
import {sortUnpairedV110,roomCandidatesV110,formatPlacementV110} from './roomPlacementV110.js';
import '../styles/teacherRoomsV110.css';
import '../styles/teacherRoomsV111.css';
import {mountTeacherRoomBoardV111} from './roomDragV111.js';
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
  const available=sortUnpairedV110(students,pairs);
  if(mode==='pair'&&available.length<2){
    form.append(elt('p','gcc-v106-note','All eligible students already have fixed pairs. Release a pair below to choose another pairing.'));
    editing.append(form);
  }else{
    const makeSelect=entries=>{const s=elt('select');for(const member of entries){
      const o=elt('option','',`${member.name} · Room ${String(member.room).padStart(2,'0')}`);
      o.value=String(member.id);s.append(o);
    }return s;};
    const firstLabel=elt('label','',mode==='pair'?'1. Choose student A':'1. Select your student');
    const first=makeSelect(mode==='pair'?available:sortUnpairedV110(students,[]));firstLabel.append(first);form.append(firstLabel);
    let second=null;
    if(mode==='pair'){
      const secondLabel=elt('label','','2. Choose student B');second=makeSelect(available.filter(s=>String(s.id)!==first.value));
      secondLabel.append(second);form.append(secondLabel);
    }
    const roomLabel=elt('label','',mode==='pair'?'3. Choose a breakout room for this pair':'2. Destination room');
    const room=elt('select');roomLabel.append(room);form.append(roomLabel);
    const explain=elt('div','gcc-v108-preview');const save=button(mode==='pair'?'Save pair and room':'Save room move',()=>{
      if(!room.value)return;
      saveEdit(mode,first.value,second?.value||null,Number(room.value));
    },'gcc-v108-main gcc-v108-save');
    function recalc(){
      const a=byId.get(first.value),b=second?byId.get(second.value):null;
      const moved=mode==='pair'?[a,b]:[a,...(pairs.filter(p=>String(p.a)===String(a?.id)||String(p.b)===String(a?.id)).map(p=>byId.get(String(p.a)===String(a.id)?String(p.b):String(p.a))))];
      const unique=[...new Map(moved.filter(Boolean).map(s=>[String(s.id),s])).values()];
      const options=roomCandidatesV110({roomStats:editorData.room_stats||[],students:unique,ownTotal:students.length});
      const old=room.value;room.replaceChildren();
      for(const item of options){const opt=elt('option','',formatPlacementV110(item));opt.value=String(item.room);
        room.append(opt);}
      const preferred=options.find(o=>String(o.room)===old)||options[0];
      if(preferred)room.value=String(preferred.room);else room.selectedIndex=-1;
      save.disabled=!preferred||unique.length<(mode==='pair'?2:1);
      if(!preferred)explain.textContent='No room is available in this session.';
      else explain.textContent=`${unique.map(s=>s.name).join(' + ')} → Room ${String(room.value).padStart(2,'0')}. ${preferred.newTotal} students after move (${preferred.newOwn} from your school). ${preferred.warning?'⚠ Busy room: manual placement is allowed.':'✓ Balanced placement suggested.'}`;
    }
    first.addEventListener('change',()=>{if(second){
      const v=second.value;second.replaceChildren();for(const member of available.filter(s=>String(s.id)!==first.value)){
        const o=elt('option','',`${member.name} · Room ${String(member.room).padStart(2,'0')}`);o.value=String(member.id);second.append(o);
      }if([...second.options].some(o=>o.value===v))second.value=v;
    }recalc();});
    if(second)second.addEventListener('change',recalc);
    const optionsForPreview=()=>{const a=byId.get(first.value),b=second?byId.get(second.value):null;
      const members=mode==='pair'?[a,b]:[a,...pairs.filter(p=>String(p.a)===String(a?.id)||String(p.b)===String(a?.id)).map(p=>byId.get(String(p.a)===String(a.id)?String(p.b):String(p.a)))];
      return roomCandidatesV110({roomStats:editorData.room_stats||[],students:members.filter(Boolean),ownTotal:students.length}).find(o=>String(o.room)===room.value);
    };
    room.addEventListener('change',()=>{const a=byId.get(first.value),b=second?byId.get(second.value):null;
      const names=[a?.name,b?.name].filter(Boolean).join(' + ');
      const current=optionsForPreview();
      explain.textContent=`${names} → Room ${String(room.value).padStart(2,'0')}. ${current?.warning?'⚠ This room is crowded. You may still choose it.':'✓ This room has space.'}`;
    });
    form.append(explain,save);editing.append(form);recalc();
  }
  editing.append(mountTeacherRoomBoardV111({editorData,onMove:async(studentId,targetRoom)=>{
    await saveEdit('move',String(studentId),null,Number(targetRoom));
  }}));
  const locked=elt('details','gcc-v108-locked gcc-v110-locked');const heading=elt('summary','',`Already fixed pairs (${pairs.length}) · tap to manage`);locked.append(heading);const lockedList=elt('div','gcc-v110-pair-list');locked.append(lockedList);
  if(!pairs.length)lockedList.append(elt('p','gcc-v106-note','No pairs registered for your school yet.'));
  for(const pair of pairs){const a=byId.get(String(pair.a)),b=byId.get(String(pair.b));if(!a||!b)continue;
   const line=elt('div','gcc-v108-pair-row');line.append(elt('span','',`${a.name} + ${b.name}`),button('Release',()=>saveEdit('unpair',String(pair.a),String(pair.b),null)));
   lockedList.append(line);
  }
  editing.append(locked);
  editing.append(button('Exit Teacher Mode',()=>{panel.hidden=true;clearEditor();}));
 }
 async function saveEdit(action,aId,bId,room){
  if(busy||!credentials||!editorData)return;
  let payload;
  try{const lookup=new Map((editorData.students||[]).map(s=>[String(s.id),s]));
   payload=buildEditorDiffV106(action,lookup.get(aId),lookup.get(bId),room,Number(editorData.revision));
   if(action==='pair')payload.room=room;
  }catch(e){setStatus(e.message,true);return;}
  busy=true;setStatus('Saving your changes…');
  try{const result=await applyTeacherRoomEditV106(credentials,payload);
   editorData=await openTeacherEditorV106(credentials);renderEditor();
   const fresh=await onRefresh(getCode());if(fresh)onDraw(fresh);
   const moved=editorData.students.find(s=>String(s.id)===String(aId));
   setStatus(`${result.message||'Saved.'}${moved?' '+moved.name+' is now in Room '+String(moved.room).padStart(2,'0')+'.':''} All viewers see the updated chart.`);
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
