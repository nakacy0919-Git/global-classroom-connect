export function RegistrationPage() {
  return `
    <section class="split-grid">
      <article class="panel">
        <p class="eyebrow">Teacher Side</p>
        <h2 class="section-title">Register Your School</h2>

        <div class="form-grid">
          <label class="field">
            <span>School Name</span>
            <input class="input" value="Anjo Gakuen High School" />
          </label>

          <label class="field">
            <span>Country</span>
            <input class="input" value="Japan" />
          </label>

          <label class="field">
            <span>Teacher Name</span>
            <input class="input" value="Kohei Nakashima" />
          </label>

          <label class="field">
            <span>Participation Style</span>
            <select class="input">
              <option>Individual Devices</option>
              <option>One Classroom Device</option>
              <option>Mixed</option>
            </select>
          </label>

          <label class="field full">
            <span>School Introduction</span>
            <textarea class="input textarea" placeholder="Short school introduction..."></textarea>
          </label>

          <label class="field">
            <span>Number of Students</span>
            <input class="input" value="12" />
          </label>

          <label class="field">
            <span>Can you be a facilitator?</span>
            <select class="input">
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>
        </div>

        <div class="button-row">
          <button class="secondary-button">Save Draft</button>
          <button class="primary-button">Submit Registration</button>
        </div>
      </article>

      <article class="panel">
        <p class="eyebrow">Saved for Future Events</p>
        <h2 class="section-title">School Profile Preview</h2>
        <ul class="info-list">
          <li><span>School</span><strong>Anjo Gakuen High School</strong></li>
          <li><span>Country</span><strong>Japan</strong></li>
          <li><span>Language</span><strong>Japanese / English</strong></li>
          <li><span>Style</span><strong>Individual Devices</strong></li>
          <li><span>Facilitator</span><strong>Available</strong></li>
        </ul>
      </article>
    </section>
  `;
}