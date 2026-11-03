// GCC V21.4: focused private text chat for approved partner teachers.
// Simple polling only when the teacher workspace is visible; no paid realtime/email.
import {
 teacherMessageThreadsV214,teacherThreadMessagesV214,
 teacherSendMessageV214,teacherMarkMessageReadV214
} from '../services/teacherSelfService.js';
import {timeRangeV112} from './sessionTimeV112.js';
import {unreadTotalV214,chatBadgeV214} from './messageUnreadV214.js';
import {calendarMenuV214} from './sessionCalendarExportV214.js';
import {countryFlagSrcV209} from './sessionVisualV209.js';

const make=(tag,cls='',message='')=>{
 const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=message;return el;
};
const stamp=(iso,zone)=>{try{
 return new Intl.DateTimeFormat('en',{timeZone:zone||'UTC',
  month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
}catch{return '';}};
export function mountTeacherMessagesV214(root,{getIdentity,onUnread,onError,onOpenView}){
 const panel=root.querySelector('#gcs214-messages-view');
 const list=root.querySelector('#gcs214-thread-list');
 const history=root.querySelector('#gcs214-chat-history');
 const heading=root.querySelector('#gcs214-chat-heading');
 const compose=root.querySelector('#gcs214-compose');
 const textarea=root.querySelector('#gcs214-chat-input');
 const submit=root.querySelector('#gcs214-send');
 const refreshButton=root.querySelector('#gcs214-refresh');
 let threads=[],activeId='',lastRendered='',loading=false,loadingMessages=false;
 let activeEpoch=0;
 const report=err=>onError?.(err?.message||String(err||'Message service is unavailable'));
 const ready=()=>Boolean(getIdentity?.())&&root.isConnected;
 function threadById(id){return threads.find(t=>t.request_id===id);}
 function renderThreads(){
  list.replaceChildren();
  if(!threads.length){
   list.append(make('p','gcs214-empty','No conversations yet. Once a partner teacher is approved, the conversation will appear here.'));
   return;
  }
  for(const t of threads){
   const item=make('button','gcs214-thread'+(t.request_id===activeId?' gcs214-selected':''));
   item.type='button';item.setAttribute('aria-current',String(t.request_id===activeId));
   const top=make('span','gcs214-thread-top');
   const name=make('strong','',t.partner_name||'Partner teacher');
   top.append(name);
   if(Number(t.unread_count)>0){
    const badge=make('span','gcs214-badge',chatBadgeV214(Number(t.unread_count)));
    badge.setAttribute('aria-label',t.unread_count+' unread messages');top.append(badge);
   }
   const school=make('span','gcs214-thread-school',t.partner_school||'Partner school');
   if(/^[A-Z]{2}$/.test(t.partner_country_code||'')){
    const img=make('img','gcs214-thread-flag');
    img.src=countryFlagSrcV209(t.partner_country_code);
    img.alt=t.partner_country_code+' flag';img.width=26;img.height=19;school.prepend(img);
   }
   const title=make('span','gcs214-thread-session',t.title||'Global Classroom Session');
   const preview=make('span','gcs214-thread-preview',t.last_message||'Start the conversation');
   item.append(top,school,title,preview);
   item.addEventListener('click',()=>selectThread(t.request_id));
   list.append(item);
  }
 }
 function renderHeading(t){
  heading.replaceChildren();
  if(!t){heading.append(make('h4','','Choose a conversation'));compose.hidden=true;return;}
  heading.append(make('h4','',t.partner_name||'Partner teacher'),
   make('p','',t.title||'Global Classroom Session'));
  const meta=make('div','gcs214-chat-meta');
  meta.append(make('small','',timeRangeV112(t.starts_at,t.ends_at,getIdentity()?.timezone||t.timezone)));
  meta.append(calendarMenuV214({id:t.offer_id,title:t.title,
   starts_at:t.starts_at,ends_at:t.ends_at,viewer_zone:getIdentity()?.timezone||t.timezone}));
  heading.append(meta);compose.hidden=false;
 }
 async function refreshThreads({quiet=false}={}){
  if(!ready()||loading)return;
  loading=true;
  try{
   const data=await teacherMessageThreadsV214();
   threads=Array.isArray(data)?data:[];
   if(activeId&&!threadById(activeId)){
    activeId='';lastRendered='';activeEpoch++;
    history.replaceChildren(make('p','gcs214-empty','This conversation is no longer available.'));
    renderHeading(null);
   }
   onUnread?.(unreadTotalV214(threads));
   renderThreads();
   if(!activeId&&!panel.hidden&&threads.length)await selectThread(threads[0].request_id);
  }catch(e){if(!quiet)report(e);}
  finally{loading=false;}
 }
 async function loadMessages({quiet=false}={}){
  if(!ready()||!activeId||loadingMessages||panel.hidden||document.hidden)return;
  const requested=activeId,epoch=activeEpoch;loadingMessages=true;
  try{
   const entries=await teacherThreadMessagesV214(requested);
   if(activeId!==requested||activeEpoch!==epoch)return;
   const messages=Array.isArray(entries)?entries:[];
   const signature=messages.map(m=>m.id).join(',');
   if(signature!==lastRendered){
    const nearBottom=history.scrollHeight-history.scrollTop-history.clientHeight<95;
    history.replaceChildren();
    if(!messages.length)history.append(make('p','gcs214-empty',
     'Your conversation starts here. Discuss your agenda, breakout rooms, and meeting arrangements.'));
    for(const m of messages){
     const row=make('article','gcs214-bubble'+(m.is_mine?' gcs214-mine':' gcs214-theirs'));
     row.append(make('p','',m.body),make('small','',stamp(m.created_at,getIdentity()?.timezone)));
     history.append(row);
    }
    if(nearBottom||!lastRendered)history.scrollTop=history.scrollHeight;
    lastRendered=signature;
   }
   // Read only messages returned from the server and actually displayed.
   if(messages.length){
    await teacherMarkMessageReadV214(requested,messages[messages.length-1].id);
    const thread=threadById(requested);
    if(thread&&Number(thread.unread_count)>0){
     thread.unread_count=0;
     onUnread?.(unreadTotalV214(threads));renderThreads();
    }
   }
  }catch(e){if(!quiet)report(e);}
  finally{loadingMessages=false;}
 }
 async function selectThread(id){
  if(!threadById(id)){await refreshThreads();if(!threadById(id))return;}
  if(activeId!==id){activeId=id;activeEpoch++;lastRendered='';history.replaceChildren();}
  renderHeading(threadById(id));renderThreads();
  onOpenView?.();
  await loadMessages();
 }
 compose.addEventListener('submit',async event=>{
  event.preventDefault();
  const body=textarea.value.trim();
  if(!activeId||!body){textarea.focus();return;}
  if(body.length>2000){report('Message must be 2000 characters or less');return;}
  submit.disabled=true;
  try{
   await teacherSendMessageV214(activeId,body);
   textarea.value='';
   lastRendered='';
   await loadMessages();
   await refreshThreads({quiet:true});
   textarea.focus();
  }catch(e){report(e);}
  finally{submit.disabled=false;}
 });
 textarea.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){
   event.preventDefault();compose.requestSubmit();
  }
 });
 refreshButton.addEventListener('click',async()=>{
  refreshButton.disabled=true;
  try{await refreshThreads();await loadMessages();}
  finally{refreshButton.disabled=false;}
 });
 renderHeading(null);
 return {
  async open(requestId=''){
   if(!ready())return;
   if(!threads.length)await refreshThreads();
   if(requestId)await selectThread(requestId);
   else{
    onOpenView?.();
    if(!activeId&&threads.length)await selectThread(threads[0].request_id);
    else if(activeId)await loadMessages();
   }
  },
  refreshThreads,
  async poll(){
   if(!ready()||document.hidden)return;
   await refreshThreads({quiet:true});
   if(!panel.hidden&&activeId)await loadMessages({quiet:true});
  }
 };
}
