import '../styles/sessionCalendarV166.css';
const node=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=text;return n;};
const pad=n=>String(n).padStart(2,'0');
export function sessionDayV166(iso,zone='Asia/Tokyo'){
 if(!iso||Number.isNaN(Date.parse(iso)))return '';
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
  const value=type=>parts.find(p=>p.type===type)?.value||'';
  return value('year')+'-'+value('month')+'-'+value('day');
 }catch{return '';}
}
export function sessionMonthV166(iso,zone='Asia/Tokyo'){return sessionDayV166(iso,zone).slice(0,7);}
export function mountSessionCalendarV166(root,{events=[],zone='Asia/Tokyo',onSelect,initialMonth,heading='Session calendar'}={}){
 let month=/^\d{4}-\d{2}$/.test(initialMonth||'')?initialMonth:
  sessionMonthV166(events.find(e=>e.starts_at)?.starts_at,zone)||sessionDayV166(new Date().toISOString(),zone).slice(0,7);
 let selected='';
 const shell=node('section','gcc-v166-calendar');shell.setAttribute('aria-label',heading);
 const header=node('div','gcc-v166-header');
 const title=node('h3','',heading);
 const controls=node('div','gcc-v166-controls');
 const previous=node('button','gcc-v166-nav','‹');previous.type='button';previous.setAttribute('aria-label','Previous month');
 const caption=node('strong','gcc-v166-month');
 const next=node('button','gcc-v166-nav','›');next.type='button';next.setAttribute('aria-label','Next month');
 const today=node('button','gcc-v166-today','Today');today.type='button';
 controls.append(previous,caption,next,today);header.append(title,controls);
 const weekdays=node('div','gcc-v166-weekdays');for(const day of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])weekdays.append(node('span','',day));
 const grid=node('div','gcc-v166-grid');grid.setAttribute('role','grid');grid.setAttribute('aria-label','Sessions by date');
 const legend=node('p','gcc-v166-legend','Select a session card to see its details.');
 shell.append(header,weekdays,grid,legend);root.append(shell);
 function move(delta){const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+delta,1));month=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1);paint();}
 function paint(){
  const [year,m]=month.split('-').map(Number);
  caption.textContent=new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,m-1,1)));
  grid.replaceChildren();
  const start=new Date(Date.UTC(year,m-1,1)).getUTCDay();
  const days=new Date(Date.UTC(year,m,0)).getUTCDate();
  const byDay=new Map();
  for(const event of events){const day=sessionDayV166(event.starts_at,zone);if(day.slice(0,7)!==month)continue;
   if(!byDay.has(day))byDay.set(day,[]);byDay.get(day).push(event);}
  for(let i=0;i<start;i++){const blank=node('div','gcc-v166-cell gcc-v166-blank');blank.setAttribute('aria-hidden','true');grid.append(blank);}
  for(let d=1;d<=days;d++){
   const key=month+'-'+pad(d),cell=node('div','gcc-v166-cell');
   cell.setAttribute('role','gridcell');cell.append(node('span','gcc-v166-day',String(d)));
   const items=byDay.get(key)||[];
   for(const event of items.slice(0,4)){
    const card=node('button','gcc-v166-card gcc-v166-'+String(event.status||'published').replace(/[^a-z]/gi,''),
      event.title||'Untitled session');
    card.type='button';card.title=(event.title||'Session')+' · '+event.status;
    card.setAttribute('aria-label',event.title+' · '+key+' · '+event.status);
    if(selected===event.id)card.classList.add('gcc-v166-selected');
    card.addEventListener('click',()=>{selected=event.id;onSelect?.(event);paint();});
    cell.append(card);
   }
   if(items.length>4)cell.append(node('span','gcc-v166-more','+'+(items.length-4)+' more'));
   grid.append(cell);
  }
 }
 previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 today.addEventListener('click',()=>{month=sessionDayV166(new Date().toISOString(),zone).slice(0,7);paint();});
 paint();
 return {setEvents(nextEvents){events=nextEvents||[];paint();},select(id){selected=id;const event=events.find(e=>e.id===id);if(event){month=sessionMonthV166(event.starts_at,zone)||month;}paint();},showMonth(value){if(/^\d{4}-\d{2}$/.test(value)){month=value;paint();}}};
}
