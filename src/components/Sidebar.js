const menuItems = [
  { key: 'dashboard', label: 'Host Dashboard' },
  { key: 'events', label: 'Events' },
  { key: 'schools', label: 'School Library' },
  { key: 'rooms', label: 'Room Builder' },
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