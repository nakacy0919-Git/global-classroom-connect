import globalClassroomLogo from '../../assets/global-classroom-logo.png';
export function TeacherSidebar(){
 const view=new URLSearchParams(window.location.hash.split('?')[1]||'').get('view');
 const items=[['create','Create Session'],['find','Find Session'],['requests','My Requests'],['network','Teacher Network'],['volunteer','Facilitator / Host']];
 const links=items.map(([id,label])=>`<a href="#/teacher-portal?view=${id}" class="route-link ${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${label}</a>`).join('');
 return `<aside id="gcc-mobile-sidebar" class="sidebar" aria-label="Teacher navigation drawer">
  <button class="gcc-mobile-drawer-close" type="button" aria-label="Close navigation menu"><span aria-hidden="true">✕</span> Close menu</button>
  <div class="brand-block"><div class="brand-mark"><img src="${globalClassroomLogo}" alt="" /></div><div><p class="brand-name">Global Classroom</p><h2 class="brand-title">Connect</h2></div></div>
  <nav class="sidebar-nav" aria-label="Teacher navigation"><a href="#/welcome" class="route-link">← GCC Home</a>${links}</nav>
  <div class="sidebar-footer"><p class="sidebar-note">Welcome, teachers!</p><p class="sidebar-subnote">Bring classrooms together.</p></div>
 </aside>`;
}
