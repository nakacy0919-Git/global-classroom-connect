import { dashboardStats, upcomingEvent, timeline } from '../../data/mockData';
import { StatCard } from '../../components/StatCard';

export function DashboardPage() {
  return `
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">Platform Overview</p>
        <h2>Run international exchange with clarity and style.</h2>
        <p>
          Manage events, schools, facilitators, breakout rooms and participant views
          from one PC-friendly platform.
        </p>
      </div>
      <div class="hero-badge">
        <span>Ocean Blue Theme</span>
      </div>
    </section>

    <section class="stats-grid">
      ${dashboardStats.map((item) => StatCard(item.label, item.value)).join('')}
    </section>

    <section class="page-grid">
      <article class="panel">
        <p class="eyebrow">Upcoming Event</p>
        <h3>${upcomingEvent.title}</h3>
        <p class="muted">${upcomingEvent.subtitle}</p>

        <ul class="info-list">
          <li><span>Date</span><strong>${upcomingEvent.date}</strong></li>
          <li><span>Time</span><strong>${upcomingEvent.timeJst}</strong></li>
          <li><span>Format</span><strong>${upcomingEvent.format}</strong></li>
          <li><span>Rounds</span><strong>${upcomingEvent.rounds}</strong></li>
          <li><span>Rooms</span><strong>${upcomingEvent.rooms}</strong></li>
        </ul>
      </article>

      <article class="panel">
        <p class="eyebrow">Timeline</p>
        <h3>Session Flow</h3>
        <ul class="timeline-list">
          ${timeline
            .map(
              (item) => `
                <li>
                  <strong>${item.time}</strong>
                  <span>${item.activity}</span>
                </li>
              `
            )
            .join('')}
        </ul>
      </article>
    </section>
  `;
}