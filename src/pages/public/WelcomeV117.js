import globalClassroomLogo from '../../assets/gcc-logo-256.webp';
import '../../styles/welcomeV117.css';

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
 <header class="gcc117-topbar"><a href="#/welcome" class="gcc117-logo" aria-label="Global Classroom Connect home"><img src="${globalClassroomLogo}" alt=""/><span><small>GLOBAL CLASSROOM</small><strong>CONNECT</strong></span></a><nav aria-label="Account and management"><a href="#/teacher-portal?view=network">${svg('profile')} My profile</a><a href="#/login" class="gcc117-host-link">Host sign in</a></nav></header>
 <div class="gcc117-intro"><span class="gcc117-kicker"><span class="gcc117-live-dot"></span> YOUR NEXT GLOBAL CLASSROOM STARTS HERE</span>
   <h1 id="gcc117-heading">One classroom.<br/><em>A world of connections.</em></h1>
   <p>Meet teachers around the globe, bring young people together, and make every exchange a new story.</p>
 </div>
 <div class="gcc117-choices" aria-label="Choose your next step">
   <a class="gcc117-choice gcc117-choice-create" href="#/teacher-portal?view=create"><span class="gcc117-n">01 / SHARE</span><span class="gcc117-symbol">${svg('calendar')}</span><strong>Host a Session</strong><span class="gcc117-desc">Choose a date, introduce your class and invite the world to join.</span><span class="gcc117-go">Create a session ${svg('arrow')}</span></a>
   <a class="gcc117-choice gcc117-choice-find" href="#/teacher-portal?view=find"><span class="gcc117-n">02 / DISCOVER</span><span class="gcc117-symbol">${svg('search')}</span><strong>Find a Session</strong><span class="gcc117-desc">Discover a partner classroom. All times appear in your local time zone.</span><span class="gcc117-go">Explore sessions ${svg('arrow')}</span></a>
   <a class="gcc117-choice gcc117-choice-join" href="#/teacher-portal?view=volunteer"><span class="gcc117-n">03 / SUPPORT</span><span class="gcc117-symbol">${svg('people')}</span><strong>Be a Facilitator<br/>or GC Host</strong><span class="gcc117-desc">Offer to support Global Classroom-hosted exchanges. Your skills can bring students together.</span><span class="gcc117-go">Join the team ${svg('arrow')}</span></a>
 </div>
 <div class="gcc117-bottom"><span>${svg('globe')} Made for educators, connected by curiosity.</span><a href="#/teacher-access">New here? Sign in or activate your invitation</a></div>
 <p class="gcc117-trust">Teacher access is available to approved schools. Offering to facilitate or host does not automatically grant administrator access.</p>
 </section>`;}
