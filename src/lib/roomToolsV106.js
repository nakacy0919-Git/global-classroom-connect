import '../styles/teacherRoomsV106.css';
import {openTeacherEditorV106,applyTeacherRoomEditV106} from '../services/teacherRoomEditV106.js';
import {overviewColumnsV106,roomChoiceLabelV106,buildEditorDiffV106} from './roomOverviewV106.js';

const elt=(tag,cls='',value='')=>{
 const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=value;return n;
};
const control=(label,fn)=>{const b=elt('button','gcc-v106-tool',label);b.type='button';b.addEventListener('click',fn);return b;};
export function setupRoomToolsV106({root,token,getCode,onRefresh}){
 const chart=root.querySelector('#gcc-v104-chart'),list=root.querySelector('#gcc-v104-room-list');
 const toolbar=elt('div','gcc-v106-toolbar');
 toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Room chart tools');
 const compact=control('Compact overview',()=>{
  const next=!root.classList.contains('gcc-v106-compact');
  root.classList.toggle('gcc-v106-compact',next);
  compact.setAttribute('aria-pressed',String(next));
 });
 compact.setAttribute('aria-pressed','false');
 const print=control('Print A4 landscape',()=>window.print());
 const teacher=control('Teacher Mode',()=>{
  panel.hidden=!panel.hidden;
  if(panel.hidden)clearEditor();
 });
 toolbar.append(compact,print,teacher);
 const panel=elt('section','gcc-v106-mode');panel.hidden=true;panel.setAttribute('aria-label','Teacher room editing');
 const heading=elt('h3','','Teacher Mode · Edit room pairs');panel.append(heading);
 panel.append(elt('p','','Only authorized teachers can move students. Changes are saved immediately and visible to all participants.'));
 const authForm=elt('form','gcc-v106-login');
 const fields=elt('div','gcc-v106-fields');
 const nameLabel=elt('label','','Teacher name');const name=elt('input');name.placeholder='e.g. Teacher Mari';name.required=true;name.maxLength=80;name.autocomplete='off';nameLabel.append(name);
 const pinLabel=elt('label','','Your personal 4-digit edit code');const pin=elt('input');pin.type='password';pin.inputMode='numeric';pin.pattern='[0-9]{4}';pin.maxLength=4;pin.required=true;pin.autocomplete='off';pinLabel.append(pin);
 fields.append(nameLabel,pinLabel);authForm.append(fields);
 const unlock=elt('button','gcc-v106-tool','Unlock editing');unlock.type='submit';authForm.append(unlock);panel.append(authForm);
 const editing=elt('div','gcc-v106-editor');editing.hidden=true;panel.append(editing);
 const status=elt('p','gcc-v106-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
 const setStatus=(v,isError=false)=>{status.textContent=v;status.classList.toggle('error',isError)};
 list.before(toolbar,panel);
 let credentials=null,editorData=null,currentChart=null,busy=false;
 let timer=null;
 function clearEditor(){credentials=null;editorData=null;editing.hidden=true;authForm.hidden=false;pin.value='';editing.replaceChildren();setStatus('');}
 function redrawEditor(){
  if(!editorData)return;
  editing.replaceChildren();editing.hidden=false;
  const who=elt('p','',`Signed in as ${editorData.editor}. Each edit saves automatically.`);editing.append(who);
  const members=editorData.students||[],pairs=editorData.pairs||[];
  const byId=new Map(members.map(s=>[String(s.id),s]));
  const chooses=()=>{const select=elt('select');
    for(const s of members){const o=elt('option','',roomChoiceLabelV106(s));o.value=String(s.id);select.append(o);}return select;};
  const aField=elt('label','','Student A');const a=chooses();aField.append(a);
  const bField=elt('label','','Student B (keep together)');const b=chooses();bField.append(b);
  if(members.length>1)b.selectedIndex=1;
  const pairFields=elt('div','gcc-v106-fields');pairFields.append(aField,bField);editing.append(pairFields);
  const roomLabel=elt('label','','Move selected student / pair to room');const roomSelect=elt('select');
  const roomCount=currentChart?.rooms?.length||0;
  for(let n=1;n<=roomCount;n++){const opt=elt('option','',`Room ${String(n).padStart(2,'0')}`);opt.value=String(n);roomSelect.append(opt);}roomLabel.append(roomSelect);editing.append(roomLabel);
  const actions=elt('div','gcc-v106-actions');
  const pairButton=control('Keep A + B together',()=>save('pair',a.value,b.value,null));
  const moveButton=control('Move A (and buddy) to room',()=>save('move',a.value,null,Number(roomSelect.value)));
  actions.append(pairButton,moveButton);editing.append(actions);
  const pairList=elt('div','gcc-v106-pairs');
  const lockedLabel=elt('h3','','Locked pairs');editing.append(lockedLabel,pairList);
  if(!pairs.length)pairList.append(elt('p','gcc-v106-note','No pairs locked yet.'));
  for(const entry of pairs){
   const first=byId.get(String(entry.a)),second=byId.get(String(entry.b));
   if(!first||!second)continue;
   const item=elt('div','gcc-v106-pair',`${first.name} + ${second.name} · `);
   const remove=control('Release',()=>save('unpair',String(entry.a),String(entry.b),null));
   remove.style.padding='3px 7px';item.append(remove);pairList.append(item);
  }
  const exit=control('Exit Teacher Mode',()=>{panel.hidden=true;clearEditor()});editing.append(exit);
 }
 async function save(action,firstId,secondId,targetRoom){
  if(busy||!credentials||!editorData)return;
  let payload;
  try{
   const byId=new Map(editorData.students.map(x=>[String(x.id),x]));
   payload=buildEditorDiffV106(action,byId.get(firstId),byId.get(secondId),targetRoom,Number(editorData.revision));
  }catch(e){setStatus(e.message,true);return;}
  busy=true;setStatus('Saving room change…');
  try{
   const res=await applyTeacherRoomEditV106(credentials,payload);
   editorData=await openTeacherEditorV106(credentials);
   redrawEditor();
   const code=getCode();const fresh=await onRefresh(code);
   if(fresh)onDraw(fresh);
   setStatus(res.message||'Saved. Other viewers will see the latest rooms.');
  }catch(e){setStatus(`${e.message} Refresh the plan if another teacher edited it.`,true);
   try{editorData=await openTeacherEditorV106(credentials);redrawEditor();}catch{} }
  finally{busy=false;}
 }
 authForm.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const candidate={token,code:getCode(),name:name.value.trim(),pin:pin.value};
  busy=true;unlock.disabled=true;setStatus('Checking teacher credentials…');
  try{
   editorData=await openTeacherEditorV106(candidate);credentials=candidate;
   authForm.hidden=true;redrawEditor();setStatus('Teacher Mode unlocked. Your edits are logged.');
  }catch(error){setStatus(error.message,true);}finally{unlock.disabled=false;busy=false;}
 });
 async function refresh(){
  if(!chart.isConnected){if(timer)clearInterval(timer);timer=null;return;}
  if(chart.hidden||busy||document.visibilityState==='hidden'||!currentChart)return;
  try{const latest=await onRefresh(getCode());if(latest)onDraw(latest);}catch{/* Keep last confirmed chart visible on transient errors. */}
 }
 function onDraw(data){
  currentChart=data;
  const cols=overviewColumnsV106(data.rooms?.length||0);
  root.style.setProperty('--gcc-overview-cols',String(cols));
  if(!timer)timer=setInterval(refresh,30000);
 }
 return {onDraw,reset:()=>{currentChart=null;clearEditor();panel.hidden=true;}};
}
