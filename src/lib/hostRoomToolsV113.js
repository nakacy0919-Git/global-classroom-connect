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
 const title=element('div','gcc-v113-heading');title.append(element('strong','','Host Mode · All Schools'),element('p','','Move a student or fixed pair from any participating school. The original shared room chart updates automatically.'));
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
  edit.append(summary,element('p','gcc-v113-tip','Choose a student or linked pair, then drag it to a room (PC) or tap Move here (iPad). Existing fixed pairs always move together.'));
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
