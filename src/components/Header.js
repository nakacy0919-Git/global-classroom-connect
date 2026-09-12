const titles = {
  dashboard: 'Host Dashboard',
  events: 'Event Management',
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