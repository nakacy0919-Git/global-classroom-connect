import '../styles/registrationPairsV165.css';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
export function bindRegistrationPairsV165(root,{getStudents,getSession}){
 const section=root.querySelector('[data-v165-pairs]');if(!section)return null;
 const yes=section.querySelector('[data-v165-yes]'),no=section.querySelector('[data-v165-no]');
 const editor=section.querySelector('[data-v165-editor]'),list=section.querySelector('[data-v165-list]');
 const add=section.querySelector('[data-v165-add]'),note=section.querySelector('[data-v165-note]');
 let pairs=[];
 const select=(options,placeholder)=>{const s=el('select');const blank=el('option','',placeholder);blank.value='';s.append(blank);for(const [value,label] of options){const o=el('option','',label);o.value=String(value);s.append(o);}return s;};
 function paint(){
  list.replaceChildren();const students=getStudents();
  pairs=pairs.filter(p=>p.a<students.length&&p.b<students.length);
  pairs.forEach((p,i)=>{
   const row=el('div','gcc-v165-pair-row');
   const label=el('strong','',students[p.a].name+' + '+students[p.b].name+' → Room '+p.room);
   const remove=el('button','', 'Remove');remove.type='button';remove.addEventListener('click',()=>{pairs.splice(i,1);paint();});
   row.append(label,remove);list.append(row);
  });
  const roomCount=Number(getSession()?.breakout_rooms||getSession()?.rooms||0);
  note.textContent=roomCount>0?'Select two students and their preferred room (1–'+roomCount+').':'Select two students and a preferred room. The host will confirm availability.';
 }
 function addPair(){
  const students=getStudents();const used=new Set(pairs.flatMap(p=>[p.a,p.b]));
  const choices=students.map((s,i)=>[i,s.name]).filter(([i])=>!used.has(i));
  if(choices.length<2){note.textContent='At least two unpaired students are needed.';return;}
  const row=el('div','gcc-v165-picker');
  const a=select(choices,'Student A'),b=select(choices,'Student B');
  const room=el('input');room.type='number';room.min='1';room.max='60';room.placeholder='Room #';room.setAttribute('aria-label','Preferred room number');
  const save=el('button','','Add pair');save.type='button';
  const cancel=el('button','','Cancel');cancel.type='button';
  cancel.addEventListener('click',()=>{row.remove();add.hidden=false;});
  save.addEventListener('click',()=>{
   const ai=Number(a.value),bi=Number(b.value),r=Number(room.value);
   if(a.value===''||b.value===''||ai===bi||!Number.isInteger(r)||r<1||r>60){note.textContent='Choose two different students and a room number from 1 to 60.';return;}
   pairs.push({a:ai,b:bi,room:r});row.remove();add.hidden=false;paint();
  });
  row.append(a,b,room,save,cancel);add.after(row);add.hidden=true;
 }
 add.addEventListener('click',addPair);
 const toggle=()=>{editor.hidden=!yes.checked;if(no.checked)pairs=[];paint();};
 yes.addEventListener('change',toggle);no.addEventListener('change',toggle);
 paint();
 return {getPairs:()=>yes.checked?pairs.slice():[],refresh:paint,summary:()=>yes.checked?pairs.length+' requested pair(s)':'No pair preferences'};
}
