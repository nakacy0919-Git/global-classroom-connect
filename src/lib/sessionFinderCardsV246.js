import {sessionTimeLabelsV209} from './sessionVisualV209.js';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
// Only public session summary data on the list; no nested interactive controls.
export function compactSessionCardV246(info,onOpen){
 const b=el('button','gcc246-session-card');b.type='button';
 b.dataset.sessionKey=String(info.key);
 const title=el('strong','gcc246-card-title',info.title||'International classroom exchange');
 const country=el('span','gcc246-card-country',(info.flag||'🌐')+' '+(info.country||'Host country not specified'));
 const school=el('span','gcc246-card-school',info.school||'School name unavailable');
 const t=sessionTimeLabelsV209(info.start,info.end,info.zone);
 const when=el('span','gcc246-card-when');
 when.append(el('span','gcc246-card-date',t.day),el('strong','gcc246-card-hours',t.hours));
 const foot=el('span','gcc246-card-foot');
 if(info.own)foot.append(el('span','gcc246-own','Your Session'));
 foot.append(el('span','gcc246-open-label','View details →'));
 b.append(country,title,school,when,foot);
 b.addEventListener('click',()=>onOpen(b));return b;
}
export function sessionDetailsDialogV246(){
 const dialog=el('dialog','gcc246-details-dialog');
 dialog.id='gcc246-session-details';dialog.setAttribute('aria-labelledby','gcc246-details-title');
 const header=el('header','gcc246-dialog-head'),title=el('h2','','Session details');
 title.id='gcc246-details-title';title.tabIndex=-1;
 const close=el('button','gcc246-close','×');close.type='button';close.setAttribute('aria-label','Close session details');
 header.append(title,close);
 const body=el('div','gcc246-dialog-body');
 const status=el('p','gcc246-detail-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 body.append(status);dialog.append(header,body);
 let trigger=null;
 function clear(){body.replaceChildren(status);status.textContent='';}
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{if(dialog.open)return;clear();if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;});
 function open(button,createDetail){
  if(dialog.open)return;
  clear();trigger=button;
  try{body.append(createDetail());}catch{status.textContent='Could not open session details. Please try again.';}
  dialog.showModal();body.scrollTop=0;title.focus({preventScroll:true});
 }
 function dismiss(){if(dialog.open)dialog.close();clear();}
 return {dialog,open,dismiss,status};
}
