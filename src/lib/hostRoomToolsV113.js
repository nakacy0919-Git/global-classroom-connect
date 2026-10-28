import '../styles/hostRoomToolsV113.css';
import {supabase} from '../services/supabase.js';
import {mountTeacherRoomBoardV111} from './roomDragV111.js';

const element=(tag,css='',text='')=>{const x=document.createElement(tag);x.className=css;x.textContent=text;return x;};
async function call(name,args){
  if(!supabase)throw new Error('Connection unavailable.');
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw error;
  if(data?.ok===false)throw new Error(data.error||'Access denied.');
  return data;
}
export function mountHostRoomEditorV113({token,getCode,onRefresh,onDraw}){
 const panel=element('section','gcc-v113-host');panel.hidden=true;panel.setAttribute('aria-label','Host room editor');
 const title=element('div','gcc-v113-heading');title.append(element('strong','','Host Mode · All Schools'),element('p','','Move students across schools, or select one school to lock two students together. The original chart link and 6-digit code stay the same.'));
 const form=element('form','gcc-v113-form');
 const label=element('label','','Host management code');const pin=element('input');pin.type='password';pin.inputMode='numeric';pin.pattern='[0-9]{4}';pin.maxLength=4;pin.required=true;pin.autocomplete='off';pin.placeholder='4-digit host code';label.append(pin);
 const submit=element('button','gcc-v113-primary','Unlock Host Mode');submit.type='submit';form.append(label,submit);
 const edit=element('div','gcc-v113-content');edit.hidden=true;
 const feedback=element('p','gcc-v113-feedback');feedback.setAttribute('role','status');
 panel.append(title,element('p','gcc-v113-tip','This is a separate host code, not a teacher code. All school registrations are available in this mode.'),form,edit,feedback);
 let credentials=null,editor=null,pending=false;
 function reset(){credentials=null;editor=null;pin.value='';form.hidden=false;edit.hidden=true;edit.replaceChildren();feedback.textContent='';}
 function render(){
  edit.replaceChildren();edit.hidden=false;
  const schools=new Set((editor.students||[]).map(s=>s.school));
  const summary=element('p','gcc-v113-summary',`${editor.students?.length||0} students · ${schools.size} schools · ${editor.pairs?.length||0} protected pairs · ${editor.room_stats?.length||0} rooms`);
  edit.append(summary,element('p','gcc-v113-tip','Choose a school to create or release a fixed pair. You can also drag a student or existing pair between rooms below.'));
  const schoolBox=element('section','gcc-v113-school-pair');
  schoolBox.append(element('h4','','School-specific pair settings'),element('p','gcc-v113-tip','Only students from the selected school are shown. Locked pairs always move together.'));
  const schoolLabel=element('label','','School');const schoolSelect=element('select');schoolLabel.append(schoolSelect);
  const firstLabel=element('label','','Student A');const first=element('select');firstLabel.append(first);
  const secondLabel=element('label','','Student B');const second=element('select');secondLabel.append(second);
  const roomLabel=element('label','','Place both students in');const room=element('select');roomLabel.append(room);
  const options=(select,items,placeholder)=>{select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent=placeholder;select.append(blank);for(const item of items){const o=document.createElement('option');o.value=String(item.value);o.textContent=item.label;select.append(o);}};
  const allStudents=editor.students||[];
  const collator=new Intl.Collator('en',{sensitivity:'base',numeric:true});
  const schoolsSorted=[...new Set(allStudents.map(s=>s.school).filter(Boolean))].sort(collator.compare);
  options(schoolSelect,schoolsSorted.map(x=>({value:x,label:x})),'Select school');
  const members=()=>allStudents.filter(x=>x.school===schoolSelect.value).sort((a,b)=>collator.compare(a.name,b.name));
  const pairedIds=new Set((editor.pairs||[]).flatMap(p=>[String(p.a),String(p.b)]));
  const fillNames=()=>{const choices=members().map(x=>({value:x.id,label:x.name+(pairedIds.has(String(x.id))?' 🔗':'')}));
    options(first,choices,'Choose first student');options(second,choices,'Choose second student');};
  schoolSelect.addEventListener('change',fillNames);fillNames();
  options(room,(editor.room_stats||[]).map(x=>({value:x.room,label:'Room '+String(x.room).padStart(2,'0')})),'Choose destination room');
  const actions=element('div','gcc-v113-pair-actions');
  const lock=element('button','gcc-v113-primary','Lock pair together');lock.type='button';
  const unlock=element('button','gcc-v113-secondary','Unlock existing pair');unlock.type='button';
  const pairMessage=element('p','gcc-v113-feedback');pairMessage.setAttribute('role','status');
  async function applyPair(action){
    if(pending||!credentials)return;
    if(!schoolSelect.value||!first.value||!second.value||first.value===second.value){pairMessage.textContent='Choose a school and two different students.';return;}
    if(action==='pair'&&!room.value){pairMessage.textContent='Choose a destination room.';return;}
    if(action==='unpair'&&!window.confirm('Unlock this fixed pair? Both students will remain in their current room.'))return;
    pending=true;lock.disabled=true;unlock.disabled=true;pairMessage.textContent='Saving pair settings…';
    try{
      const saved=await call('gcc_v163_host_pair',{p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
        p_school:schoolSelect.value,p_student_a:first.value,p_student_b:second.value,
        p_action:action,p_target_room:action==='pair'?Number(room.value):null,p_expected_revision:editor.revision});
      editor=await call('gcc_v113_host_open',{p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin});
      render();const newest=await onRefresh(getCode());if(newest)onDraw(newest);
      feedback.textContent=saved.message+' · Existing room chart link and 6-digit code unchanged.';
    }catch(error){pairMessage.textContent='Pair not saved: '+error.message;}
    finally{pending=false;lock.disabled=false;unlock.disabled=false;}
  }
  lock.addEventListener('click',()=>applyPair('pair'));unlock.addEventListener('click',()=>applyPair('unpair'));
  actions.append(lock,unlock);schoolBox.append(schoolLabel,firstLabel,secondLabel,roomLabel,actions,pairMessage);
  edit.append(schoolBox);
  edit.append(mountTeacherRoomBoardV111({editorData:editor,host:true,onMove:async(id,room)=>{
   if(pending||!credentials)return;
   pending=true;feedback.textContent='Saving your room change…';
   try{
    const saved=await call('gcc_v113_host_move',{p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
     p_student:id,p_room:room,p_expected_revision:editor.revision});
    editor=await call('gcc_v113_host_open',{p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin});
    render();
    const newest=await onRefresh(getCode());if(newest)onDraw(newest);
    feedback.textContent=`${saved.message||'Saved'} · ${saved.moved} student(s) moved. Chart updated for everyone.`;
   }catch(error){feedback.textContent=`Move not saved: ${error.message}`;
    try{editor=await call('gcc_v113_host_open',{p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin});render();}catch{}
   }finally{pending=false;}
  }}));
  const exit=element('button','gcc-v113-secondary','Exit Host Mode');exit.type='button';exit.addEventListener('click',()=>{panel.hidden=true;reset();});edit.append(exit);
 }
 form.addEventListener('submit',async event=>{event.preventDefault();if(pending)return;
  pending=true;submit.disabled=true;feedback.textContent='Checking host code…';
  try{const value={token,code:getCode(),pin:pin.value};editor=await call('gcc_v113_host_open',{
   p_token:value.token,p_code:value.code,p_pin:value.pin});credentials=value;form.hidden=true;render();feedback.textContent='Host Mode unlocked. All participating schools may be edited.';
  }catch(error){feedback.textContent=error.message;}finally{pending=false;submit.disabled=false;}
 });
 return {panel,reset};
}
