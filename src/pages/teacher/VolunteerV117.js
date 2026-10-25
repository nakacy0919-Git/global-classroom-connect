import '../../styles/volunteerV117.css';
import {volunteerGalleryMarkupV122,mountVolunteerGalleryV122} from './VolunteerGalleryV122.js';
import {myDetailsV117,saveVolunteerV117} from '../../services/teacherExtrasV117.js';
export function volunteerMarkupV117(){return `<div class="gcc117-volunteer">
  <header class="gcc117-volunteer-intro"><div class="gcc117-volunteer-kicker">GLOBAL CLASSROOM · COMMUNITY TEAM</div>
    <h3>Bring the world together.</h3><p>Offer to support <strong>Global Classroom-hosted sessions</strong> as a facilitator or session host. This is an expression of interest, not automatic assignment or administrator access.</p></header>
  ${volunteerGalleryMarkupV122()}
  <div class="gcc122-join-heading" id="gcc122-join-form"><h3>I’d love to help!</h3><p>Share how you could support an upcoming Global Classroom-hosted exchange.</p></div>
  <div class="gcc117-volunteer-layout"><form id="gcc117-volunteer-form" class="gct-panel">
    <h3>How would you like to help?</h3>
    <label class="gcc117-volunteer-choice"><input id="gcc117-want-facilitator" type="checkbox"/><span><strong>🌍 Breakout room facilitator</strong><small>Help small groups communicate and take turns across countries.</small></span></label>
    <label class="gcc117-volunteer-choice"><input id="gcc117-want-host" type="checkbox"/><span><strong>🎤 Online session host / co-host</strong><small>Help coordinate a Global Classroom event, welcome participants and support the Zoom session.</small></span></label>
    <label class="gcc117-volunteer-label">Your experience and availability (optional)<textarea id="gcc117-volunteer-note" rows="4" maxlength="600" placeholder="Languages, time zones, experience, and when you are usually available"></textarea></label>
    <button id="gcc117-volunteer-save" class="gct-primary" type="submit">Save my offer to help</button><p id="gcc117-volunteer-message" class="gct-feedback" role="status" aria-live="polite"></p>
  </form><aside class="gct-panel gcc117-volunteer-next"><h3>Your teacher introduction</h3><p>The GC coordination team needs to know who you are. Complete your school, photo, short bio, website and social links before volunteering.</p><button id="gcc117-volunteer-profile" type="button" class="gct-secondary">Add photo &amp; introduction →</button><p class="gcc117-volunteer-footnote">To appear in the gallery, save your volunteer role and enable the teacher-directory visibility option in My Profile. Your email address and private availability notes are never shared in the gallery.</p></aside></div>
 </div>`;}
export async function mountVolunteerV117(root,openTab){
 const form=root.querySelector('#gcc117-volunteer-form');if(!form)return;
 const $=id=>root.querySelector('#'+id);const info=$('gcc117-volunteer-message');
 const say=(msg,error=false)=>{info.textContent=msg;info.classList.toggle('error',error);};
 const refreshGallery=mountVolunteerGalleryV122(root,openTab);
 $('gcc117-volunteer-profile').addEventListener('click',()=>openTab('network'));
 form.addEventListener('submit',async event=>{event.preventDefault();const button=$('gcc117-volunteer-save');button.disabled=true;
  try{await saveVolunteerV117({facilitator:$('gcc117-want-facilitator').checked,host:$('gcc117-want-host').checked,note:$('gcc117-volunteer-note').value.trim()});say('Offer saved. You will appear above when your photo is uploaded and Teacher Network visibility is enabled.');await refreshGallery();}
  catch(error){say(error.message||'Could not save.',true);}finally{button.disabled=false;}
 });
 try{const details=await myDetailsV117();$('gcc117-want-facilitator').checked=!!details.volunteer_facilitator;$('gcc117-want-host').checked=!!details.volunteer_host;$('gcc117-volunteer-note').value=details.volunteer_note||'';}
 catch(error){say(error.message||'Could not load volunteer preferences.',true);}
}
