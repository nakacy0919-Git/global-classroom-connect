import globalClassroomLogo from '../assets/global-classroom-logo.png';
// The host workflow is intentionally short. Existing tools remain accessible in Advanced tools.
const primaryMenu = [
  {key:'welcome',label:'🌍 Home'},
  {key:'sessions',label:'Sessions'},
  {key:'teacher-invites',label:'Teacher Invitations'},
  {key:'teacher-approvals',label:'New Teacher Approvals'},
  {key:'host-volunteers',label:'Volunteer Team'},
  {key:'schools',label:'School Library'},
  {key:'teachers',label:'Teacher Database'},
];
const advancedMenu = [
  {key:'dashboard',label:'Host Dashboard'},
  {key:'events',label:'Events (legacy)'},
  {key:'session-control',label:'Registration Control (legacy)'},
  {key:'participants',label:'Participant Pool'},
  {key:'rooms',label:'Room Builder'},
  {key:'round-overview',label:'Round Overview'},
  {key:'scheduling',label:'Schedule Planner'},
  {key:'register-session',label:'Teacher Session Offers'},
  {key:'find-session',label:'Find Teacher Sessions'},
  {key:'join-requests',label:'Join Requests'},
  {key:'teacher-invites',label:'Teacher Invitations'},
  {key:'registration',label:'Teacher Registration'},
  {key:'session-board',label:'Participant Board'},
];
const links=(items,activeRoute)=>items.map(item=>`
 <a href="#/${item.key}" class="route-link ${activeRoute===item.key?'active':''}">${item.label}</a>`).join('');

export function Sidebar(activeRoute){
  return `<aside id="gcc-mobile-sidebar" class="sidebar" aria-label="Host navigation drawer">
    <button class="gcc-mobile-drawer-close" type="button" aria-label="Close navigation menu"><span aria-hidden="true">✕</span> Close menu</button>
    <div class="brand-block"><div class="brand-mark"><img src="${globalClassroomLogo}" alt="" aria-hidden="true" /></div><div><p class="brand-name">Global Classroom</p><h2 class="brand-title">Connect</h2></div></div>
    <nav class="sidebar-nav" aria-label="Host navigation">
      ${links(primaryMenu,activeRoute)}
      <!-- Advanced host tools remain accessible by direct URL, but hidden from navigation. -->
    </nav>
  </aside>`;
}
