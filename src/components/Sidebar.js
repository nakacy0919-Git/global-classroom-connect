const menuItems = [
  { key: 'dashboard', label: 'Host Dashboard' },
  { key: 'events', label: 'Events' },
  { key: 'session-control', label: 'Session Control Center' }, // GCC_SESSION_ROSTER_V6
  { key: 'scheduling', label: 'Schedule Planner' },
  { key: 'register-session', label: '＋ Register a Session' }, // GCC_SESSION_SPLIT_V3
  { key: 'find-session', label: '⌕ Find a Session' },
  { key: 'join-requests', label: '✉ Join Requests' }, // GCC_JOIN_V4
  { key: 'teacher-invites', label: '✉ Teacher Invitations' }, // GCC_TEACHER_SELF_V5
  { key: 'schools', label: 'School Library' },
  { key: 'teachers', label: 'Teacher Database' },
  { key: 'participants', label: 'Participant Pool' },
  { key: 'rooms', label: 'Room Builder' },
  { key: 'round-overview', label: 'Round Overview' },
  { key: 'registration', label: 'Teacher Registration' },
  { key: 'session-board', label: 'Participant Board' },
];

export function Sidebar(activeRoute) {
  return `
    <aside class="sidebar">
      <div class="brand-block">
        <div class="brand-mark">GC</div>
        <div>
          <p class="brand-name">Global Classroom</p>
          <h2 class="brand-title">Connect</h2>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${menuItems
          .map(
            (item) => `
              <a
                href="#/${item.key}"
                class="route-link ${activeRoute === item.key ? 'active' : ''}"
              >
                ${item.label}
              </a>
            `
          )
          .join('')}
      </nav>

      <div class="sidebar-footer">
        <p class="sidebar-note">PC First UI</p>
        <p class="sidebar-subnote">Blue Sky × Ocean Design</p>
      </div>
    </aside>
  `;
}