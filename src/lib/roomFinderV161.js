import '../styles/roomFinderV161.css';

const key=value=>String(value??'').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
const collator=new Intl.Collator('en',{sensitivity:'base',numeric:true});
const element=(tag,className='',value='')=>{const node=document.createElement(tag);node.className=className;node.textContent=value;return node;};

/** Build choices exclusively from the already code-verified room chart. */
export function roomFinderEntriesV161(rooms){
 const entries=[];
 for(const room of Array.isArray(rooms)?rooms:[]){
  for(const [role,people] of [['student',room.students],['teacher',room.facilitators]]){
   for(const person of Array.isArray(people)?people:[]){
    if(!key(person.school)||!key(person.name))continue;
    entries.push({id:String(entries.length),school:String(person.school).trim(),name:String(person.name).trim(),role,roomNumber:room.room_number});
   }
  }
 }
 return entries;
}
export function roomFinderSchoolsV161(entries){
 return [...new Map(entries.map(e=>[key(e.school),e.school])).values()].sort(collator.compare);
}
export function roomFinderPeopleV161(entries,school){
 return entries.filter(e=>key(e.school)===key(school)).sort((a,b)=>collator.compare(a.name,b.name)||collator.compare(a.role,b.role)||Number(a.roomNumber)-Number(b.roomNumber));
}

export function bindRoomFinderV161(root){
 const chooser=root.querySelector('#gcc-v161-choice'),finder=root.querySelector('#gcc-v161-finder'),full=root.querySelector('#gcc-v161-full');
 const school=root.querySelector('#gcc-v161-school'),person=root.querySelector('#gcc-v161-person');
 const findButton=root.querySelector('#gcc-v161-find'),detail=root.querySelector('#gcc-v161-detail');
 const card=root.querySelector('#gcc-v161-selected-card'),number=root.querySelector('#gcc-v161-room-number');
 const hint=root.querySelector('#gcc-v161-hint'),selection=root.querySelector('#gcc-v161-selection');
 const chart=root.querySelector('#gcc-v104-room-list');
 let entries=[],mode='choice',chosen=null;
 const show=(view)=>{mode=view;chooser.hidden=view!=='choice';finder.hidden=view!=='find';full.hidden=view!=='all';};
 const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
 const resetDetail=()=>{detail.hidden=true;card.replaceChildren();chosen=null;};
 const chooseSchool=()=>{person.replaceChildren(option('','Select your name…'));
  const people=roomFinderPeopleV161(entries,school.value);
  for(const e of people){
   const duplicate=people.filter(x=>key(x.name)===key(e.name)&&x.role===e.role).length>1;
   person.append(option(e.id,e.name+(e.role==='teacher'?' · Teacher':'')+(duplicate?' · Room '+e.roomNumber:'')));
  }
  person.value='';findButton.disabled=true;resetDetail();
 };
 const showSelected=()=>{const entry=entries.find(e=>e.id===person.value);if(!entry)return;
  const room=[...chart.children].find(node=>String(node.dataset.roomNumber)===String(entry.roomNumber));
  if(!room){hint.textContent='Room assignment has changed. Please select your name again.';resetDetail();return;}
  chosen={school:entry.school,name:entry.name,role:entry.role,roomNumber:entry.roomNumber};
  number.textContent='ROOM '+String(entry.roomNumber).padStart(2,'0');
  selection.textContent=entry.name+' · '+entry.school;
  card.replaceChildren(room.cloneNode(true));detail.hidden=false;
  detail.scrollIntoView?.({behavior:'smooth',block:'nearest'});
 };
 root.querySelector('#gcc-v161-choice-find').addEventListener('click',()=>{show('find');school.focus();});
 root.querySelector('#gcc-v161-choice-all').addEventListener('click',()=>{show('all');full.querySelector('h2')?.focus({preventScroll:true});});
 root.querySelector('#gcc-v161-back').addEventListener('click',()=>{show('choice');resetDetail();});
 root.querySelector('#gcc-v161-all-from-find').addEventListener('click',()=>show('all'));
 root.querySelector('#gcc-v161-find-again').addEventListener('click',()=>{resetDetail();person.focus();});
 root.querySelector('#gcc-v161-back-all').addEventListener('click',()=>show('choice'));
 school.addEventListener('change',chooseSchool);
 person.addEventListener('change',()=>{findButton.disabled=!person.value;resetDetail();});
 findButton.addEventListener('click',showSelected);
 return {onDraw(data){
  const previous=chosen;
  const oldPersonEntry=entries.find(e=>e.id===person.value);
  entries=roomFinderEntriesV161(data.rooms);
  const oldSchool=school.value;
  school.replaceChildren(option('','Select your school…'));
  for(const s of roomFinderSchoolsV161(entries))school.append(option(s,s));
  school.value=[...school.options].some(o=>o.value===oldSchool)?oldSchool:'';
  chooseSchool();
  if(oldPersonEntry){
   const restored=entries.find(e=>key(e.school)===key(oldPersonEntry.school)&&key(e.name)===key(oldPersonEntry.name)&&e.role===oldPersonEntry.role&&String(e.roomNumber)===String(oldPersonEntry.roomNumber));
   if(restored){person.value=restored.id;findButton.disabled=false;}
  }
  if(previous&&mode==='find'){
   const match=entries.find(e=>key(e.school)===key(previous.school)&&key(e.name)===key(previous.name)&&e.role===previous.role&&String(e.roomNumber)===String(previous.roomNumber));
   if(match){school.value=match.school;chooseSchool();person.value=match.id;findButton.disabled=false;showSelected();}
   else{hint.textContent='Your room assignment may have changed. Please select your name again.';resetDetail();}
  }
 },showStart(){show('choice');resetDetail();school.value='';chooseSchool();hint.textContent='Choose your school, then your name. Names are listed alphabetically.';},reset(){entries=[];show('choice');resetDetail();}};
}
