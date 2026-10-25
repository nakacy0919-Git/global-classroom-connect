// V10.11: school-scoped, accessible manual room moves with drag & drop and tap fallback.
import {roomCandidatesV110} from './roomPlacementV110.js';
const make=(tag,css='',label='')=>{const el=document.createElement(tag);el.className=css;el.textContent=String(label);return el;};
const compare=new Intl.Collator('en',{sensitivity:'base',numeric:true});
export function boardRowsV111(data){
 const students=[...(data.students||[])].sort((a,b)=>compare.compare(a.name,b.name)||String(a.id).localeCompare(String(b.id)));
 const partner=new Map();for(const p of data.pairs||[]){partner.set(String(p.a),String(p.b));partner.set(String(p.b),String(p.a));}
 const byId=new Map(students.map(s=>[String(s.id),s]));
 const seen=new Set();
 const entries=[];
 for(const s of students){if(seen.has(String(s.id)))continue;
  const other=byId.get(partner.get(String(s.id)));
  seen.add(String(s.id));if(other)seen.add(String(other.id));
  entries.push({id:String(s.id),name:other?`${s.name} + ${other.name}`:s.name,room:Number(s.room),count:other?2:1});
 }
 return entries;
}
export function moveWarningsV111(data,memberIds,targetRoom){
 const students=(data.students||[]).filter(s=>memberIds.includes(String(s.id)));
 return roomCandidatesV110({roomStats:data.room_stats||[],students,ownTotal:data.students?.length||0})
  .find(c=>c.room===Number(targetRoom));
}
export function mountTeacherRoomBoardV111({editorData,onMove}){
 const section=make('section','gcc-v111-board');section.setAttribute('aria-label','Drag students between breakout rooms');
 section.append(make('h4','','Move students directly on the room map'),make('p','gcc-v111-help',
   'PC: drag a student or fixed pair into another room. iPad: tap a name, then tap “Move here”. Only students from your school can move.'));
 const status=make('p','gcc-v111-feedback','Select a student or pair to move.');status.setAttribute('role','status');
 const grid=make('div','gcc-v111-grid');const all=boardRowsV111(editorData);
 let chosen=null,pending=false;const cards=[];const chips=[];
 const pairsById=new Map();for(const p of editorData.pairs||[]){pairsById.set(String(p.a),String(p.b));pairsById.set(String(p.b),String(p.a));}
 function select(id){chosen=id;chips.forEach(c=>c.classList.toggle('gcc-v111-picked',c.dataset.studentId===id));
  cards.forEach(c=>c.classList.toggle('gcc-v111-drop-ready',Boolean(id)));
  const record=all.find(a=>a.id===id);status.textContent=record?`Selected: ${record.name}. Choose a destination room.`:'Select a student or pair.';
 }
 async function commit(id,target){
  if(pending||!id)return;
  const record=all.find(a=>a.id===id);if(!record||record.room===target){select(null);return;}
  const involved=[id];const partner=pairsById.get(id);if(partner)involved.push(partner);
  const check=moveWarningsV111(editorData,involved,target);
  if(check?.warning){
   const detail=`Room ${String(target).padStart(2,'0')} would contain ${check.newTotal} students, including ${check.newOwn} from your school. Move anyway?`;
   if(!window.confirm(detail)){status.textContent='Move cancelled. No changes saved.';return;}
  }
  pending=true;status.textContent=`Saving ${record.name} in Room ${String(target).padStart(2,'0')}…`;
  try{await onMove(id,target);}
  catch(e){status.textContent=`Could not move: ${e.message}`;}
  finally{pending=false;}
 }
 const stats=[...(editorData.room_stats||[])].sort((a,b)=>Number(a.room)-Number(b.room));
 for(const s of stats){
  const number=Number(s.room);
  const card=make('div','gcc-v111-room');card.dataset.room=String(number);
  const title=make('div','gcc-v111-room-top');title.append(make('strong','',`Room ${String(number).padStart(2,'0')}`),make('span','',`${s.total} students · ${s.school_students} your school`));card.append(title);
  const names=make('div','gcc-v111-students');
  for(const entry of all.filter(x=>x.room===number)){
   const chip=make('button','gcc-v111-chip',entry.name+(entry.count===2?' 🔗':''));chip.type='button';chip.draggable=true;
   chip.dataset.studentId=entry.id;chip.setAttribute('aria-label',`Select ${entry.name} for room move`);
   chip.addEventListener('click',ev=>{ev.stopPropagation();select(entry.id);});
   chip.addEventListener('dragstart',ev=>{select(entry.id);ev.dataTransfer?.setData('text/plain',entry.id);if(ev.dataTransfer)ev.dataTransfer.effectAllowed='move';});
   chip.addEventListener('dragend',()=>card.classList.remove('gcc-v111-over'));
   chips.push(chip);names.append(chip);
  }
  card.append(names);
  if(Number(s.total)-Number(s.school_students)>0) card.append(make('small','gcc-v111-other',`${Number(s.total)-Number(s.school_students)} from other schools (view only)`));
  const dest=make('button','gcc-v111-dest','Move here');dest.type='button';dest.addEventListener('click',()=>commit(chosen,number));card.append(dest);
  card.addEventListener('dragover',ev=>{if(!chosen)return;ev.preventDefault();card.classList.add('gcc-v111-over');if(ev.dataTransfer)ev.dataTransfer.dropEffect='move';});
  card.addEventListener('dragleave',ev=>{if(!card.contains(ev.relatedTarget))card.classList.remove('gcc-v111-over');});
  card.addEventListener('drop',ev=>{ev.preventDefault();card.classList.remove('gcc-v111-over');const id=ev.dataTransfer?.getData('text/plain')||chosen;commit(id,number);});
  cards.push(card);grid.append(card);
 }
 section.append(status,grid);return section;
}
