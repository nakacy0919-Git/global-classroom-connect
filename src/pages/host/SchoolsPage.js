import { schools } from '../../data/mockData';

export function SchoolsPage() {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Reusable Data</p>
          <h2 class="section-title">School Library</h2>
        </div>
        <button class="primary-button">+ Add School</button>
      </div>

      <div class="school-grid">
        ${schools
          .map(
            (school) => `
              <article class="card">
                <span class="tag">${school.country}</span>
                <h3>${school.name}</h3>
                <p class="muted">${school.city}</p>
                <p class="small-line"><strong>Language:</strong> ${school.language}</p>
                <p class="muted">${school.intro}</p>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}