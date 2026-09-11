import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';

import { DashboardPage } from './pages/host/DashboardPage.js';
import { EventsPage } from './pages/host/EventsPage.js';
import { SchoolsPage } from './pages/host/SchoolsPage.js';
import { RoomsPage } from './pages/host/RoomsPage.js';

import { RegistrationPage } from './pages/teacher/RegistrationPage.js';
import { SessionBoardPage } from './pages/participant/SessionBoardPage.js';

const routes = {
  dashboard: DashboardPage,
  events: EventsPage,
  schools: SchoolsPage,
  rooms: RoomsPage,
  registration: RegistrationPage,
  'session-board': SessionBoardPage,
};

function getCurrentRoute() {
  const raw = window.location.hash.replace('#/', '').trim();
  return routes[raw] ? raw : 'dashboard';
}

function renderCurrentPage(route) {
  const page = routes[route];
  const container = document.querySelector('#page-content');
  container.innerHTML = page();
}

function bindUiEvents() {
  const langButtons = document.querySelectorAll('[data-lang]');
  const langLabel = document.querySelector('#current-language');

  langButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const lang = button.dataset.lang;
      if (langLabel) {
        langLabel.textContent = lang === 'ja' ? '日本語' : 'English';
      }
    });
  });
}

export function renderApp() {
  const route = getCurrentRoute();
  const app = document.querySelector('#app');

  app.innerHTML = `
    <div class="app-shell">
      ${Sidebar(route)}
      <div class="main-shell">
        ${Header(route)}
        <main id="page-content" class="page-content"></main>
      </div>
    </div>
  `;

  renderCurrentPage(route);
  bindUiEvents();
}