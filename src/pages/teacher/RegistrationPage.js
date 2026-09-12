import {
  getSchools
} from '../../services/schoolService.js';


function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


export async function RegistrationPage() {

  const schools =
    await getSchools();


  return `
    <section class="registration-public">

      <article class="panel">

        <div class="registration-heading">

          <p class="eyebrow">
            Global Classroom Connect
          </p>

          <h2 class="section-title">
            Participant Registration
          </h2>

          <p class="muted">
            Register your school,
            teacher information
            and participating students.
          </p>

        </div>


        <form id="public-registration-form">

          <div class="form-grid">


            <label class="field full">

              <span>
                Invitation Code *
              </span>

              <input
                id="registration-invite-code"
                class="input"
                type="text"
                placeholder="GC-DEMO-2026"
                required
              />

            </label>


            <label class="field full">

              <span>
                School
              </span>

              <select
                id="registration-school"
                class="input"
              >

                <option value="">
                  My school is not listed
                </option>

                ${schools
                  .map(
                    (school) => `
                      <option
                        value="${school.id}"
                      >
                        ${escapeHtml(
                          school.name
                        )}
                        ·
                        ${escapeHtml(
                          school.country_name
                        )}
                      </option>
                    `
                  )
                  .join('')}

              </select>

            </label>


            <div
              id="new-school-registration"
              class="field full"
            >

              <div class="form-grid">

                <label class="field">

                  <span>
                    New School Name
                  </span>

                  <input
                    id="registration-new-school"
                    class="input"
                    type="text"
                  />

                </label>


                <label class="field">

                  <span>
                    Country
                  </span>

                  <input
                    id="registration-country"
                    class="input"
                    type="text"
                  />

                </label>


                <label class="field full">

                  <span>
                    City / Region
                  </span>

                  <input
                    id="registration-city"
                    class="input"
                    type="text"
                  />

                </label>

              </div>

            </div>


            <label class="field">

              <span>
                Teacher Name *
              </span>

              <input
                id="registration-teacher-name"
                class="input"
                type="text"
                required
              />

            </label>


            <label class="field">

              <span>
                Email *
              </span>

              <input
                id="registration-teacher-email"
                class="input"
                type="email"
                required
              />

            </label>


            <label class="field">

              <span>
                Languages
              </span>

              <input
                id="registration-teacher-languages"
                class="input"
                type="text"
                placeholder="English, Japanese"
              />

            </label>


            <label class="field">

              <span>
                Participation Style
              </span>

              <select
                id="registration-participation-style"
                class="input"
              >

                <option value="individual">
                  Individual Devices
                </option>

                <option value="classroom">
                  One Classroom Device
                </option>

                <option value="mixed">
                  Mixed
                </option>

              </select>

            </label>

          </div>


          <div class="registration-option">

            <label class="teacher-check">

              <input
                id="registration-facilitator"
                type="checkbox"
              />

              <span>
                I can serve as a facilitator
              </span>

            </label>


            <label
              id="registration-facilitator-topics-field"
              class="field hidden"
            >

              <span>
                Facilitator Topics
              </span>

              <input
                id="registration-facilitator-topics"
                class="input"
                type="text"
                placeholder="Culture, Science, Free Talk..."
              />

            </label>

          </div>


          <section class="student-registration-box">

            <div class="section-head">

              <div>

                <p class="eyebrow">
                  Students
                </p>

                <h3>
                  Participant Names
                </h3>

                <p class="muted">
                  First names or display names
                  are recommended.
                </p>

              </div>


              <button
                id="registration-add-student"
                class="secondary-button"
                type="button"
              >
                + Add Student
              </button>

            </div>


            <div
              id="registration-student-list"
              class="registration-student-list"
            ></div>

          </section>


          <label class="field">

            <span>
              Message to Host
            </span>

            <textarea
              id="registration-notes"
              class="input textarea"
              placeholder="Anything the organizer should know?"
            ></textarea>

          </label>


          <button
            id="registration-submit"
            class="primary-button registration-submit"
            type="submit"
          >
            Submit Registration
          </button>


          <p
            id="registration-message"
            class="registration-message"
          ></p>

        </form>

      </article>

    </section>
  `;
}