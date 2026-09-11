export function SessionBoardPage() {
  return `
    <section class="participant-shell">
      <article class="participant-card">
        <p class="eyebrow">Participant View</p>
        <h2>Hello Sophia! 👋</h2>
        <p class="muted">Philippines</p>

        <div class="participant-box">
          <span>NOW</span>
          <strong>Room 1</strong>
          <p>Facilitator: Kohei Nakashima 🇯🇵</p>
        </div>

        <div class="participant-box">
          <span>NEXT</span>
          <strong>Activity Room</strong>
          <p>Drawing / Room 4</p>
        </div>

        <button class="primary-button full-width">Join Zoom Room</button>
      </article>
    </section>
  `;
}