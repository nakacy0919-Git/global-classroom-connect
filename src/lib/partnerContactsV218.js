// Approved GCC partners can voluntarily share a contact method for one request.
// No chat, no polling, no direct table access, no publicly exposed phone numbers.
import {teacherPartnerContactsV218,teacherSavePartnerContactV218} from '../services/teacherSelfService.js';
import '../styles/partnerContactsV218.css';

const LABELS=Object.freeze({
 email:'Email',whatsapp:'WhatsApp',line:'LINE',
 messenger:'Facebook Messenger',other:'Other'
});

export function mountApprovedPartnerContactV218(mount,requestId){
 const details=document.createElement('details');
 details.className='gcc218-contact';
 const summary=document.createElement('summary');
 summary.textContent='Private contact exchange';
 const body=document.createElement('div');
 body.className='gcc218-contact-body';
 const note=document.createElement('p');
 note.textContent='Share a contact method only with this approved partner. Use a school-managed account if possible. You can change or remove your contact at any time.';
 const partner=document.createElement('p');
 partner.className='gcc218-partner-contact';
 partner.textContent='Open to view the contact shared by your partner.';
 const form=document.createElement('form');
 form.className='gcc218-contact-form';
 const channelLabel=document.createElement('label');
 channelLabel.textContent='My preferred contact method';
 const channel=document.createElement('select');
 for(const [value,label] of Object.entries(LABELS)){
  const option=document.createElement('option');
  option.value=value;option.textContent=label;
  channel.append(option);
 }
 channelLabel.append(channel);
 const valueLabel=document.createElement('label');
 valueLabel.textContent='My address, account name, or contact link';
 const value=document.createElement('input');
 value.type='text';value.maxLength=180;value.required=true;
 value.placeholder='Share only what you want this partner to see';
 value.autocomplete='off';
 valueLabel.append(value);
 const buttons=document.createElement('div');
 buttons.className='gcc218-contact-actions';
 const save=document.createElement('button');
 save.type='submit';save.className='gct-primary';save.textContent='Share with this partner';
 const remove=document.createElement('button');
 remove.type='button';remove.className='gct-secondary';remove.textContent='Remove my shared contact';
 buttons.append(save,remove);
 const status=document.createElement('p');
 status.className='gcc218-contact-status';
 status.setAttribute('role','status');
 form.append(channelLabel,valueLabel,buttons);
 body.append(note,partner,form,status);
 details.append(summary,body);mount.append(details);

 let loaded=false,busy=false,viewGeneration=0;
 function setBusy(next){
  busy=next;
  const enabled=details.open&&loaded&&!busy;
  save.disabled=!enabled;remove.disabled=!enabled;channel.disabled=!enabled;value.disabled=!enabled;
 }
 function clearPrivateView(){
  loaded=false;channel.value='email';value.value='';remove.hidden=true;
  partner.textContent='Open to view the contact shared by your partner.';
  status.textContent='';
  setBusy(busy);
 }
 clearPrivateView();
 async function load(savedNotice=''){
  if(busy||!details.open)return;
  const generation=viewGeneration;
  loaded=false;setBusy(true);status.textContent=savedNotice||'Loading private contact details…';
  try{
   const current=await teacherPartnerContactsV218(requestId);
   if(!details.open||generation!==viewGeneration)return;
   const mine=current?.mine;
   if(mine){channel.value=mine.channel;value.value=mine.value;}
   else {channel.value='email';value.value='';}
   const other=current?.partner;
   // Use only textContent: a contact handle or URL never becomes executable HTML.
   partner.textContent=other
    ?'Partner shared ('+(LABELS[other.channel]||'Contact')+'): '+other.value
    :'Your partner has not shared a contact method yet. You can share yours, or ask the GCC administrator for help.';
   remove.hidden=!mine;
   status.textContent=(savedNotice?savedNotice+' ':'')+'Only this approved partner can see your shared contact.';
   loaded=true;
  }catch{
   if(!details.open||generation!==viewGeneration)return;
   clearPrivateView();
   status.textContent=savedNotice
    ?savedNotice+' The contact view could not refresh. Close and reopen it to check.'
    :'Private contacts could not be verified. Close and reopen to retry, or contact the GCC administrator.';
  }
  finally{
   setBusy(false);
   if(details.open&&generation!==viewGeneration)void load();
  }
 }
 details.addEventListener('toggle',()=>{
  viewGeneration++;
  clearPrivateView();
  if(details.open&&!busy)void load();
 });
 async function writeContact(ch,val,notice){
  if(busy||!loaded||!details.open)return;
  const generation=viewGeneration;
  setBusy(true);
  try{
   await teacherSavePartnerContactV218(requestId,ch,val);
  }catch{
   if(details.open&&generation===viewGeneration){
    clearPrivateView();
    status.textContent='Contact change could not be confirmed. Close and reopen to check before trying again.';
   }
   setBusy(false);
   if(details.open&&generation!==viewGeneration)void load();
   return;
  }
  clearPrivateView();setBusy(false);
  if(details.open)await load(notice);
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!loaded||!details.open)return;
  if(!value.value.trim()){status.textContent='Enter a contact address or account name.';value.focus();return;}
  await writeContact(channel.value,value.value.trim(),'Contact shared.');
 });
 remove.addEventListener('click',async()=>{
  await writeContact('','','Shared contact removed.');
 });
 return details;
}
