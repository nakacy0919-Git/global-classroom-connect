// Load only for an explicitly protected session. No roster values are sent to Turnstile.
let loading;
function turnstileApi(){
 if(window.turnstile?.render)return Promise.resolve(window.turnstile);
 if(!loading)loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=setTimeout(()=>{script.remove();reject(Error('Verification could not load'));},12000);
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;script.defer=true;script.referrerPolicy='no-referrer';
  script.onload=()=>{clearTimeout(timer);if(window.turnstile?.render)resolve(window.turnstile);else reject(Error('Verification unavailable'));};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Verification could not load'));};
  document.head.append(script);
 }).catch(err=>{loading=null;throw err;});
 return loading;
}
export function createRosterBotWidgetV239({mount,status,retry,sitekey}){
 let generation=0,widget=null,token='',api=null,eventId=null;
 const clear=()=>{
  generation++;token='';eventId=null;
  if(widget!==null){try{api?.remove(widget);}catch{}}
  widget=null;mount.replaceChildren();retry.hidden=true;
 };
 async function show(id){
  clear();eventId=id;const seq=generation;
  status.textContent='Loading security verification…';
  if(!sitekey){status.textContent='Security verification is not configured. Contact your host.';return;}
  try{
   api=await turnstileApi();if(seq!==generation||!mount.isConnected)return;
   const valid=()=>seq===generation&&mount.isConnected;
   widget=api.render(mount,{sitekey,action:'gcc_roster',cData:id,theme:'auto',
    callback:value=>{if(valid()){token=value;status.textContent='Security verification ready.';retry.hidden=true;}},
    'expired-callback':()=>{if(valid()){token='';status.textContent='Verification expired. Retry the security check.';retry.hidden=false;}},
    'error-callback':()=>{if(valid()){token='';status.textContent='Verification unavailable. Retry or ask your school ICT administrator.';retry.hidden=false;}}
   });
  }catch{if(seq===generation&&mount.isConnected){status.textContent='Verification could not load. Retry or contact your host.';retry.hidden=false;}}
 }
 retry.addEventListener('click',()=>{if(eventId)void show(eventId);});
 return {show,clear,takeToken(id){if(eventId!==id||!token)throw Error('GCC_BOT_REQUIRED');const value=token;token='';return value;},refresh(){if(eventId)void show(eventId);}};
}
