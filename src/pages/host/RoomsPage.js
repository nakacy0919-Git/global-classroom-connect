import { rooms } from '../../data/mockData';

export function RoomsPage() {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Automatic Assignment</p>
          <h2 class="section-title">Room Builder</h2>
        </div>
        <div class="button-row">
          <button class="secondary-button">Facilitator Pool</button>
          <button class="primary-button">Generate Rooms</button>
        </div>
      </div>

      <div class="room-grid">
        ${rooms
          .map(
            (room) => `
              <article class="room-card">
                <div class="room-head">
                  <div>
                    <p class="eyebrow">${room.role}</p>
                    <h3>${room.room}</h3>
                  </div>
                  <span class="tag">6 members</span>
                </div>

                <div class="facilitator-box">
                  <span>Facilitator</span>
                  <strong>${room.facilitator}</strong>
                </div>

                <ul class="member-list">
                  ${room.members
                    .map(
                      (member) => `
                        <li>${member}</li>
                      `
                    )
                    .join('')}
                </ul>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}