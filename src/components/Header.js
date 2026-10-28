const titles = {
  dashboard: 'Host Dashboard',
  sessions: 'Sessions',
  events: 'Event Management',
  'session-control': 'Session Control Center', // GCC_SESSION_ROSTER_V6
  scheduling: 'Schedule Planner',
  matching: 'Exchange Matching (Host Tools)', // GCC_EXCHANGE_MATCHING_V1
  'register-session': 'Register a Session', // GCC_SESSION_SPLIT_V3
  'find-session': 'Find a Session',
  'join-requests': 'Join Requests', // GCC_JOIN_V4
  'teacher-invites': 'Teacher Invitations',
  'teacher-approvals': 'Teacher Applications', // GCC_TEACHER_SELF_V5
  'teacher-portal': 'Teacher Workspace',
  schools: 'School Library',
  teachers: 'Teacher Database',
  participants: 'Participant Pool',
  rooms: 'Room Builder',

  'round-overview': 'Round Overview',

  registration: 'Teacher Registration',
  'session-board': 'Participant Session Board',
};

export function Header(route) {
  const view=route==='teacher-portal'?new URLSearchParams(window.location.hash.split('?')[1]||'').get('view'):null;
  const teacherTitles={profile:'My Profile',create:'Host a Session',find:'Find a Session',requests:'My Requests',network:'Teacher Network',volunteer:'Be a Facilitator / GC Host'};
  const pageTitle=route==='teacher-portal'?(teacherTitles[view]||'Global Classroom Connect'):titles[route];
  return `
    <header class="topbar">
      <div class="gcc152-topbar-main">
        <button id="gcc-mobile-menu-button" class="gcc-mobile-menu-button" type="button" aria-label="Open navigation menu" aria-controls="gcc-mobile-sidebar" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          <span>Menu</span>
        </button>
        <div class="gcc152-title-block">
          <p class="eyebrow">Global Classroom Connect</p>
          <h1 class="page-title">${pageTitle}</h1>
        </div>
      </div>

      <div class="topbar-actions">
        <div class="topbar-pill">
          <span class="pill-label">Language</span>
          <strong id="current-language">English</strong>
        </div>

        <button class="lang-button" data-lang="en">EN</button>
        <button class="lang-button" data-lang="ja">日本語</button>
      </div>
    </header>
  `;
}