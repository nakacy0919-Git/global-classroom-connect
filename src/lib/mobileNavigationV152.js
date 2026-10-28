// GCC V15.2 — mobile-only navigation drawer, with keyboard and focus management.
// The desktop sidebar and existing routes remain unchanged.
let activeController=null;
export function bindMobileNavigationV152(){
 activeController?.abort();
 const controller=new AbortController();activeController=controller;
 const sidebar=document.querySelector('#gcc-mobile-sidebar');
 const openButton=document.querySelector('#gcc-mobile-menu-button');
 const closeButton=sidebar?.querySelector('.gcc-mobile-drawer-close');
 const overlay=document.querySelector('#gcc-mobile-nav-backdrop');
 if(!sidebar||!openButton||!closeButton||!overlay)return;
 const media=window.matchMedia('(max-width: 920px)');
 const signal=controller.signal;
 const appShell=document.querySelector('.app-shell');
 const setOpen=(open,restoreFocus=false)=>{
  const visible=Boolean(open&&media.matches);
  sidebar.classList.toggle('gcc-mobile-drawer-open',visible);
  appShell?.classList.toggle('gcc-mobile-drawer-is-open',visible);
  document.body.classList.toggle('gcc-mobile-menu-open',visible);
  openButton.setAttribute('aria-expanded',String(visible));
  overlay.hidden=!visible;
  if(visible){closeButton.focus({preventScroll:true});}
  else if(restoreFocus&&media.matches&&openButton.isConnected){openButton.focus({preventScroll:true});}
 };
 openButton.addEventListener('click',()=>setOpen(!sidebar.classList.contains('gcc-mobile-drawer-open'),true),{signal});
 closeButton.addEventListener('click',()=>setOpen(false,true),{signal});
 overlay.addEventListener('click',()=>setOpen(false,true),{signal});
 sidebar.addEventListener('click',event=>{
  if(event.target.closest('a[href]'))setOpen(false,false);
 },{signal});
 document.addEventListener('keydown',event=>{
  if(!sidebar.classList.contains('gcc-mobile-drawer-open'))return;
  if(event.key==='Escape'){event.preventDefault();setOpen(false,true);return;}
  if(event.key!=='Tab')return;
  const items=[...sidebar.querySelectorAll('a[href],button:not([disabled])')].filter(el=>el.getClientRects().length);
  if(!items.length)return;
  const first=items[0],last=items[items.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 },{signal});
 // Close the drawer when rotating the device or switching from mobile to desktop.
 const onChange=()=>{if(!media.matches)setOpen(false,false);};
 media.addEventListener?.('change',onChange,{signal});
 window.addEventListener('hashchange',()=>setOpen(false,false),{signal});
 return ()=>{setOpen(false,false);controller.abort();};
}
