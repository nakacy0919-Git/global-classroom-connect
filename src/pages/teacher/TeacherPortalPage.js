import '../../styles/teacherSelfService.css';
import {prepareSuccessChime,showSuccessCelebration} from '../../lib/successCelebrationV142.js';
import {teacherNetworkMarkupV116,mountTeacherNetworkV116} from './TeacherNetworkV116.js';
import {teacherProfileMarkupV153,mountTeacherProfileV153} from './TeacherProfileV153.js';
import {myTeacherProfileV116} from '../../services/teacherNetworkV116.js';
import {volunteerMarkupV117,mountVolunteerV117} from './VolunteerV117.js';
import {makeSlot,toUtc} from '../../lib/matching.js';
import {mountPlanFieldsV203,readPlanV203,renderSessionDetailsV203,TYPE_LABEL_V203,SESSION_TYPES_V203} from '../../lib/sessionPlannerV203.js';
import {hostCountryV208,hostEventsAsOffersV208,publishedByCountryV208,totalCapacityV208,scrollToCountryResultsV208} from '../../lib/sessionDiscoveryV208.js';
import '../../styles/findSessionCompactV208.css';
import {createFieldGuideV204} from '../../lib/sessionFieldGuideV204.js';
import '../../styles/sessionUxV204.css';
import {listPublicSessionOverviews} from '../../services/simpleSessionService.js';
import {uploadSessionFlyerV203} from '../../services/sessionPlanServiceV203.js';
import '../../styles/sessionPlannerV203.css';
import {timeRangeV112,timePartsV112} from '../../lib/sessionTimeV112.js';
import {overlapsLocalTimeV150} from '../../lib/sessionStudioV150.js';
import {appendVisualBasicsV209,schoolLevelV209} from '../../lib/sessionVisualV209.js';
import '../../styles/sessionVisualV209.css';
import {mountCountryExplorerV151} from '../../lib/sessionCountryMapV151.js';
import {mountSessionManagerV212} from '../../lib/teacherSessionManagerV212.js';
import {mountTeacherMessagesV214} from '../../lib/teacherMessagesV214.js';
import {calendarMenuV214} from '../../lib/sessionCalendarExportV214.js';
import '../../styles/teacherMessagesV214.css';
import {sessionReadinessV212,availableSeatsV212,canRequestV212,requestStatusLabelV212} from '../../lib/sessionManagementV212.js';
import {sessionSearchRecordsV213,filterSessionRecordsV213,sessionResultsPageV213,favoriteKeyV213} from '../../lib/sessionSearchV213.js';
import {captureSessionDraftV213,applySessionDraftV213,copiedSessionDraftV213} from '../../lib/sessionDraftV213.js';
import '../../styles/sessionWorkspaceV213.css';
import '../../styles/sessionManagementV212.css';

import {GCC_LEVELS_V150,GCC_SDG_V150,GCC_MODES_V150,detailsV150,sessionTitleV150,partnerLevelsV150,filterOffersV150,sessionDetailsPayloadV150} from '../../lib/sessionStudioV150.js';
import '../../styles/sessionStudioV150.css';
import '../../styles/sessionStudioV151.css';
import '../../styles/teacherHubV200.css';
import {teacherIdentity,teacherSessions,teacherRequests,teacherCreateSession,teacherCloseSession,
 teacherApply,teacherReview,teacherSignOut,teacherNotifications,teacherReadNotification,teacherConfirmSchedule,teacherWorkspaceV213,teacherSaveDraftV213,teacherClearDraftV213,teacherSetFavoriteV213} from '../../services/teacherSelfService.js';

