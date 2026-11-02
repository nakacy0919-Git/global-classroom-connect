// GCC V20.4: keyboard-friendly validation that points to the actual field.
// No form values are rewritten and no data is submitted by this helper.
const ruleList=[
 [/session name|session title|title/i,'name'],
 [/future date|date and time|date is|session date/i,'date'],
 [/school time zone|time zone is missing/i,'zone'],
 [/start time|session start|from time|session hours/i,'from'],
 [/end time|until|after its start|end must/i,'to'],
 [/students|student count/i,'students'],
 [/breakout rooms|room count/i,'rooms'],
 [/partner school level|school level/i,'levels'],
 [/registration deadline|deadline/i,'deadline'],
 [/first flow|agenda must begin|flow activity must start/i,'flow'],
 [/flow|agenda|activity|timetable|timed stages|closing/i,'flow'],
 [/objectives|preparation|description/i,'description'],
 [/min.*max.*age|acceptable age|accepted age|ages must/i,'minage'],
 [/desired number|preferred students/i,'preferred'],
 [/valid session type|session type/i,'type'],
 [/platform|meeting link|HTTPS/i,'platform'],
 [/flyer|image/i,'flyerfile']
];
export function errorFieldV204(message,root,prefix){
 const text=String(message||'');
 for(const [regex,key] of ruleList){
  if(!regex.test(text))continue;
  const id=key==='levels'?'input[name="gctp-target-level"]':'#'+prefix+'-'+key;
  const node=root.querySelector(id);
  if(node)return node;
 }
 return null;
}
function visible(node){return Boolean(node&&!node.closest('[hidden]'));}
export function firstInvalidV204(container){
 const fields=[...container.querySelectorAll('input,select,textarea')].filter(
   n=>visible(n)&&!n.disabled&&n.type!=='hidden'&&n.type!=='button'&&n.type!=='submit'
 );
 return fields.find(n=>n.required&&!n.checkValidity())||null;
}
export function createFieldGuideV204(root,form){
 let current=null,help=null;
 const clear=()=>{
  if(current){current.removeAttribute('aria-invalid');current.classList.remove('gcc204-invalid');}
  if(help){help.remove();help=null;}
  current=null;
 };
 const targetFor=(message,step,prefix)=>{
  const container=form.querySelector('[data-gctp-form-section="'+step+'"]')||
    form.querySelector('[data-gcc204-section="'+step+'"]')||form;
  const empty=firstInvalidV204(container);
  const mapped=errorFieldV204(message,root,prefix);
  // The server-side or semantic error is more specific than generic required fields.
  return mapped&&visible(mapped)?mapped:empty||mapped||container.querySelector('input,select,textarea');
 };
 const show=(message,step=0,prefix='gctp')=>{
  clear();
  const target=targetFor(message,step,prefix);
  if(!target)return null;
  current=target;
  target.classList.add('gcc204-invalid');
  target.setAttribute('aria-invalid','true');
  const fieldset=target.closest('fieldset');
  const wrapper=fieldset||target.closest('label')||target.parentElement;
  const messageEl=document.createElement('p');
  messageEl.className='gcc204-inline-error';
  messageEl.setAttribute('role','alert');
  messageEl.textContent=String(message||'Please correct this field.');
  wrapper?.append(messageEl);help=messageEl;
  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  target.scrollIntoView?.({behavior:reduceMotion?'auto':'smooth',block:'center',inline:'nearest'});
  try{target.focus({preventScroll:true});}catch{target.focus?.();}
  return target;
 };
 form.addEventListener('input',event=>{
  if(current&&(event.target===current||current.closest('fieldset')?.contains(event.target)))clear();
 });
 form.addEventListener('change',event=>{
  if(current&&(event.target===current||current.closest('fieldset')?.contains(event.target)))clear();
 });
 return {show,clear};
}
