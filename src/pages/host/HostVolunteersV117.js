import '../../styles/volunteerV117.css';
import '../../styles/teacherSelfService.css';
import {volunteersForHostV117} from '../../services/teacherExtrasV117.js';
const make=(tag,cls='',value='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=String(value||'');return n;};
export function HostVolunteersPageV117(){return `<section class="gct-workspace"><header class="gct-banner"><div><p class="gct-eyebrow">GLOBAL CLASSROOM · HOST OPERATIONS</p><h2>Volunteer Team</h2><p>Teachers who offered to help with Global Classroom-hosted sessions.</p></div></header><div class="gct-panel"><p class="gct-hint">An offer of support never grants host permissions or assigns the teacher to an event. Confirm assignments individually.</p><div id="gcc117-host-volunteers" class="gct-card-list">Loading volunteer offers…</div></div></section>`;}
export function bindHostVolunteersV117(){const root=document.querySelector('#gcc117-host-volunteers');if(!root)return;
 volunteersForHostV117().then(items=>{root.replaceChildren();if(!items?.length){root.append(make('p','gct-hint','No volunteers have registered yet.'));return;}
 for(const item of items){const card=make('article','gct-session-card');card.append(make('h3','',item.name),make('p','',`${item.school||'School'} · ${item.country||'Country'} · ${item.school_level||'School level not set'}`),
 make('p','',`${item.facilitator?'Facilitator · ':''}${item.host?'GC Host / Co-host':''}`));
 if(item.note)card.append(make('p','',item.note));if(item.email)card.append(make('p','',item.email));root.append(card);}
 }).catch(error=>{root.textContent=error.message||'Unable to load volunteers.';});
}
