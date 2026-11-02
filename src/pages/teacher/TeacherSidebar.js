// GCC V20.0: everyday teacher actions first; optional community tools stay collapsed.
import globalClassroomLogo from '../../assets/global-classroom-logo.png';
const primary=[['requests','My Requests']];
const secondary=[['profile','My Profile'],['network','Teacher Network'],['volunteer','Facilitator / GC Host']];
const link=(id,label,view)=>`<a href="#/teacher-portal?view=${id}" class="route-link ${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${label}</a>`;
export function TeacherSidebar(){
 const view=new URLSearchParams(window.location.hash.split('?')[1]||'').get('view')||'home';
 return `<aside id="gcc-mobile-sidebar" class="sidebar" aria-label="Teacher navigation drawer">
  <button class="gcc-mobile-drawer-close" type="button" aria-label="Close navigation menu"><span aria-hidden="true">✕</span> Close menu</button>
  <div class="brand-block"><div class="brand-mark"><img src="${globalClassroomLogo}" alt="" aria-hidden="true"/></div><div><p class="brand-name">Global Classroom</p><h2 class="brand-title">Connect</h2></div></div>
  <nav class="sidebar-nav" aria-label="Teacher navigation">
   <a href="#/welcome" class="route-link gcc204-main-home">← GCC Home</a>
   ${primary.map(([id,label])=>link(id,label,view)).join('')}
   <details class="gcc-teacher-more-v200" ${secondary.some(([id])=>id===view)?'open':''}>
    <summary>Profile &amp; Community</summary>
    ${secondary.map(([id,label])=>link(id,label,view)).join('')}
   </details>
  </nav>
  <div class="sidebar-footer"><p class="sidebar-note">Welcome, teachers!</p><p class="sidebar-subnote">Bring classrooms together.</p></div>
 </aside>`;
}
