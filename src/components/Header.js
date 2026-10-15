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
  'teacher-invites': 'Teacher Invitations', // GCC_TEACHER_SELF_V5
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
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Global Classroom Connect</p>
        <h1 class="page-title">${titles[route]}</h1>
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