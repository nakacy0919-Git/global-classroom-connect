import { getSchools } from '../../services/schoolService.js';
import { getCurrentProfile } from '../../services/authService.js';


function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) {
    return '🌍';
  }

  return countryCode
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(
        127397 + char.charCodeAt()
      )
    );
}


export async function SchoolsPage() {
  try {
    const [schools, profile] = await Promise.all([
      getSchools(),
      getCurrentProfile(),
    ]);

    const isHost =
      profile?.role === 'host';

    return `
      <section class="panel">

        <div class="section-head">

          <div>
            <p class="eyebrow">
              Global School Network
            </p>

            <h2 class="section-title">
              School Library
            </h2>

            <p class="muted">
              ${schools.length} schools registered
            </p>
          </div>

          ${
            isHost
              ? `
                <button
                  id="add-school-button"
                  class="primary-button"
                  type="button"
                >
                  + Add School
                </button>
              `
              : ''
          }

        </div>


        ${
          isHost
            ? `
              <section
                id="add-school-form-wrapper"
                class="add-school-panel hidden"
              >

                <div class="section-head">

                  <div>
                    <p class="eyebrow">
                      New Partner School
                    </p>

                    <h3>
                      Add School
                    </h3>
                  </div>

                  <button
                    id="cancel-school-button"
                    class="secondary-button"
                    type="button"
                  >
                    Cancel
                  </button>

                </div>


                <form id="add-school-form">

                  <div class="form-grid">

                    <label class="field">
                      <span>
                        School Name *
                      </span>

                      <input
                        id="school-name"
                        class="input"
                        type="text"
                        required
                      />
                    </label>


                    <label class="field">
                      <span>
                        Country *
                      </span>

                      <input
                        id="school-country-name"
                        class="input"
                        type="text"
                        placeholder="Japan"
                        required
                      />
                    </label>


                    <label class="field">
                      <span>
                        Country Code *
                      </span>

                      <input
                        id="school-country-code"
                        class="input"
                        type="text"
                        maxlength="2"
                        placeholder="JP"
                        required
                      />
                    </label>


                    <label class="field">
                      <span>
                        City / Region
                      </span>

                      <input
                        id="school-city"
                        class="input"
                        type="text"
                        placeholder="Aichi"
                      />
                    </label>


                    <label class="field">
                      <span>
                        Time Zone
                      </span>

                      <input
                        id="school-timezone"
                        class="input"
                        type="text"
                        placeholder="Asia/Tokyo"
                      />
                    </label>


                    <label class="field">
                      <span>
                        Languages
                      </span>

                      <input
                        id="school-languages"
                        class="input"
                        type="text"
                        placeholder="Japanese, English"
                      />
                    </label>


                    <label class="field full">
                      <span>
                        School Introduction
                      </span>

                      <textarea
                        id="school-introduction"
                        class="input textarea"
                        placeholder="Tell us briefly about the school..."
                      ></textarea>
                    </label>


                    <label class="field full">
                      <span>
                        Website
                      </span>

                      <input
                        id="school-website"
                        class="input"
                        type="url"
                        placeholder="https://..."
                      />
                    </label>

                  </div>


                  <div class="button-row">

                    <button
                      id="save-school-button"
                      class="primary-button"
                      type="submit"
                    >
                      Save School
                    </button>

                  </div>


                  <p
                    id="school-form-message"
                    class="muted"
                  ></p>

                </form>

              </section>
            `
            : ''
        }


        ${
          schools.length === 0
            ? `
              <div class="empty-state">
                <h3>
                  No schools yet
                </h3>

                <p class="muted">
                  Add the first partner school.
                </p>
              </div>
            `
            : `
              <div class="school-grid">

                ${schools
                  .map((school) => {

                    const flag =
                      getCountryFlag(
                        school.country_code
                      );

                    const languages =
                      Array.isArray(
                        school.languages
                      )
                        ? school.languages.join(' / ')
                        : '';

                    return `
                      <article class="card school-card">

                        <div class="school-card-top">

                          <span class="tag">
                            ${flag}
                            ${escapeHtml(
                              school.country_name
                            )}
                          </span>

                          <span class="school-timezone">
                            🌐
                            ${escapeHtml(
                              school.timezone || ''
                            )}
                          </span>

                        </div>


                        <h3 class="school-name">
                          ${escapeHtml(
                            school.name
                          )}
                        </h3>


                        <p class="muted">
                          📍
                          ${escapeHtml(
                            school.city || ''
                          )}
                        </p>


                        <p class="small-line">
                          <strong>
                            Languages:
                          </strong>

                          ${escapeHtml(
                            languages
                          )}
                        </p>


                        <p class="muted school-introduction">
                          ${escapeHtml(
                            school.introduction ||
                            'No school introduction yet.'
                          )}
                        </p>


                        ${
                          school.website_url
                            ? `
                              <p class="school-website">
                                <a
                                  href="${escapeHtml(
                                    school.website_url
                                  )}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Visit Website →
                                </a>
                              </p>
                            `
                            : ''
                        }

                        <div class="school-card-actions">

                            <button
                                class="secondary-button school-profile-button"
                                type="button"
                                data-school-id="${school.id}"
                            >
                                View Profile
                            </button>

                            </div>

                      </article>
                    `;
                  })
                  .join('')}

              </div>
            `
        }
        <div
  id="school-profile-modal"
  class="school-profile-overlay hidden"
>

  <div class="school-profile-modal">

    <div class="section-head">

      <div>
        <p class="eyebrow">
          School Profile
        </p>

        <h2 id="profile-school-name">
          School
        </h2>
      </div>

      <button
        id="close-school-profile"
        class="secondary-button"
        type="button"
      >
        Close
      </button>

    </div>


    <form id="edit-school-form">

      <input
        id="edit-school-id"
        type="hidden"
      />


      <div class="form-grid">

        <label class="field">
          <span>
            School Name
          </span>

          <input
            id="edit-school-name"
            class="input"
            type="text"
            required
          />
        </label>


        <label class="field">
          <span>
            Country
          </span>

          <input
            id="edit-school-country-name"
            class="input"
            type="text"
            required
          />
        </label>


        <label class="field">
          <span>
            Country Code
          </span>

          <input
            id="edit-school-country-code"
            class="input"
            type="text"
            maxlength="2"
            required
          />
        </label>


        <label class="field">
          <span>
            City / Region
          </span>

          <input
            id="edit-school-city"
            class="input"
            type="text"
          />
        </label>


        <label class="field">
          <span>
            Time Zone
          </span>

          <input
            id="edit-school-timezone"
            class="input"
            type="text"
          />
        </label>


        <label class="field">
          <span>
            Languages
          </span>

          <input
            id="edit-school-languages"
            class="input"
            type="text"
          />
        </label>


        <label class="field full">
          <span>
            Introduction
          </span>

          <textarea
            id="edit-school-introduction"
            class="input textarea"
          ></textarea>
        </label>


        <label class="field full">
          <span>
            Website
          </span>

          <input
            id="edit-school-website"
            class="input"
            type="url"
          />
        </label>

      </div>


      <div class="school-profile-actions">

        <button
          class="primary-button"
          type="submit"
        >
          Save Changes
        </button>

        <button
          id="delete-school-button"
          class="danger-button"
          type="button"
        >
          Delete School
        </button>

      </div>


      <p
        id="edit-school-message"
        class="muted"
      ></p>

    </form>

  </div>

</div>
      </section>
    `;

  } catch (error) {
    console.error(
      'School Library error:',
      error
    );

    return `
      <section class="panel">

        <h2>
          Could not load School Library
        </h2>

        <p class="muted">
          Please check the browser console.
        </p>

      </section>
    `;
  }
}