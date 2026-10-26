import globalClassroomLogo from '../../assets/gcc-logo-256.webp';
import '../../styles/welcomeV117.css';
import hostIllustration from '../../assets/landing-v118/host-session.webp';
import findIllustration from '../../assets/landing-v118/find-session.webp';
import volunteerIllustration from '../../assets/landing-v118/facilitator-host.webp';
import '../../styles/welcomeArtV118.css';
import gccOfficialBadgeV119 from '../../assets/gcc-v119-official.webp';
import '../../styles/welcomeBrandV119.css';
import '../../styles/welcomeSignupV120.css';
import '../../styles/welcomeControlsV124.css';

const icon=(type)=>({
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 15h3M14 15h3"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8 10.5h5M10.5 8v5"/>',
 people:'<circle cx="8" cy="8" r="3"/><path d="M2.5 20v-2a5.5 5.5 0 0 1 11 0v2zM17 5a3 3 0 0 1 0 6M16 14a5 5 0 0 1 5.5 5"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-6 6-6 12 0 18M12 3c6 6 6 12 0 18"/>'
}[type]||'');
const svg=(name,cls='')=>`<svg class="${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;

export function WelcomeV117(){return `<section class="gcc117-welcome" aria-labelledby="gcc117-heading">
 <div class="gcc117-world" aria-hidden="true"><div class="gcc117-globe"></div><i class="gcc117-orbit gcc117-orbit-a"></i><i class="gcc117-orbit gcc117-orbit-b"></i><i class="gcc117-dot gcc117-dot-a"></i><i class="gcc117-dot gcc117-dot-b"></i><i class="gcc117-dot gcc117-dot-c"></i></div>
 <header class="gcc117-topbar"><a href="#/welcome" class="gcc117-logo gcc119-brand" aria-label="Global Classroom Connect home"><img class="gcc119-logo-image" src="${gccOfficialBadgeV119}" width="420" height="420" alt=""/><span class="gcc119-brand-words"><small>GLOBAL CLASSROOM</small><strong>CONNECT</strong></span></a><nav aria-label="Account and management" class="gcc124-actions">
    <a href="#/signup" class="gcc120-signup-top">Sign up</a>
    <a href="#/teacher-access" class="gcc120-signin-top">Sign in</a>
    <details class="gcc124-account-menu">
      <summary aria-label="More account options" title="More account options">
        ${svg('profile')}<span class="gcc124-menu-label">Account</span>
      </summary>
      <div class="gcc124-account-popup">
        <a href="#/teacher-portal?view=requests">${svg('people')} My Requests</a>
        <a href="#/teacher-portal?view=network">${svg('globe')} Teacher Network</a>
        <a href="#/teacher-portal?view=network">${svg('profile')} My profile</a>
        <a href="#/login">Host sign in</a>
      </div>
    </details>
  </nav></header>
 <div class="gcc117-intro"><span class="gcc117-kicker"><span class="gcc117-live-dot"></span> YOUR NEXT GLOBAL CLASSROOM STARTS HERE</span>
   <h1 id="gcc117-heading">One classroom.<br/><em>A world of connections.</em></h1>
   <p>Meet teachers around the globe, bring young people together, and make every exchange a new story.</p>
 </div>
 <div class="gcc117-choices" aria-label="Choose your next step">
   <a class="gcc117-choice gcc117-choice-create" href="#/teacher-portal?view=create" aria-label="Host a Session — Create and share" title="Host a Session — Create and share"><img class="gcc118-choice-image" src="${hostIllustration}" alt="" aria-hidden="true" width="900" height="900" decoding="async" /></a>
   <a class="gcc117-choice gcc117-choice-find" href="#/teacher-portal?view=find" aria-label="Find a Session — Search and join" title="Find a Session — Search and join"><img class="gcc118-choice-image" src="${findIllustration}" alt="" aria-hidden="true" width="900" height="900" decoding="async" /></a>
   <a class="gcc117-choice gcc117-choice-join" href="#/teacher-portal?view=volunteer" aria-label="Be a Facilitator or GC Host — Support and connect" title="Be a Facilitator or GC Host — Support and connect"><img class="gcc118-choice-image" src="${volunteerIllustration}" alt="" aria-hidden="true" width="900" height="900" decoding="async" /></a>
 </div>
 <div class="gcc117-bottom gcc119-footer"><span class="gcc119-hosted"><img src="${globalClassroomLogo}" alt="" width="26" height="26"/>Hosted by Global Classroom</span><span class="gcc119-divider" aria-hidden="true"></span><a href="#/teacher-access">New here? Sign up and join our network</a></div>
 </section>`;}