const element=(name,cls='',text='')=>{const n=document.createElement(name);n.className=cls;n.textContent=text;return n;};
const flag=code=>/^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌐';
function fmt(iso,zone){try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}catch{return String(iso||'');}}
function tomorrow(zone){const x=new Date(Date.now()+86400000);try{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(x).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}catch{return x.toISOString().slice(0,10);}}
export function TeacherPortalPage(){return `<section class="gct-workspace gct-portal">
 <header class="gct-banner"><div class="gct-banner-icon">🌍</div><div><p class="gct-eyebrow">GLOBAL CLASSROOM · TEACHER SPACE</p><h2>Explore. Connect. Inspire.</h2><p id="gctp-greeting">Loading your school…</p></div><button id="gctp-logout" type="button" class="gct-secondary gct-logout">Sign out</button></header>
 <a class="gcs214-header-mail" href="#/teacher-portal?view=messages">✉ Messages <span id="gcs214-badge-header" class="gcs214-badge" hidden aria-label="Unread messages"></span></a>
 <p id="gctp-message" class="gct-feedback" role="status" aria-live="polite"></p>

 <section class="gct-section gct-home-v200" data-gct-view="home" hidden>
  <div class="gct-home-intro-v200"><p class="gct-eyebrow">YOUR TEACHER SPACE</p><h3>Your next global exchange starts here.</h3><p>Choose a starting point. Everything else stays in your workspace.</p></div>
  <div class="gct-home-actions-v200">
   <a class="gct-home-action-v200 gct-home-action-find-v200" href="#/teacher-portal?view=find"><span class="gct-home-action-icon-v200" aria-hidden="true">🌐</span><span><strong>Find a Session</strong><small>Search sessions by time or country</small></span><span aria-hidden="true">→</span></a>
   <a class="gct-home-action-v200 gct-home-action-create-v200" href="#/teacher-portal?view=create"><span class="gct-home-action-icon-v200" aria-hidden="true">✦</span><span><strong>Host a Session</strong><small>Publish a session for partner teachers</small></span><span aria-hidden="true">→</span></a>
   <a class="gct-home-action-v200 gcs214-home-link" href="#/teacher-portal?view=messages">
    <span class="gct-home-action-icon-v200" aria-hidden="true">✉</span>
    <span><strong>Teacher Messages</strong><small>Chat privately with approved partner teachers</small></span>
    <span id="gcs214-badge-home" class="gcs214-badge" hidden aria-label="Unread messages"></span>
   </a>
  </div>
  <div class="gct-home-summary-v200" aria-label="Teacher activity overview">
   <a href="#/teacher-portal?view=create" class="gct-home-summary-card-v200"><strong id="gctp-home-sessions-count">0</strong><span>Your upcoming sessions</span></a>
   <a href="#/teacher-portal?view=requests" class="gct-home-summary-card-v200"><strong id="gctp-home-requests-count">0</strong><span>Pending requests</span></a>
  </div>
  <section class="gct-panel gcs212-inbox" aria-label="Teacher notifications"><div class="gcs212-inbox-head"><h3>🔔 Notifications <span id="gcs212-notice-count-home"></span></h3><button id="gcs212-refresh-notices" type="button" class="gct-secondary">Refresh</button></div><div id="gcs212-notices-home"></div></section>
   <section class="gct-panel gct-home-list-v200" aria-label="My next sessions"><div class="gct-home-list-heading-v200"><h4>Your upcoming sessions</h4><a href="#/teacher-portal?view=create">Create Session →</a></div><div id="gctp-home-mine" class="gct-card-list"></div></section><details class="gct-panel gcc204-manage-sessions"><summary>Manage my hosted sessions</summary><div id="gctp-mine" class="gct-card-list"></div></details>
 </section>
 <div class="gct-section" data-gct-view="create" hidden><div class="gcs150-create">
 <form id="gctp-create" class="gct-panel gct-form gcs150-wizard" novalidate>
  <div class="gct-section-head"><span>✦</span><div><h3>Create a global classroom session</h3><p>Four quick steps to bring the world into your classroom.</p></div></div>
  <div class="gcs213-draft-tools" aria-label="Save your session draft">
    <span id="gcs213-draft-status" role="status" aria-live="polite">Checking your draft…</span>
    <button id="gcs213-save-draft" type="button" class="gct-secondary">Save draft</button>
    <button id="gcs213-discard-draft" type="button" class="gct-secondary" hidden>Discard draft</button>
   </div>
   <nav class="gcs150-steps" aria-label="Session setup"><span data-gcs150-step-dot="0">1 · Basics</span><span data-gcs150-step-dot="1">2 · Format</span><span data-gcs150-step-dot="2">3 · Topics</span><span data-gcs150-step-dot="3">4 · Review</span></nav>
  <p class="gcs151-step-status" id="gctp-form-step" aria-live="polite">Step 1 of 4 · Tell us when you can connect</p>
  <section class="gct-form-section" data-gctp-form-section="0">
   <div class="gcs150-intro"><h4>Plan your session</h4><p>No need to enter your school or teacher details again.</p></div>
   <label>Session name *<input id="gctp-name" maxlength="120" required placeholder="e.g. Discover school life around the world"></label>
   <div class="gcs150-host"><span aria-hidden="true">🏫</span><div><strong id="gctp-host-school">Loading school…</strong><small id="gctp-host-identity">Approved teacher</small></div><span class="gcs150-verified">✓ Verified</span></div>
   <div class="gct-fields"><label>Date *<input id="gctp-date" type="date" required></label><label>School time zone<input id="gctp-zone" readonly required></label></div>
   <div class="gct-fields"><label>From *<input id="gctp-from" type="time" value="09:00" required></label><label>Until *<input id="gctp-to" type="time" value="10:00" required></label></div>
   <p class="gct-hint">Enter your school's local time. GCC automatically shows matching times to teachers abroad.</p>
  </section>
  <section class="gct-form-section" data-gctp-form-section="1" hidden>
   <div class="gcs150-intro"><h4>Choose your exchange format</h4><p>Pick one illustration, then choose the students you would like to meet.</p></div>
   <div class="gcs150-mode-grid" role="group" aria-label="Session format"><label class="gcs150-mode"><input type="radio" name="gctp-mode" value="device" ><span class="gcs150-mode-art" aria-hidden="true"><img src="/assets/session-formats/device.svg" width="110" height="80" alt="" loading="lazy"></span><strong>Individual devices</strong><small>Each student connects on a device</small></label><label class="gcs150-mode"><input type="radio" name="gctp-mode" value="classroom" checked><span class="gcs150-mode-art" aria-hidden="true"><img src="/assets/session-formats/classroom.svg" width="110" height="80" alt="" loading="lazy"></span><strong>Classroom to classroom</strong><small>One shared screen for the class</small></label><label class="gcs150-mode"><input type="radio" name="gctp-mode" value="hybrid" ><span class="gcs150-mode-art" aria-hidden="true"><img src="/assets/session-formats/hybrid.svg" width="110" height="80" alt="" loading="lazy"></span><strong>Flexible / hybrid</strong><small>Mix both formats</small></label></div>
   <div class="gct-fields"><label>Students from your school *<input id="gctp-students" type="number" min="1" max="500" value="20" required></label><label>Maximum total participants (including your school) *<input id="gctp-capacity" type="number" min="1" max="2000" value="150" required></label><label>Breakout rooms *<input id="gctp-rooms" type="number" min="1" max="100" value="1" required></label></div>
   <label>Your school level *<select id="gctp-band"><option value="Upper Secondary">High school</option><option value="Lower Secondary">Junior high</option><option value="Primary">Elementary</option><option value="University">University</option><option value="Mixed">Mixed ages</option></select></label>
   <fieldset class="gcs150-targets"><legend>Partner school levels you welcome *</legend><p class="gct-hint">You can select several grades, such as junior high and high school.</p><div class="gcs150-levels"><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Primary"><span>Elementary</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Lower Secondary"><span>Junior high</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Upper Secondary"><span>High school</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="University"><span>University</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Mixed"><span>Mixed ages</span></label></div></fieldset>
  </section>
  <section class="gct-form-section" data-gctp-form-section="2" hidden>
   <div class="gcs150-intro"><h4>Make your exchange memorable</h4><p>Choose a theme; language proficiency and learning goals are optional.</p></div>
   <label>Session theme *<select id="gctp-theme"><option value="Cultural Exchange">Culture and daily life</option><option value="SDGs">SDGs / global challenges</option><option value="Mystery Skype">Mystery Skype</option><option value="Language Exchange">Language exchange</option><option value="Global Citizenship">Global citizenship</option><option value="Free Topic">Free topic</option></select></label>
   <label id="gctp-sdg-wrap" hidden>SDG goal<select id="gctp-sdg"><option value="">Any SDG goal</option><option value="1">1. No Poverty</option><option value="2">2. Zero Hunger</option><option value="3">3. Good Health and Well-being</option><option value="4">4. Quality Education</option><option value="5">5. Gender Equality</option><option value="6">6. Clean Water and Sanitation</option><option value="7">7. Affordable and Clean Energy</option><option value="8">8. Decent Work and Economic Growth</option><option value="9">9. Industry, Innovation and Infrastructure</option><option value="10">10. Reduced Inequalities</option><option value="11">11. Sustainable Cities and Communities</option><option value="12">12. Responsible Consumption and Production</option><option value="13">13. Climate Action</option><option value="14">14. Life Below Water</option><option value="15">15. Life on Land</option><option value="16">16. Peace, Justice and Strong Institutions</option><option value="17">17. Partnerships for the Goals</option></select></label>
   <label>Specific topic (optional)<input id="gctp-topic" maxlength="90" placeholder="e.g. Climate, local food, school traditions"></label>
   <div class="gct-fields"><label>Languages spoken (optional)<input id="gctp-language" maxlength="100" placeholder="e.g. Japanese, English"></label><label>English level (optional)<select id="gctp-english"><option value="">Not specified</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Mixed levels</option></select></label></div>

   <label>Notes to partner teachers (optional)<textarea id="gctp-notes" rows="2" maxlength="500" placeholder="Preparation and other details"></textarea></label>
   <div id="gctp-plan-slot"></div>
  </section>
  <section class="gct-form-section" data-gctp-form-section="3" hidden>
   <div class="gcs150-intro"><h4>Ready to connect the world?</h4><p>Check the details. You can go back and change anything before publishing.</p></div><div class="gct-review" id="gctp-review"></div>
   <p class="gct-hint">Publishing makes this session visible to approved teachers. It does not automatically create a Zoom meeting or send invitations.</p>
  </section>
  <div class="gct-form-actions"><button type="button" id="gctp-back" class="gct-secondary" hidden>← Back</button><button type="button" id="gctp-next" class="gct-primary">Continue →</button><button class="gct-primary" id="gctp-publish" type="submit" hidden>Publish session ✓</button></div>
 </form>
 </div></div>
 <div class="gct-section gcs151-find" data-gct-view="find" hidden>
  <header class="gcs151-find-hero">
   <div><span class="gcs151-kicker">DISCOVER GLOBAL CLASSROOMS</span>
   <h3>Where will your classroom connect next?</h3>
   <p>Find a partner by your available time or explore countries offering sessions.</p>
   <span id="gctp-find-zone-label" class="gcs150-zone-chip">Your school time zone</span></div>
   <div class="gcs151-hero-world" aria-hidden="true"><span>✦</span><span>🌏</span><span>✦</span></div>
  </header>
  <div class="gcs209-search-tools"><button id="gctp-open-search" type="button" class="gcs209-open-search">🔎 Search options</button><span id="gctp-search-summary" role="status">Showing all upcoming sessions</span></div>
  <dialog id="gctp-search-choice" class="gcs209-search-dialog gcs209-search-choice" aria-labelledby="gctp-search-choice-title">
   <h3 id="gctp-search-choice-title">How would you like to find a session?</h3><p>Choose a method, then set your preferences.</p>
   <div class="gcs151-discover-modes" role="group" aria-label="Choose how to find a session">
   <button id="gctp-discover-time" class="gcs151-discover-card" type="button" aria-pressed="true" data-gcs151-discovery="time">
    <span class="gcs151-discover-icon" aria-hidden="true">🕒</span><span class="gcs151-discover-label"><strong>Find by time</strong><small>Start with the hours you're available</small></span><span aria-hidden="true">→</span>
   </button>
   <button id="gctp-discover-map" class="gcs151-discover-card" type="button" aria-pressed="false" data-gcs151-discovery="map">
    <span class="gcs151-discover-icon" aria-hidden="true">🌐</span><span class="gcs151-discover-label"><strong>Explore world map</strong><small>Choose a country with an open session</small></span><span aria-hidden="true">→</span>
   </button>
  </div><button id="gctp-show-all" class="gcs209-show-all" type="button">Show all sessions</button></dialog>
  <dialog id="gctp-find-time-panel" class="gcs151-discover-panel gcs209-search-dialog" aria-label="Find by available time">
   <h4>When can your class join?</h4>
   <div class="gct-filterbar gcs150-main-filters">
    <label>Available time (your school time)<select id="gctp-find-preset"><option value="any">Any time</option><option value="morning">Morning · 08:00–12:00</option><option value="afternoon">Afternoon · 12:00–17:00</option><option value="evening">Evening · 17:00–22:00</option><option value="custom">Choose hours</option></select></label>
    <label>Date (optional)<input id="gctp-find-date" type="date"></label>
    <div id="gctp-find-custom" class="gcs150-custom" hidden><label>From<input id="gctp-find-from" type="time" value="09:00"></label><label>Until<input id="gctp-find-to" type="time" value="12:00"></label></div>
   </div>
   <p class="gcs151-small-help">All times use your school's time zone, with daylight saving calculated for each session date.</p>
   <div class="gcs209-dialog-actions"><button type="button" data-gcs209-cancel class="gct-secondary">Cancel</button><button id="gctp-apply-time" type="button" class="gcs209-apply">Show matching sessions →</button></div>
  </dialog>
  <dialog id="gctp-find-map-panel" class="gcs151-discover-panel gcs209-search-dialog gcs209-map-dialog" aria-label="Find by country">
   <div class="gcs151-map-heading"><div><h4>Explore available countries</h4><p>Only countries with currently open sessions are marked on the map.</p></div><span id="gctp-map-status" role="status" aria-live="polite">Select the map to explore</span></div>
   <div id="gctp-country-map" class="gcs151-map-stage" aria-label="Interactive world map"></div>
   <label class="gcs151-country-select-label">Choose from the list instead
    <select id="gctp-find-country"><option value="">All available countries</option></select>
   </label>
   <div id="gctp-country-list" class="gcs151-country-list" aria-label="Countries with open sessions"></div>
   <div class="gcs209-dialog-actions"><button type="button" data-gcs209-cancel class="gct-secondary">Cancel</button><button id="gctp-apply-map" type="button" class="gcs209-apply">Show matching sessions →</button></div>
  </dialog>
  <details class="gcs150-advanced"><summary>More options · school level, SDGs, format &amp; topic</summary>
   <div class="gct-filterbar">
    <label>Partner school level<select id="gctp-find-band"><option value="">Any level</option><option value="Primary">Elementary</option><option value="Lower Secondary">Junior high</option><option value="Upper Secondary">High school</option><option value="University">University</option><option value="Mixed">Mixed ages</option></select></label>
    <label>Session format<select id="gctp-find-mode"><option value="">Any format</option><option value="device">Individual devices</option><option value="classroom">Classroom to classroom</option><option value="hybrid">Flexible / hybrid</option></select></label>
    <label>SDG topic<select id="gctp-find-sdg"><option value="">Any SDG</option><option value="1">1. No Poverty</option><option value="2">2. Zero Hunger</option><option value="3">3. Good Health and Well-being</option><option value="4">4. Quality Education</option><option value="5">5. Gender Equality</option><option value="6">6. Clean Water and Sanitation</option><option value="7">7. Affordable and Clean Energy</option><option value="8">8. Decent Work and Economic Growth</option><option value="9">9. Industry, Innovation and Infrastructure</option><option value="10">10. Reduced Inequalities</option><option value="11">11. Sustainable Cities and Communities</option><option value="12">12. Responsible Consumption and Production</option><option value="13">13. Climate Action</option><option value="14">14. Life Below Water</option><option value="15">15. Life on Land</option><option value="16">16. Peace, Justice and Strong Institutions</option><option value="17">17. Partnerships for the Goals</option></select></label>
    <label>Session type<select id="gctp-find-type"><option value="">Any session type</option></select></label>
    <label>Student age<input id="gctp-find-age" type="number" min="5" max="30" placeholder="Any age"></label>
    <label>Keyword<input id="gctp-find-topic" type="search" placeholder="Culture, climate, language…"></label>
    <label class="gcs150-match"><input id="gctp-find-compatible" type="checkbox"><span>Partner accepts my school level</span></label>
   </div>
  </details>
  <div class="gcs151-results-heading gcs213-results-heading">
     <div><h3>Matching sessions</h3><span id="gctp-search-count" role="status" aria-live="polite"></span></div>
     <div class="gcs213-results-tools">
      <label>Sort <select id="gcs213-sort"><option value="soonest">Soonest first</option><option value="latest">Latest first</option><option value="seats">Most seats available</option><option value="country">Host country A–Z</option></select></label>
      <label class="gcs213-fav-filter"><input id="gcs213-favorites-only" type="checkbox"> ★ Favorites</label>
      <button id="gctp-reset-filters" class="gct-secondary" type="button">Clear filters</button>
     </div>
    </div>
  <div id="gctp-results" class="gct-results"></div>
  <button id="gcs213-show-more" class="gcs213-show-more" type="button" hidden>Show more sessions ↓</button>
 </div>
 <div class="gct-section" data-gct-view="requests" hidden><div class="gct-section-head"><span>✉</span><div><h3>Join requests</h3><p>Review applications to your sessions, and track the requests you sent.</p></div></div>
 <section class="gct-panel gcs212-inbox" aria-label="Teacher notifications"><h3>🔔 Notifications <span id="gcs212-notice-count-requests"></span></h3><div id="gcs212-notices-requests"></div></section>
  <div class="gct-request-columns"><div class="gct-panel"><h3>Received from other teachers</h3><div id="gctp-incoming" class="gct-card-list"></div></div><div class="gct-panel"><h3>Requests you sent</h3><div id="gctp-outgoing" class="gct-card-list"></div></div></div>
 <p class="gct-hint">Requests and approvals now appear in GCC notifications. Approved schools still need to agree on meeting links and final arrangements with their host. Automated email is not yet enabled.</p></div>
 <section class="gct-section gcs214-messages" data-gct-view="messages" id="gcs214-messages-view" hidden>
  <div class="gcs214-title-row">
   <div><h3>✉ Teacher Messages <span id="gcs214-badge-messages" class="gcs214-badge" hidden aria-label="Unread messages"></span></h3>
    <p>Private text conversations with approved partner teachers. No email notifications or paid messaging service.</p></div>
  </div>
  <div class="gcs214-chat-layout">
   <aside class="gcs214-chat-sidebar" aria-label="Partner conversations">
    <div class="gcs214-side-head"><strong>Conversations</strong><button id="gcs214-refresh" type="button">Refresh</button></div>
    <div id="gcs214-thread-list" class="gcs214-thread-list"></div>
   </aside>
   <div class="gcs214-chat-main">
    <div id="gcs214-chat-heading" class="gcs214-chat-heading"></div>
    <div id="gcs214-chat-history" class="gcs214-chat-history" role="log" aria-live="polite" aria-label="Teacher messages"></div>
    <form id="gcs214-compose" class="gcs214-compose" hidden>
     <label>Your message <textarea id="gcs214-chat-input" maxlength="2000" rows="3" placeholder="Discuss the agenda, breakout rooms, or meeting details…" required></textarea></label>
     <div class="gcs214-compose-actions"><small>Teachers only · No student information · Ctrl/⌘ + Enter to send</small><button id="gcs214-send" class="gcs214-send" type="submit">Send message</button></div>
    </form>
   </div>
  </div>
 </section>
 <section class="gct-section" data-gct-view="profile" hidden>${teacherProfileMarkupV153()}</section>
 <section class="gct-section" data-gct-view="network" hidden>
  <div class="gcc153-directory-head"><div><h3>Teacher Network</h3><p>Meet verified educators from around the world.</p></div><a class="gct-secondary" href="#/teacher-portal?view=profile">✎ Edit my profile</a></div>
  ${teacherNetworkMarkupV116()}</section>
 <section class="gct-section" data-gct-view="volunteer" hidden>${volunteerMarkupV117()}</section>
 </section>`;}

