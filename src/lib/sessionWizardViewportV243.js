// Fit the native dialog to the visible viewport, not the layout viewport.
// iPadOS software keyboards can shrink visualViewport without changing CSS dvh.
// Keep all form controls mounted and never disable pinch zoom.
export function wizardViewportV243(viewport,layout,editing=false){
 const positive=(n,fallback)=>Number.isFinite(n)&&n>0?n:fallback;
 const height=positive(viewport?.height,positive(layout.innerHeight,600));
 const width=positive(viewport?.width,positive(layout.innerWidth,800));
 const top=Number.isFinite(viewport?.offsetTop)?viewport.offsetTop:0;
 const left=Number.isFinite(viewport?.offsetLeft)?viewport.offsetLeft:0;
 const compact=height<=520||(editing&&layout.innerHeight-height>=100);
 const gap=compact?6:14;
 return {height,width,top,left,compact,gap,available:Math.max(1,height-gap*2)};
}
const editable=node=>Boolean(node?.matches?.('textarea:not([readonly]):not([disabled]),input:not([readonly]):not([disabled]):not([type=radio]):not([type=checkbox]):not([type=file]):not([type=button]):not([type=submit]):not([type=hidden])'));
export function bindWizardViewportV243(dialog,body,{viewport=window.visualViewport,layout=window}={}){
 let active=false,frame=0,watch=null;
 const done=dialog.querySelector('#gcc243-done');
 function keepFieldVisible(){
  const field=document.activeElement;
  if(!editable(field)||!body.contains(field))return;
  // In extremely short split-screen mode the dialog itself is the scroller;
  // otherwise scroll only its body. Never scroll the background document.
  const scroller=dialog.hasAttribute('data-gcc243-short')?dialog:body;
  const area=scroller.getBoundingClientRect(),rect=field.getBoundingClientRect();
  const padding=10,room=area.height-padding*2;
  if(room<=0)return;
  const top=area.top+padding,bottom=area.bottom-padding;
  if(rect.top<top||rect.height>room){scroller.scrollTop+=rect.top-top;}
  else if(rect.bottom>bottom){scroller.scrollTop+=rect.bottom-bottom;}
 }
 function update(){
  if(!active)return;
  if(!dialog.isConnected||!dialog.open){stop();return;}
  const editing=editable(document.activeElement)&&body.contains(document.activeElement);
  const v=wizardViewportV243(viewport,layout,editing);
  dialog.style.setProperty('--gcc243-height',v.available+'px');
  dialog.style.setProperty('--gcc243-width',v.width+'px');
  dialog.style.setProperty('--gcc243-top',(v.top+v.gap)+'px');
  dialog.style.setProperty('--gcc243-left',(v.left+v.width/2)+'px');
  dialog.toggleAttribute('data-gcc243-compact',v.compact);
  dialog.toggleAttribute('data-gcc243-short',v.available<200);
  dialog.toggleAttribute('data-gcc243-editing',editing);
  if(done)done.hidden=!editing||!v.compact;
  if(frame)cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{frame=0;if(active&&dialog.open&&v.compact)keepFieldVisible();});
 }
 function stop(){
  if(!active)return;active=false;
  viewport?.removeEventListener?.('resize',update);
  viewport?.removeEventListener?.('scroll',update);
  layout.removeEventListener('resize',update);
  dialog.removeEventListener('focusin',update);
  dialog.removeEventListener('focusout',queueUpdate);
  watch?.disconnect();watch=null;
  if(frame)cancelAnimationFrame(frame);frame=0;
  for(const attr of ['compact','short','editing'])dialog.removeAttribute('data-gcc243-'+attr);
  for(const key of ['height','width','top','left'])dialog.style.removeProperty('--gcc243-'+key);
  if(done)done.hidden=true;
 }
 function queueUpdate(){queueMicrotask(update);}
 function start(){
  if(active){update();return;}
  active=true;
  viewport?.addEventListener?.('resize',update,{passive:true});
  viewport?.addEventListener?.('scroll',update,{passive:true});
  layout.addEventListener('resize',update,{passive:true});
  dialog.addEventListener('focusin',update);
  dialog.addEventListener('focusout',queueUpdate);
  if(typeof MutationObserver!=='undefined'){
   watch=new MutationObserver(()=>{if(!dialog.isConnected)stop();});
   watch.observe(document.body,{childList:true,subtree:true});
  }
  update();
 }
 dialog.addEventListener('close',()=>{if(!dialog.open)stop();});
 // Keep the focused field until the click, then dismiss the keyboard without
 // submitting, resetting or leaving this question.
 done?.addEventListener('pointerdown',e=>e.preventDefault());
 done?.addEventListener('click',()=>{if(editable(document.activeElement))document.activeElement.blur();dialog.querySelector('#gcc242-question')?.focus({preventScroll:true});queueUpdate();});
 return {start,stop,update};
}
