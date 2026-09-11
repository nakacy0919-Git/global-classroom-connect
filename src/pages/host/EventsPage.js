import { eventTemplates } from '../../data/mockData';

export function EventsPage() {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Ver.1 Templates</p>
          <h2 class="section-title">Event Types</h2>
        </div>
        <button class="primary-button">+ Create Event</button>
      </div>

      <div class="event-grid">
        ${eventTemplates
          .map(
            (item) => `
              <article class="card">
                <span class="tag">Template</span>
                <h3>${item.name}</h3>
                <p class="muted">${item.description}</p>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}