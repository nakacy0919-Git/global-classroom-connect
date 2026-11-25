import {syncThemeV244} from './sessionThemeV244.js';
import {bindWizardViewportV243} from './sessionWizardViewportV243.js';
// Sequential modal UI over the existing four persisted draft stages.
// Original controls stay in the same form (and dynamic planner), with their IDs,
// event handlers and payloads intact. Never clone fields or create extra drafts.
export const WIZARD_SCREENS_V242=[
 {group:0,title:'What would you like to call your session?',hint:'Pick a starting idea or enter your own session name.'},
 {group:0,title:'When will your class connect?',hint:'Set the date and times in your school’s local time.'},
 {group:1,title:'How will students connect?',hint:'Choose the illustrated format that fits your classroom.'},
 {group:1,title:'How many students will participate?',hint:'Enter your own students, total capacity and number of rooms.'},
 {group:1,title:'Which students would you like to meet?',hint:'Select your school level and the partner levels you welcome.'},
 {group:2,title:'What kind of exchange are you planning?',hint:'Choose a session theme, or Other for your own topic.'},
 {group:2,title:'Who is your ideal exchange partner?',hint:'Specify ages, countries, languages and other preferences.'},
 {group:2,title:'What will students do during the session?',hint:'Describe the timed activities and the learning goals.'},
 {group:2,title:'How will you connect online?',hint:'Choose the meeting platform and breakout settings.'},
 {group:2,title:'When should registration close?',hint:'Set the deadline and add a flyer if you wish.'},
 {group:3,title:'Review and publish',hint:'Check the details before making your session discoverable.'}
];
export const firstScreenV242=group=>Math.max(0,WIZARD_SCREENS_V242.findIndex(s=>s.group===group));
export const screenGroupV242=index=>WIZARD_SCREENS_V242[index]?.group??0;
export function mountSessionWizardV242(root,{onGroup,canOpen,onClose,isBusy,viewportOptions}){
 const $=id=>root.querySelector('#'+id);
 const dialog=$('gcc242-dialog'),form=$('gctp-create'),body=$('gcc242-body'),launch=$('gcc242-launch');
 const keyboardViewport=bindWizardViewportV243(dialog,body,viewportOptions);
 const groups=[...form.querySelectorAll('[data-gctp-form-section]')];
 const planner=$('gctp-planner'),slot=$('gctp-plan-slot');
 // Only move direct child nodes within their original parent. Dynamic plan
 // field queries, platform options and draft serializer continue to work.
 const panels=[];
 function pack(parent,assign){
  const nodes=[...parent.children];
  const byScreen=new Map();
  for(const [i,node] of nodes.entries()){
   const screen=assign(node,i);
   if(screen===null)continue;
   if(!byScreen.has(screen)){
    const panel=document.createElement('div');panel.className='gcc242-panel';
    panel.dataset.gcc242Screen=String(screen);panel.hidden=true;
    byScreen.set(screen,panel);panels.push(panel);parent.insertBefore(panel,node);
   }
   byScreen.get(screen).append(node);
  }
 }
 pack(groups[0],(n,i)=>i<=3?0:1);
 pack(groups[1],(n,i)=>i<=1?2:i===2?3:4);
 pack(groups[2],(n,i)=>n===slot?null:(i<=3?5:6));
 pack(planner,(n,i)=>{
  const id=n.querySelector('input,select,textarea')?.id;
  if(id==='gctp-type'){n.hidden=true;return null;}
  if(['gctp-countries','gctp-minage','gctp-maxage','gctp-grades'].includes(id))return 6;
  if(['gctp-flow','gctp-description'].includes(id)||(!id&&n.classList.contains('gcc203-hint')&&i<8))return 7;
  if(['gctp-platform','gctp-platform-option','gctp-meeting','gctp-breakout','gctp-breakoutnotes'].includes(id)||(!id&&n.classList.contains('gcc203-hint')&&i<15))return 8;
  if(i===0&&n.tagName==='H3'){n.hidden=true;return null;}
  return 9;
 });
 pack(groups[3],()=>10);
 // Large selection cards mirror the original native selects. They are not
 // additional form fields; only the canonical select is serialized.
 const choiceGroups=[];
 for(const id of ['gctp-theme']){
  const select=$(id),label=select.closest('label');
  const cards=document.createElement('div');cards.className='gcc242-choice-grid';cards.setAttribute('role','group');
  cards.setAttribute('aria-label','Session theme *');
  const buttons=[];
  for(const option of select.options){
   const button=document.createElement('button');button.type='button';button.className='gcc242-choice';button.textContent=option.textContent;
   button.dataset.value=option.value;button.addEventListener('click',()=>{
    select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));refresh();
   });cards.append(button);buttons.push(button);
  }
  const refresh=()=>{syncThemeV244(root);for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.value===select.value));};
  select.hidden=true;select.tabIndex=-1;label.after(cards);
  select.addEventListener('change',refresh);choiceGroups.push(refresh);refresh();
 }
 let index=0,closing=false;
 function render({focus=false}={}){
  const screen=WIZARD_SCREENS_V242[index];
  for(const refresh of choiceGroups)refresh();
  for(const panel of panels)panel.hidden=Number(panel.dataset.gcc242Screen)!==index;
  slot.hidden=index<5||index>9;
  $('gcc242-question').textContent=screen.title;
  $('gcc242-hint').textContent=screen.hint;
  $('gctp-form-step').textContent=(index+1)+' / '+WIZARD_SCREENS_V242.length;
  $('gcc242-progress').style.width=((index+1)/WIZARD_SCREENS_V242.length*100)+'%';
  $('gctp-back').hidden=index===0;
  $('gctp-next').hidden=index===10;
  $('gctp-publish').hidden=index!==10;
  for(const n of form.querySelectorAll('[data-gcs150-step-dot]')){
   const active=Number(n.dataset.gcs150StepDot)===screen.group;
   if(active)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');
  }
  if(focus&&dialog.open)$('gcc242-question').focus({preventScroll:true});
  body.scrollTop=0;
  if(dialog.hasAttribute('data-gcc243-short'))dialog.scrollTop=0;
 }
 function go(next,{focus=true}={}){
  if(next<0||next>=WIZARD_SCREENS_V242.length)return;
  const group=screenGroupV242(next);
  if(group!==screenGroupV242(index))onGroup(group);
  index=next;render({focus});
 }
 function sync(group){
  index=firstScreenV242(group);render();
 }
 function reveal(field){
  const panel=field?.closest('[data-gcc242-screen]');
  if(panel){go(Number(panel.dataset.gcc242Screen),{focus:false});return true;}
  return false;
 }
 function open(){
  if(!root.isConnected||!canOpen()||dialog.open||dialog.closest('[hidden]'))return;
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  render({focus:true});keyboardViewport.start();
 }
 function close(){
  if(dialog.open){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}keyboardViewport.stop();
 }
 async function pause(){
  if(closing||isBusy())return;
  closing=true;$('gcc242-close').disabled=true;
  try{if(await onClose()!==false){close();launch.focus();}}
  finally{closing=false;$('gcc242-close').disabled=false;}
 }
 launch.addEventListener('click',open);
 $('gcc242-close').addEventListener('click',pause);
 dialog.addEventListener('cancel',e=>{e.preventDefault();pause();});
 // Enter should not trigger the implicit submit button on early steps.
 form.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&index!==10&&e.target.matches('input:not([type=radio]):not([type=checkbox]):not([type=file])'))e.preventDefault();
 });
 return {sync,go,reveal,open,close,render,index:()=>index,group:()=>screenGroupV242(index),isOpen:()=>dialog.open};
}