export function bindTeacherPortalPage(){
 const root=document.querySelector('.gct-portal');if(!root)return;
 const $=id=>root.querySelector('#'+id),notice=$('gctp-message');
 let identity=null,offers=[],requests=[],hostEvents=[],notifications=[],formStep=0,discoverMode='time';
  let favorites=new Set(),visibleCount=12,draftReady=false,draftDirty=false;
  let draftTimer=null,draftChain=Promise.resolve(),draftRevision=0;
  let savedDraftPresent=false,cloneFlyerUrl='',publishing=false;
 const draftStatus=value=>{$('gcs213-draft-status').textContent=value;};
 const captureDraft=()=>captureSessionDraftV213($('gctp-create'),formStep,cloneFlyerUrl);
 async function saveDraft(force=false){
  if(!identity||!draftReady||publishing||(!draftDirty&&!force))return false;
  if(draftTimer){clearTimeout(draftTimer);draftTimer=null;}
  const snapshot=captureDraft(),revision=draftRevision;
  draftDirty=false;draftStatus('Saving draft…');
  const task=async()=>{
   try{
    const stamped=await teacherSaveDraftV213(snapshot);
    if(revision===draftRevision){draftStatus('✓ Draft saved · '+new Date(stamped).toLocaleTimeString());}
    savedDraftPresent=true;$('gcs213-discard-draft').hidden=false;
    return true;
   }catch(e){
    draftDirty=true;draftStatus('Draft not saved — '+(e.message||'connection error'));
    return false;
   }
  };
  draftChain=draftChain.then(task,task);
  return draftChain;
 }
 const scheduleDraft=()=>{
  if(!draftReady||!identity||publishing)return;
  draftDirty=true;draftRevision++;draftStatus('Unsaved changes…');
  if(draftTimer)clearTimeout(draftTimer);
  draftTimer=setTimeout(()=>{saveDraft();},1400);
 };
 async function loadTeacherWorkspace(){
  try{
   const workspace=await teacherWorkspaceV213();
   favorites=new Set((workspace?.favorites||[]).map(f=>favoriteKeyV213(f.source,f.id)).filter(Boolean));
   if(workspace?.draft?.version===1){
    draftReady=false;
    const restored=applySessionDraftV213($('gctp-create'),workspace.draft);
    if(restored){
     cloneFlyerUrl=workspace.draft.source_flyer_url||'';
     showFormStep(Math.min(2,Number(workspace.draft.step)||0));
     savedDraftPresent=true;
     $('gcs213-discard-draft').hidden=false;
     draftStatus('✓ Restored draft from '+(workspace.draft_updated_at?new Date(workspace.draft_updated_at).toLocaleString():'your previous session'));
    }
   }else draftStatus('Draft autosave is ready');
  }catch(e){draftStatus('Draft sync unavailable: '+(e.message||'please sign in again'));}
  finally{draftReady=true;renderResults();}
 }
 function favoriteControl(source,id){
  const key=favoriteKeyV213(source,id),saved=favorites.has(key);
  const button=element('button','gcs213-favorite'+(saved?' gcs213-favorite-active':''),saved?'★ Saved':'☆ Save');
  button.type='button';button.setAttribute('aria-pressed',String(saved));
  button.setAttribute('aria-label',saved?'Remove session from favorites':'Save session as favorite');
  button.addEventListener('click',async()=>{
   button.disabled=true;
   try{
    await teacherSetFavoriteV213(source,id,!favorites.has(key));
    if(favorites.has(key))favorites.delete(key);else favorites.add(key);
    renderResults();
   }catch(e){inform('Could not update favorite: '+(e.message||'Please try again.'),true);button.disabled=false;}
  });
  return button;
 }
 const countryExplorer=mountCountryExplorerV151(root,code=>{
  if(!identity)return;
  if($('gctp-find-map-panel').open)$('gctp-find-map-panel').close();
  $('gctp-find-country').value=code;visibleCount=12;
  countryExplorer.update([...upcoming(),...hostEventsAsOffersV208(hostEvents)],code);
  renderResults();
  scrollToCountryResultsV208($('gctp-results'));
 });
 const inform=(value,error=false)=>{notice.textContent=value;notice.classList.toggle('error',error);};
 const manager=mountSessionManagerV212(root,{
  identity:()=>identity,
  onSaved:async()=>{await refresh();inform('Session changes saved. Partner teachers can review the latest details.');},
  onError:()=>{}
 });
 const display=(id)=>{for(const view of root.querySelectorAll('[data-gct-view]'))view.hidden=view.dataset.gctView!==id;
   root.classList.toggle('gcs209-finding',id==='find');
   root.closest('.app-shell')?.classList.toggle('gcc123-volunteer-focus',id==='volunteer');};
 const updateMessageBadges=count=>{
  const n=Math.max(0,Number(count)||0);
  for(const id of ['gcs214-badge-header','gcs214-badge-home','gcs214-badge-messages']){
   const badge=$(id);if(!badge)continue;
   badge.hidden=n===0;badge.textContent=n>99?'99+':String(n);
   badge.setAttribute('aria-label',n+' unread teacher messages');
  }
 };
 const messages=mountTeacherMessagesV214(root,{
  getIdentity:()=>identity,onUnread:updateMessageBadges,
  onError:message=>inform(message,true),
  onOpenView:()=>{
   display('messages');
   window.history.replaceState(null,'','#/teacher-portal?view=messages');
  }
 });
 const openPartnerMessages=async requestId=>{await messages.open(requestId);};
 mountPlanFieldsV203($('gctp-plan-slot'),'gctp');
 for(const [value,label] of SESSION_TYPES_V203){const o=element('option','',label);o.value=value;$('gctp-find-type').append(o);}
 const guide=createFieldGuideV204(root,$('gctp-create'));
 const selectedLevels=()=>[...root.querySelectorAll('input[name="gctp-target-level"]:checked')].map(x=>x.value);
 const selectedMode=()=>root.querySelector('input[name="gctp-mode"]:checked')?.value||'classroom';
 const sessionTopic=()=>[$('gctp-theme').value,$('gctp-topic').value.trim()].filter(Boolean).join(' · ').slice(0,120);
 const detailsPayload=()=>{
  const stamp=makeSlot({date:$('gctp-date').value,startTime:$('gctp-from').value,endTime:$('gctp-to').value,timezone:identity.timezone});
  if(stamp.error)throw Error(stamp.error);
  const local=$('gctp-deadline').value;
  if(!local||local.length!==16)throw Error('Choose a registration deadline in the host local time.');
  const deadline=toUtc(local.slice(0,10),local.slice(11),identity.timezone);
  if(deadline.error)throw Error(deadline.error);
  return {...sessionDetailsPayloadV150({name:$('gctp-name').value,mode:selectedMode(),targetLevels:selectedLevels(),
   sdg:$('gctp-theme').value==='SDGs'?$('gctp-sdg').value:'',language:$('gctp-language').value,
   englishLevel:$('gctp-english').value,goals:$('gctp-description').value}),
   ...readPlanV203(root,'gctp',{...stamp,startTime:$('gctp-from').value,endTime:$('gctp-to').value},deadline.iso,Number($('gctp-capacity').value)),
   host_country_code:identity.country_code,host_country_name:identity.country};
 };
 function showFormStep(index){
  formStep=index;
  for(const section of root.querySelectorAll('[data-gctp-form-section]'))section.hidden=Number(section.dataset.gctpFormSection)!==index;
  $('gctp-form-step').textContent=`Step ${index+1} of 4 · ${['When and where','Exchange format','Topic and activities','Review and publish'][index]}`;
  for(const n of root.querySelectorAll('[data-gcs150-step-dot]')){
   n.classList.toggle('active',Number(n.dataset.gcs150StepDot)===index);
   n.classList.toggle('completed',Number(n.dataset.gcs150StepDot)<index);
  }
  $('gctp-back').hidden=index===0;$('gctp-next').hidden=index===3;$('gctp-publish').hidden=index!==3;
  if(index===3){const review=$('gctp-review');review.replaceChildren();
   for(const [label,value] of [
    ['Session name',$('gctp-name').value.trim()],['Teacher',identity?.name||''],
    ['School / country',`${identity?.school||''} · ${identity?.country||''}`],
    ['When',`${$('gctp-date').value} · ${$('gctp-from').value}–${$('gctp-to').value} (${identity?.timezone||''})`],
    ['Format',GCC_MODES_V150[selectedMode()].name],
    ['Participants',`${$('gctp-students').value} host-school students · ${$('gctp-capacity').value} total maximum · ${$('gctp-rooms').value} rooms`],
    ['My school level',$('gctp-band').selectedOptions[0]?.textContent||''],
    ['Partner levels',selectedLevels().join(', ')],['Theme',sessionTopic()],
    ['SDG',$('gctp-theme').value==='SDGs'&&$('gctp-sdg').value?`SDG ${$('gctp-sdg').value} · ${GCC_SDG_V150[Number($('gctp-sdg').value)-1]}`:''],
    ['Languages',$('gctp-language').value.trim()],['English level',$('gctp-english').value],
    ['Type',TYPE_LABEL_V203($('gctp-type').value)],['Platform',$('gctp-platform').selectedOptions[0]?.textContent],['Full agenda',$('gctp-flow').value]
   ].filter(([,v])=>v)){const row=element('div','gct-review-line');row.append(element('span','',label),element('strong','',value));review.append(row);}
  }
 }
 function validateFormStep(i){
  if(!identity)return 'Teacher profile not loaded yet.';
  if(i===0){if($('gctp-name').value.trim().length<3)return 'Please enter a session name (at least 3 characters).';
   const slot=makeSlot({date:$('gctp-date').value,startTime:$('gctp-from').value,endTime:$('gctp-to').value,timezone:identity.timezone});
   if(slot.error)return slot.error;if(Date.parse(slot.startsAt)<=Date.now())return 'Choose a future date and time.';
  }else if(i===1){const n=Number($('gctp-students').value),rooms=Number($('gctp-rooms').value);
   if(!Number.isInteger(n)||n<1||n>500)return 'Enter 1 to 500 students from your own school.';
   const cap=Number($('gctp-capacity').value);
   if(!Number.isInteger(cap)||cap<n||cap>2000)return 'Maximum total participants must include your own students (up to 2000).';
   if(!Number.isInteger(rooms)||rooms<1||rooms>100)return 'Enter 1 to 100 breakout rooms.';
   if(selectedLevels().length===0)return 'Please choose at least one partner school level.';
  }else if(i===2){try{detailsPayload();}catch(e){return e.message;}}return '';
 }
 $('gctp-theme').addEventListener('change',()=>{$('gctp-sdg-wrap').hidden=$('gctp-theme').value!=='SDGs';});
 for(const option of root.querySelectorAll('input[name="gctp-mode"]'))option.addEventListener('change',()=>{
  if(!option.checked)return;
  if(option.value==='classroom'&&$('gctp-rooms').value==='4')$('gctp-rooms').value='1';
  if(option.value==='device'&&$('gctp-rooms').value==='1')$('gctp-rooms').value='4';
 });
 $('gctp-next').addEventListener('click',()=>{const error=validateFormStep(formStep);if(error){inform(error,true);guide.show(error,formStep);return;}guide.clear();inform('');showFormStep(Math.min(3,formStep+1));});
 $('gctp-back').addEventListener('click',()=>{guide.clear();inform('');showFormStep(Math.max(0,formStep-1));});
 const upcoming=()=>offers.filter(o=>new Date(o.ends_at).getTime()>Date.now());
 async function refresh(){
  const [mine,applications,publicEvents,inbox]=await Promise.all([
    teacherSessions(),teacherRequests(),listPublicSessionOverviews(),teacherNotifications()
  ]);
  hostEvents=Array.isArray(publicEvents)?publicEvents:[];
  offers=Array.isArray(mine)?mine:[];requests=Array.isArray(applications)?applications:[];
  notifications=Array.isArray(inbox)?inbox:[];
  renderMine();renderHome();renderNotifications();updateFindCountries();
  countryExplorer.update([...upcoming(),...hostEventsAsOffersV208(hostEvents)],$('gctp-find-country').value);
  renderResults();renderRequests();
  await messages.refreshThreads({quiet:true});
 }
 function renderNotifications(){
  const unread=notifications.filter(x=>!x.read_at).length;
  for(const [elementId,countId] of [
   ['gcs212-notices-home','gcs212-notice-count-home'],
   ['gcs212-notices-requests','gcs212-notice-count-requests']
  ]){
   const mount=$(elementId);if(!mount)continue;
   mount.replaceChildren();$(countId).textContent=unread?'('+unread+' unread)':'';
   if(!notifications.length){
    mount.append(element('p','gct-empty','No notifications yet. Join requests and approvals appear here.'));continue;
   }
   for(const entry of notifications.slice(0,12)){
    const article=element('article','gcs212-notice'+(entry.read_at?'':' gcs212-notice-unread'));
    const text=element('div');
    text.append(element('strong','',entry.title),
     element('p','',entry.body),
     element('small','',fmt(entry.created_at,identity.timezone)));
    article.append(text);
    if(!entry.read_at){
     const mark=element('button','gct-secondary','Mark read');mark.type='button';
     mark.addEventListener('click',async()=>{
      mark.disabled=true;
      try{await teacherReadNotification(entry.id);
       entry.read_at=new Date().toISOString();renderNotifications();
      }catch(e){inform(e.message||'Could not mark notification as read',true);mark.disabled=false;}
     });article.append(mark);
    }
    mount.append(article);
   }
  }
 }
 async function duplicateOwnSession(o){
  if(!identity||!o.is_mine)throw Error('Only your own sessions can be duplicated.');
  if((savedDraftPresent||draftDirty)&&!confirm('Replace your current saved draft with a copy of this session?'))return;
  const start=timePartsV112(o.starts_at,identity.timezone).time;
  const end=timePartsV112(o.ends_at,identity.timezone).time;
  // A copy never inherits the old date/deadline. The teacher must choose both.
  const copied=copiedSessionDraftV213(o,{date:'',from:start,to:end,deadline:''});
  draftReady=false;
  try{
   applySessionDraftV213($('gctp-create'),copied);
   cloneFlyerUrl=copied.source_flyer_url||'';
   savedDraftPresent=true;draftDirty=true;draftRevision++;
   $('gcs213-discard-draft').hidden=false;
   showFormStep(0);display('create');
   draftReady=true;
   const persisted=await saveDraft(true);
   if(!persisted)inform('Copy loaded, but it has not synced to your account yet.',true);
   else inform('Session copied. Choose a new date and registration deadline before publishing.');
   window.history.replaceState(null,'','#/teacher-portal?view=create');
  }finally{draftReady=true;}
 }
 function makeManageCard(o,{compact=false}={}){
  const card=element('article','gct-session-card gcs212-offer');
  const ready=sessionReadinessV212(o);
  const head=element('div','gcs212-offer-head');
  head.append(element('strong','',sessionTitleV150(o)),
   element('span','gcs212-status '+(ready.ready?'gcs212-ready':'gcs212-incomplete'),
    ready.ready?'✓ Ready':ready.label));
  card.append(head,
    element('p','',timeRangeV112(o.starts_at,o.ends_at,identity.timezone)),
    element('small','',o.student_count+' host students · '+
      (o.approved_guest_students||0)+' approved guest students · '+
      (availableSeatsV212(o)??'Unknown')+' open seats · '+o.status));
  if(!ready.ready)card.append(element('p','gcs212-missing','Needs: '+ready.missing.join(' · ')));
  const row=element('div','gcs212-offer-actions');
  const edit=element('button','gct-primary',ready.ready?'✎ Edit session':'✎ Complete details');
  edit.type='button';
  edit.addEventListener('click',async()=>{
   edit.disabled=true;try{await manager.open(o);}
   catch(e){inform(e.message||'Unable to open session editor',true);}
   finally{edit.disabled=false;}
  });
  row.append(edit);
  const duplicate=element('button','gct-secondary','⧉ Duplicate');
  duplicate.type='button';
  duplicate.addEventListener('click',async()=>{
   duplicate.disabled=true;
   try{await duplicateOwnSession(o);}
   catch(e){inform(e.message||'Could not duplicate session',true);}
   finally{duplicate.disabled=false;}
  });
  row.append(duplicate);
  if(!compact){
   const status=element('button','gct-secondary',o.status==='open'?'Close to requests':'Reopen session');
   status.type='button';
   status.addEventListener('click',async()=>{
    if(!confirm(o.status==='open'?'Close this session to new requests? Approved schools remain registered.':'Reopen this session for new requests?'))return;
    status.disabled=true;
    try{
     if(o.status==='open')await teacherCloseSession(o.id);
     else await manager.reopen(o);
     await refresh();
     inform('Session status updated. Partner teachers were notified inside GCC.');
    }catch(e){inform(e.message||'Could not change status',true);status.disabled=false;}
   });row.append(status);
  }
  card.append(row);
  card.append(calendarMenuV214({...o,title:sessionTitleV150(o),viewer_zone:identity.timezone}));
  return card;
 }
 function renderHome(){
  const mine=upcoming().filter(o=>o.is_mine);
  const pending=requests.filter(r=>r.direction==='incoming'&&r.status==='pending');
  $('gctp-home-sessions-count').textContent=String(mine.length);
  $('gctp-home-requests-count').textContent=String(pending.length);
  const list=$('gctp-home-mine');list.replaceChildren();
  if(!mine.length){
   list.append(element('p','gct-empty','No upcoming sessions yet. Create one to meet classrooms worldwide.'));return;
  }
  for(const o of mine.slice(0,3))list.append(makeManageCard(o,{compact:true}));
 }
 function renderMine(){
  const list=$('gctp-mine');list.replaceChildren();
  const mine=upcoming().filter(o=>o.is_mine);
  if(!mine.length){
   list.append(element('p','gct-empty','No hosted sessions yet. Choose a date and publish one.'));return;
  }
  for(const o of mine)list.append(makeManageCard(o));
 }
 function currentSearchFilters(){
  const preset=$('gctp-find-preset').value;
  const times={morning:['08:00','12:00'],afternoon:['12:00','17:00'],evening:['17:00','22:00']};
  const [from,to]=preset==='custom'?[$('gctp-find-from').value,$('gctp-find-to').value]:
    times[preset]||['',''];
  return {
   date:discoverMode==='time'?$('gctp-find-date').value:'',
   from:discoverMode==='time'?from:'',to:discoverMode==='time'?to:'',
   country:discoverMode==='map'?$('gctp-find-country').value:'',
   band:$('gctp-find-band').value,mode:$('gctp-find-mode').value,
   kind:$('gctp-find-type').value,sdg:$('gctp-find-sdg').value,
   age:$('gctp-find-age').value,query:$('gctp-find-topic').value,
   compatible:$('gctp-find-compatible').checked,
   sort:$('gcs213-sort').value,favoritesOnly:$('gcs213-favorites-only').checked,
   favoriteKeys:favorites
  };
 }
 function updateFindCountries(){
  const select=$('gctp-find-country'),current=select.value;
  const codes=new Map([...upcoming().filter(o=>!o.is_mine&&o.status==='open'),...hostEventsAsOffersV208(hostEvents)].filter(o=>o.country_code).map(o=>[o.country_code,o.country_name]));
  select.replaceChildren(new Option('Any country',''));
  for(const [code,name] of [...codes].sort((a,b)=>a[1].localeCompare(b[1])))select.add(new Option(name,code));
  if(codes.has(current))select.value=current;
  else select.value='';
 }
 function renderResults(){
  if(!identity)return;
  const list=$('gctp-results');list.replaceChildren();
  const records=sessionSearchRecordsV213(upcoming(),hostEvents);
  const filtered=filterSessionRecordsV213(records,currentSearchFilters(),identity);
  const page=sessionResultsPageV213(filtered,visibleCount);
  $('gctp-search-count').textContent=page.total+' sessions · '+page.items.length+' shown';
  const more=$('gcs213-show-more');
  more.hidden=!page.hasMore;
  more.textContent='Show '+Math.min(12,page.remaining)+' more sessions ↓ ('+page.remaining+' remaining)';
  if(!page.total){
   list.append(element('p','gct-empty',
    'No sessions match your filters. Try another date, level, or show all sessions.'));
   return;
  }
  const previously=new Map(requests.filter(r=>r.direction==='outgoing').map(r=>[r.offer_id,r]));
  for(const item of page.items){
   if(item.source==='offer'){
    const o=item.item,d=detailsV150(o);
    const card=element('article','gct-session-card gcs150-result gcs208-compact gcs209-session-card');
    card.dataset.startsAt=o.starts_at;
    appendVisualBasicsV209(document,card,{title:sessionTitleV150(o),start:o.starts_at,end:o.ends_at,
     zone:identity.timezone,host:{code:o.country_code,name:o.country_name,flag:flag(o.country_code)},
     schoolLevel:schoolLevelV209(o)});
    card.append(element('p','gcs209-subline',o.school_name+' · '+o.teacher_name));
    card.append(favoriteControl('offer',o.id));
    card.append(calendarMenuV214({...o,title:sessionTitleV150(o),viewer_zone:identity.timezone}));
    if(GCC_MODES_V150[d.mode])
     card.append(element('span','gcs209-format',GCC_MODES_V150[d.mode].icon+' '+GCC_MODES_V150[d.mode].name));
    if(o.timezone&&o.timezone!==identity.timezone)
     card.append(element('small','gcs209-host-time','Host local time: '+
       timeRangeV112(o.starts_at,o.ends_at,o.timezone)));
    card.append(element('small','gcs209-capacity','👥 '+o.student_count+
      ' host-school students · '+(availableSeatsV212(o)===null?'Capacity not set':
      availableSeatsV212(o)+' seats remaining')));
    const full=element('details','gcs208-compact-details gcs209-details');
    full.append(element('summary','','🔎 View details'));
    const body=element('div','gcc203-result-body');
    renderSessionDetailsV203(body,d);full.append(body);card.append(full);
    const previous=previously.get(o.id);
    if(o.is_mine){
     const edit=element('button','gcs209-register','✎ Manage my session');edit.type='button';
     edit.addEventListener('click',async()=>{
      edit.disabled=true;try{await manager.open(o);}
      catch(e){inform(e.message||'Could not edit this session',true);}
      finally{edit.disabled=false;}
     });card.append(edit);
    }else if(previous){
     card.append(element('span','gcs212-status',requestStatusLabelV212(previous)));
    }else if(!canRequestV212(o)){
     card.append(element('span','gcs212-status gcs212-incomplete',
      availableSeatsV212(o)===0?'Fully booked':'Host must complete the capacity setting'));
    }else{
     const detail=element('details','gct-request-form gcs209-join');
     detail.append(element('summary','','🤝 Request Join'));
     const countLabel=element('label','gcs212-request-count','Students joining from your school *');
     const count=element('input');count.type='number';count.min='1';
     count.max=String(Math.min(500,availableSeatsV212(o)));count.value='1';
     count.required=true;count.setAttribute('aria-label','Number of students joining your school');
     countLabel.append(count);
     const message=element('textarea');message.rows=2;message.maxLength=500;
     message.placeholder='Optional message to the host teacher';
     message.setAttribute('aria-label','Message to the session host');
     const submit=element('button','gct-primary gcs209-submit','Send join request →');submit.type='button';
     submit.addEventListener('click',async()=>{
      const number=Number(count.value);
      if(!count.checkValidity()||!Number.isInteger(number)){
       count.focus();inform('Enter a student count within the available seats.',true);return;
      }
      submit.disabled=true;prepareSuccessChime();
      try{
       await teacherApply(o.id,message.value.trim(),number);await refresh();
       inform('Request sent! The host received an in-app notification.');
       showSuccessCelebration({title:'Request sent!',detail:'The host can now review your request.'});
      }catch(e){inform(e.message||'Request failed.',true);submit.disabled=false;}
     });
     detail.append(countLabel,message,submit);card.append(detail);
    }
    list.append(card);
   }else{
    const e=item.item;
    const card=element('article','gct-session-card gcs150-result gcs208-compact gcs208-hosted gcs209-session-card');
    card.dataset.startsAt=e.starts_at;
    appendVisualBasicsV209(document,card,{title:e.title,start:e.starts_at,end:e.ends_at,
     zone:identity.timezone,host:hostCountryV208(e),schoolLevel:schoolLevelV209(e)});
    card.append(favoriteControl('event',e.id));
    card.append(calendarMenuV214({...e,viewer_zone:identity.timezone}));
    if(e.timezone&&e.timezone!==identity.timezone)
     card.append(element('small','gcs209-host-time','Host local time: '+
       timeRangeV112(e.starts_at,e.ends_at,e.timezone)));
    if(totalCapacityV208(e))
     card.append(element('small','gcs209-capacity','👥 Up to '+
       totalCapacityV208(e)+' students (including host school)'));
    const info=element('details','gcs208-compact-details gcs209-details');
    info.append(element('summary','','🔎 View details'));
    const body=element('div','gcc203-result-body');
    renderSessionDetailsV203(body,e.session_details);info.append(body);card.append(info);
    // Published host-managed events retain the student-roster registration flow.
    const register=element('a','gct-primary gcs208-register gcs209-register','👩‍🏫 Register Students');
    register.href='#/session-register?session='+encodeURIComponent(e.id);
    card.append(register);list.append(card);
   }
  }
 }
 function renderRequests(){
  const incoming=$('gctp-incoming'),outgoing=$('gctp-outgoing');
  incoming.replaceChildren();outgoing.replaceChildren();
  for(const [direction,list] of Object.entries({incoming,outgoing})){
   const matches=requests.filter(r=>r.direction===direction);
   if(!matches.length){
    list.append(element('p','gct-empty','No requests yet.'));continue;
   }
   for(const r of matches){
    const card=element('article','gct-session-card gcs212-request');
    card.append(element('span','gct-status '+r.status,requestStatusLabelV212(r)),
     element('strong','',direction==='incoming'?
      r.guest_name+' requested to join':r.host_name+' · '+(r.topic||'Open exchange')),
     element('small','',fmt(r.starts_at,identity.timezone)),
     element('span','gcs212-students','👥 '+r.requested_students+' student'+
      (Number(r.requested_students)===1?'':'s')+' requested'));
    if(r.message)card.append(element('p','',r.message));
    if(r.status==='approved'){
     const controls=element('div','gcs214-request-calendar');
     const btn=element('button','gcs214-msg-link','✉ Message partner');
     btn.type='button';
     btn.addEventListener('click',async()=>{
      btn.disabled=true;
      try{await openPartnerMessages(r.id);}
      catch(e){inform(e.message||'Could not open the conversation',true);}
      finally{btn.disabled=false;}
     });
     controls.append(btn,calendarMenuV214({
      id:r.offer_id,title:r.topic||'Global Classroom Exchange',
      starts_at:r.starts_at,ends_at:r.ends_at,viewer_zone:identity.timezone
     }));
     card.append(controls);
    }
    if(direction==='incoming'&&r.status==='pending'){
     const actions=element('div','gct-card-actions');
     for(const [decision,label] of [['approved','Approve & reserve seats'],['declined','Decline']]){
      const btn=element('button',decision==='approved'?'gct-primary':'gct-secondary',label);
      btn.type='button';
      btn.addEventListener('click',async()=>{
       if(!confirm(decision==='approved'?
        'Approve '+r.requested_students+' students? The seats will be reserved and the teacher notified inside GCC.':
        'Decline the request? The teacher will be notified inside GCC.'))return;
       btn.disabled=true;
       try{
        await teacherReview(r.id,decision);await refresh();
        inform(decision==='approved'?'Seats reserved and teacher notified inside GCC.':'Request declined; teacher notified inside GCC.');
       }catch(e){inform(e.message,true);btn.disabled=false;}
      });actions.append(btn);
     }
     card.append(actions);
    }
    if(direction==='outgoing'&&r.status==='approved'&&r.reconfirmation_required){
     const ack=element('button','gct-primary','✓ Confirm the new session time');ack.type='button';
     ack.addEventListener('click',async()=>{
      ack.disabled=true;
      try{await teacherConfirmSchedule(r.id);await refresh();
       inform('New session time confirmed. The host was notified.');}
      catch(e){inform(e.message||'Could not confirm the new time',true);ack.disabled=false;}
     });
     card.append(ack);
    }
    list.append(card);
   }
  }
 }
 async function init(){try{identity=await teacherIdentity();
   if(!identity.timezone){
    inform('Your school timezone is missing. Ask your school administrator to set it before creating or browsing sessions; GCC will not assume Japan time.',true);
    $('gctp-create').hidden=true;$('gctp-next').disabled=true;
    $('gctp-find-zone-label').textContent='School timezone not configured';
    return;
   }
   $('gctp-greeting').textContent=`${flag(identity.country_code)} ${identity.name} · ${identity.school}`;
  $('gctp-zone').value=identity.timezone;$('gctp-date').value=tomorrow(identity.timezone);
  $('gctp-host-school').textContent=identity.school||'School not linked';
  $('gctp-host-identity').textContent=`${identity.name} · ${identity.country}`;
  $('gctp-find-zone-label').textContent=`Your school time zone: ${identity.timezone}`;
  const level=GCC_LEVELS_V150.find(([id])=>id===identity.school_level)?.[0]||'Upper Secondary';
  $('gctp-band').value=level;
  const checkbox=root.querySelector(`input[name="gctp-target-level"][value="${level}"]`);
  if(checkbox)checkbox.checked=true;
  await refresh();await loadTeacherWorkspace();inform('');await mountVolunteerV117(root,display);
  const networkProfile=await myTeacherProfileV116();
  // Only fetch/edit photo + profile details on their dedicated pages.
  if(view==='profile')await mountTeacherProfileV153(root,updated=>{
   if(!updated)return;
   identity.name=updated.name||identity.name;
   $('gctp-greeting').textContent=`${flag(identity.country_code)} ${identity.name} · ${identity.school}`;
   $('gctp-host-identity').textContent=`${identity.name} · ${identity.country}`;
  });
  if(view==='network')await mountTeacherNetworkV116(root);
  if(!networkProfile?.timezone){$('gctp-zone').value='';$('gctp-next').disabled=true;inform('Your school time zone is missing. Ask the host to set it before publishing a session.',true);}}catch(e){inform(e.message||'Could not load teacher profile.',true);}}
 $('gctp-create').addEventListener('input',scheduleDraft);
 $('gctp-create').addEventListener('change',scheduleDraft);
 $('gcs213-save-draft').addEventListener('click',async()=>{
  if(!identity)return;
  draftDirty=true;draftRevision++;
  const saved=await saveDraft(true);
  if(saved)inform('Draft saved privately to your teacher account.');
  else inform('Draft could not be saved. Please check your connection.',true);
 });
 $('gcs213-discard-draft').addEventListener('click',async()=>{
  if(!confirm('Discard your saved session draft? This cannot be undone.'))return;
  draftReady=false;
  if(draftTimer){clearTimeout(draftTimer);draftTimer=null;}
  try{
   await draftChain;
   await teacherClearDraftV213();
   $('gctp-create').reset();
   cloneFlyerUrl='';draftDirty=false;savedDraftPresent=false;
   $('gcs213-discard-draft').hidden=true;
   $('gctp-date').value=tomorrow(identity.timezone);
   $('gctp-zone').value=identity.timezone;
   const level=GCC_LEVELS_V150.find(([id])=>id===identity.school_level)?.[0]||'Upper Secondary';
   $('gctp-band').value=level;
   root.querySelector('input[name="gctp-target-level"][value="'+level+'"]')?.click();
   $('gctp-sdg-wrap').hidden=true;
   showFormStep(0);draftStatus('Draft discarded');
  }catch(e){draftStatus('Could not discard draft: '+(e.message||'Try again.'));}
  finally{draftReady=true;}
 });
 $('gctp-create').addEventListener('submit',async e=>{e.preventDefault();if(!identity)return;
   const slot=makeSlot({date:$('gctp-date').value,startTime:$('gctp-from').value,endTime:$('gctp-to').value,timezone:identity.timezone});
   if(slot.error){inform(slot.error,true);guide.show(slot.error,0);return;}if(Date.parse(slot.startsAt)<=Date.now()){inform('Choose a future date and time.',true);guide.show('Choose a future date and time.',0);return;}
   for(let step=0;step<3;step++){const error=validateFormStep(step);if(error){showFormStep(step);inform(error,true);guide.show(error,step);return;}}
   let plan;try{plan=detailsPayload();}catch(err){showFormStep(2);inform(err.message,true);guide.show(err.message,2);return;}
   const data={zone:identity.timezone,students:Number($('gctp-students').value),rooms:Number($('gctp-rooms').value),band:$('gctp-band').value,topic:sessionTopic(),notes:$('gctp-notes').value.trim(),details:plan};
   if(!Number.isInteger(data.students)||data.students<1||data.students>500||!Number.isInteger(data.rooms)||data.rooms<1||data.rooms>100){showFormStep(1);inform('Check student and room counts.',true);guide.show('Check student count',1);return;}
   const btn=$('gctp-publish');btn.disabled=true;publishing=true;
   let created=false;
   try{
    const flyer=$('gctp-flyerfile').files?.[0];
    if(flyer)data.details.flyer_url=await uploadSessionFlyerV203(flyer);
    else if(cloneFlyerUrl)data.details.flyer_url=cloneFlyerUrl;
    prepareSuccessChime();await teacherCreateSession(slot,data);created=true;
    if(draftTimer){clearTimeout(draftTimer);draftTimer=null;}
    await draftChain;
    try{
     await teacherClearDraftV213();draftStatus('Published · draft cleared');
    }catch(e){
     draftStatus('Session published, but old draft could not be cleared. You may discard it manually.');
    }
    draftDirty=false;savedDraftPresent=false;cloneFlyerUrl='';
    $('gcs213-discard-draft').hidden=true;
    $('gctp-create').reset();
    $('gctp-date').value=tomorrow(identity.timezone);$('gctp-zone').value=identity.timezone;
    const defaultLevel=GCC_LEVELS_V150.find(([id])=>id===identity.school_level)?.[0]||'Upper Secondary';
    $('gctp-band').value=defaultLevel;
    const defaultCheck=root.querySelector(`input[name="gctp-target-level"][value="${defaultLevel}"]`);
    if(defaultCheck)defaultCheck.checked=true;
    $('gctp-sdg-wrap').hidden=true;
    showFormStep(0);display('create');
    try{await refresh();}
    catch(e){inform('Published successfully. Refresh the page to update the session list.',true);}
    if(!notice.textContent||!notice.classList.contains('error'))
     inform('Session published to approved teachers. No email sent.');
    showSuccessCelebration({title:'Session published!',detail:'Approved teachers can now discover your session.'});
   }
   catch(err){
    const msg=err.message||'Could not publish the session.';
    inform(created?'Session published, but refreshing the page failed.':msg,true);
    if(!created){showFormStep(2);guide.show(msg,2);}
   }finally{publishing=false;btn.disabled=false;}
 });
 $('gcs213-show-more').addEventListener('click',()=>{visibleCount=Math.min(500,visibleCount+12);renderResults();});
 $('gcs213-sort').addEventListener('change',()=>{visibleCount=12;renderResults();});
 $('gcs213-favorites-only').addEventListener('change',()=>{visibleCount=12;renderResults();});
 const searchDialogs=['gctp-search-choice','gctp-find-time-panel','gctp-find-map-panel'];
 const openSearchModal=(id)=>{
  for(const other of searchDialogs){if($(other)?.open)$(other).close();}
  const dlg=$(id);
  if(typeof dlg.showModal==='function')dlg.showModal();
  else dlg.setAttribute('open','');
 };
 const setDiscoverMode=(mode)=>{
  discoverMode=mode==='map'?'map':'time';visibleCount=12;
  for(const button of root.querySelectorAll('[data-gcs151-discovery]')){
   button.setAttribute('aria-pressed',String(button.dataset.gcs151Discovery===discoverMode));
  }
  openSearchModal(discoverMode==='map'?'gctp-find-map-panel':'gctp-find-time-panel');
  if(discoverMode==='map')countryExplorer.load();
  renderResults();
 };
 for(const button of root.querySelectorAll('[data-gcs151-discovery]')){
  button.addEventListener('click',()=>setDiscoverMode(button.dataset.gcs151Discovery));
 }
 $('gctp-open-search').addEventListener('click',()=>openSearchModal('gctp-search-choice'));
 $('gctp-show-all').addEventListener('click',()=>{
  $('gctp-search-choice').close();discoverMode='time';visibleCount=12;
  $('gctp-reset-filters').click();
  $('gctp-search-summary').textContent='All upcoming sessions';
  scrollToCountryResultsV208($('gctp-results'));
 });
 $('gctp-apply-time').addEventListener('click',()=>{
  $('gctp-find-time-panel').close();visibleCount=12;
  $('gctp-search-summary').textContent='🕒 Time and date preferences applied';
  renderResults();scrollToCountryResultsV208($('gctp-results'));
 });
 $('gctp-apply-map').addEventListener('click',()=>{
  $('gctp-find-map-panel').close();visibleCount=12;
  const selected=$('gctp-find-country');
  $('gctp-search-summary').textContent=selected.value?'🌐 '+selected.selectedOptions[0].textContent:'🌐 All host countries';
  renderResults();scrollToCountryResultsV208($('gctp-results'));
 });
 for(const cancel of root.querySelectorAll('[data-gcs209-cancel]')){
  cancel.addEventListener('click',()=>cancel.closest('dialog')?.close());
 }
 $('gctp-reset-filters').addEventListener('click',()=>{
  visibleCount=12;$('gcs213-sort').value='soonest';$('gcs213-favorites-only').checked=false;
  $('gctp-find-preset').value='any';$('gctp-find-date').value='';
  $('gctp-find-custom').hidden=true;$('gctp-find-country').value='';
  for(const id of ['gctp-find-band','gctp-find-mode','gctp-find-type','gctp-find-age','gctp-find-sdg','gctp-find-topic'])$(id).value='';
  $('gctp-find-compatible').checked=false;
  countryExplorer.update([...upcoming(),...hostEventsAsOffersV208(hostEvents)],'');renderResults();
 });
 $('gctp-find-preset').addEventListener('change',()=>{visibleCount=12;$('gctp-find-custom').hidden=$('gctp-find-preset').value!=='custom';renderResults();});
 for(const id of ['gctp-find-date','gctp-find-from','gctp-find-to','gctp-find-country','gctp-find-band','gctp-find-mode','gctp-find-type','gctp-find-age','gctp-find-sdg','gctp-find-compatible','gctp-find-topic']){
  $(id).addEventListener(id==='gctp-find-topic'?'input':'change',()=>{
   visibleCount=12;
   if(id==='gctp-find-country')countryExplorer.update([...upcoming(),...hostEventsAsOffersV208(hostEvents)],$('gctp-find-country').value);
   renderResults();
   if(id==='gctp-find-country'&&discoverMode==='map'&&$('gctp-find-country').value){$('gctp-find-map-panel').close();$('gctp-search-summary').textContent='🌐 '+$('gctp-find-country').selectedOptions[0].textContent;scrollToCountryResultsV208($('gctp-results'));}
  });
 }
 $('gcs212-refresh-notices').addEventListener('click',async()=>{
  const button=$('gcs212-refresh-notices');button.disabled=true;
  try{
   const inbox=await teacherNotifications();
   notifications=Array.isArray(inbox)?inbox:[];
   renderNotifications();inform('Notifications refreshed.');
  }catch(e){inform(e.message||'Could not refresh notifications.',true);}
  finally{button.disabled=false;}
 });
 // Lightweight refresh for active teacher workspaces; automatically stops on navigation.
 const messagePoll=setInterval(async()=>{
  if(!root.isConnected){clearInterval(messagePoll);return;}
  if(identity&&!document.hidden)await messages.poll();
 },30000);
 const notificationPoll=setInterval(async()=>{
  if(!root.isConnected){clearInterval(notificationPoll);return;}
  if(!identity||document.hidden)return;
  try{
   const inbox=await teacherNotifications();
   notifications=Array.isArray(inbox)?inbox:[];
   renderNotifications();
  }catch{/* A failed poll never disrupts creating or joining a session. */}
 },60000);
 $('gctp-logout').addEventListener('click',async()=>{try{await teacherSignOut();window.location.hash='#/teacher-access';}catch(e){inform(e.message,true);}});
 const view=new URLSearchParams(window.location.hash.split('?')[1]||'').get('view')||'home';
 if(!['home','create','find','volunteer','network','requests','profile','messages'].includes(view)){window.location.hash='#/teacher-portal?view=home';return;}
 showFormStep(0);display(view);if(view==='find')openSearchModal('gctp-search-choice');
 init().then(()=>{if(view==='messages')messages.open().catch(e=>inform(e.message,true));})
  .catch(e=>inform(e.message,true));
}
