import {
  getSchools
} from '../../services/schoolService.js';

import {
  countries
} from '../../data/countries.js';



function escapeHtml(
  value = ''
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}



function getTimezones() {

  try {

    return Intl
      .supportedValuesOf('timeZone');

  } catch {

    return [
      'Asia/Tokyo',
      'Asia/Manila',
      'Asia/Kuala_Lumpur',
      'Asia/Singapore',
      'Asia/Jakarta',
      'Asia/Bangkok',
      'Asia/Colombo',
      'Asia/Kolkata',
      'Australia/Perth',
      'Australia/Sydney',
      'Europe/London',
      'Europe/Paris',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Sao_Paulo',
    ];

  }

}



export async function RegistrationPage() {

  const schools =
    await getSchools();


  const timezones =
    getTimezones();


  return `

    <section class="registration-public">


      <!-- ===================================================
           Welcome
           =================================================== -->

      <article class="panel registration-welcome">

        <div class="registration-heading">

          <p class="eyebrow">
            GLOBAL CLASSROOM CONNECT
          </p>

          <h1 class="section-title">
            Join Global Classroom
          </h1>

          <p class="muted">
            Welcome! This registration form is for teachers
            who would like to participate in international
            online exchanges with their students.
          </p>

        </div>


        <div class="registration-steps">

          <div class="registration-step">
            <strong>1</strong>
            <span>
              Register your school
            </span>
          </div>

          <div class="registration-step">
            <strong>2</strong>
            <span>
              Add teacher & students
            </span>
          </div>

          <div class="registration-step">
            <strong>3</strong>
            <span>
              Host reviews your registration
            </span>
          </div>

        </div>


        <div class="registration-info-box">

          <strong>
            🌍 Before you begin
          </strong>

          <p>
            Please provide accurate school information
            so that teachers from other countries can
            confidently connect with your school.
          </p>

          <p>
            For students, please use first names,
            nicknames, or display names only.
            Full legal names are not necessary.
          </p>

        </div>

      </article>



      <!-- ===================================================
           Registration Form
           =================================================== -->

      <article class="panel registration-form-panel">

        <form id="public-registration-form">


          <!-- =================================================
               Invitation
               ================================================= -->

          <section class="registration-section">

            <div class="registration-section-heading">

              <span class="registration-section-number">
                01
              </span>

              <div>

                <p class="eyebrow">
                  Invitation
                </p>

                <h2>
                  Invitation Code
                </h2>

                <p class="muted">
                  Enter the code provided by
                  the Global Classroom organizer.
                </p>

              </div>

            </div>


            <label class="field full">

              <span>
                Invitation Code *
              </span>

              <input
                id="registration-invite-code"
                class="input"
                type="text"
                placeholder="Enter invitation code"
                autocomplete="off"
                required
              />

            </label>

          </section>



          <!-- =================================================
               School
               ================================================= -->

          <section class="registration-section">

            <div class="registration-section-heading">

              <span class="registration-section-number">
                02
              </span>

              <div>

                <p class="eyebrow">
                  School Profile
                </p>

                <h2>
                  Your School
                </h2>

                <p class="muted">
                  This information helps teachers from
                  other countries understand and trust
                  your school before arranging an exchange.
                </p>

              </div>

            </div>


            <label class="field full">

              <span>
                Is your school already registered?
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

              <div class="registration-profile-group">

                <div class="registration-profile-group-head">

                  <strong>
                    🏫 Basic School Information
                  </strong>

                  <span class="muted">
                    Tell us who and where you are.
                  </span>

                </div>


                <div class="form-grid">

                  <label class="field">

                    <span>
                      School Name *
                    </span>

                    <input
                      id="registration-new-school"
                      class="input"
                      type="text"
                      placeholder="e.g. Sakura High School"
                    />

                  </label>


                  <label class="field">

                    <span>
                      Country *
                    </span>

                    <select
                      id="registration-country"
                      class="input"
                    >

                      <option
                        value=""
                        data-code=""
                      >
                        Select your country
                      </option>

                      ${countries
                        .map(
                          (country) => `

                            <option
                              value="${escapeHtml(
                                country.name
                              )}"
                              data-code="${escapeHtml(
                                country.code
                              )}"
                            >
                              ${escapeHtml(
                                country.name
                              )}
                            </option>

                          `
                        )
                        .join('')}

                    </select>

                  </label>


                  <label class="field">

                    <span>
                      City / Region
                    </span>

                    <input
                      id="registration-city"
                      class="input"
                      type="text"
                      placeholder="e.g. Aichi"
                    />

                  </label>


                  <label class="field">

                    <span>
                      Address
                    </span>

                    <input
                      id="registration-address"
                      class="input"
                      type="text"
                      placeholder="School address"
                      autocomplete="street-address"
                    />

                  </label>

                </div>

              </div>



              <div class="registration-profile-group">

                <div class="registration-profile-group-head">

                  <strong>
                    🎓 School Profile
                  </strong>

                  <span class="muted">
                    Help partner schools understand
                    your educational setting.
                  </span>

                </div>


                <div class="form-grid">

                  <label class="field">

                    <span>
                      School Type
                    </span>

                    <select
                      id="registration-school-type"
                      class="input"
                    >

                      <option value="">
                        Select school type
                      </option>

                      <option value="Public">
                        Public
                      </option>

                      <option value="Private">
                        Private
                      </option>

                      <option value="International">
                        International School
                      </option>

                      <option value="Other">
                        Other
                      </option>

                    </select>

                  </label>


                  <label class="field">

                    <span>
                      School Level
                    </span>

                    <select
                      id="registration-school-level"
                      class="input"
                    >

                      <option value="">
                        Select school level
                      </option>

                      <option value="Primary">
                        Primary / Elementary
                      </option>

                      <option value="Lower Secondary">
                        Lower Secondary / Junior High
                      </option>

                      <option value="Upper Secondary">
                        Upper Secondary / High School
                      </option>

                      <option value="K-12">
                        K–12 / Combined School
                      </option>

                      <option value="College / University">
                        College / University
                      </option>

                      <option value="Other">
                        Other
                      </option>

                    </select>

                  </label>


                  <label class="field">

                    <span>
                      Approx. Number of Students
                    </span>

                    <input
                      id="registration-student-count"
                      class="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 850"
                    />

                  </label>


                  <label class="field">

                    <span>
                      Grades / Years Offered
                    </span>

                    <input
                      id="registration-school-grades"
                      class="input"
                      type="text"
                      placeholder="e.g. Grade 10, Grade 11, Grade 12"
                    />

                    <small class="muted">
                      You may also write Year 7–13,
                      Primary 1–6, etc.
                    </small>

                  </label>

                </div>

              </div>



              <div class="registration-profile-group">

                <div class="registration-profile-group-head">

                  <strong>
                    🌐 School Verification
                  </strong>

                  <span class="muted">
                    A public web presence helps partner
                    teachers feel confident about your school.
                  </span>

                </div>


                <div class="form-grid">

                  <label class="field">

                    <span>
                      Official School Website
                    </span>

                    <input
                      id="registration-website"
                      class="input"
                      type="url"
                      placeholder="https://www.example-school.edu"
                      autocomplete="url"
                    />

                  </label>


                  <label class="field">

                    <span>
                      Alternative Verification URL
                    </span>

                    <input
                      id="registration-verification-url"
                      class="input"
                      type="url"
                      placeholder="Official social media, school board, government page..."
                    />

                    <small class="muted">
                      Use this only if your school
                      does not have an official website.
                    </small>

                  </label>

                </div>


                <div class="registration-verification-note">

                  <strong>
                    ✓ Why do we ask for this?
                  </strong>

                  <span>
                    Global Classroom connects real schools
                    around the world. A school website or
                    another official public page helps
                    other teachers confirm your school's identity.
                  </span>

                </div>

              </div>



              <div class="registration-profile-group">

                <div class="registration-profile-group-head">

                  <strong>
                    🕒 Time Zone
                  </strong>

                  <span class="muted">
                    This will later help Global Classroom
                    find suitable international exchange times.
                  </span>

                </div>


                <label class="field full">

                  <span>
                    School Time Zone
                  </span>

                  <select
                    id="registration-timezone"
                    class="input"
                  >

                    <option value="">
                      Select your time zone
                    </option>

                    ${timezones
                      .map(
                        (timezone) => `

                          <option
                            value="${escapeHtml(
                              timezone
                            )}"
                          >
                            ${escapeHtml(
                              timezone
                            )}
                          </option>

                        `
                      )
                      .join('')}

                  </select>

                </label>

              </div>

            </div>

          </section>



          <!-- =================================================
               Teacher
               ================================================= -->

          <section class="registration-section">

            <div class="registration-section-heading">

              <span class="registration-section-number">
                03
              </span>

              <div>

                <p class="eyebrow">
                  Teacher
                </p>

                <h2>
                  Teacher Information
                </h2>

                <p class="muted">
                  Please provide the information
                  of the teacher coordinating the exchange.
                </p>

              </div>

            </div>


            <div class="form-grid">

              <label class="field">

                <span>
                  Teacher Name *
                </span>

                <input
                  id="registration-teacher-name"
                  class="input"
                  type="text"
                  placeholder="Your name"
                  autocomplete="name"
                  required
                />

              </label>


              <label class="field">

                <span>
                  Job Title / Position
                </span>

                <input
                  id="registration-teacher-job-title"
                  class="input"
                  type="text"
                  placeholder="e.g. English Teacher, International Coordinator"
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
                  placeholder="teacher@example.com"
                  autocomplete="email"
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

                <small class="muted">
                  Separate multiple languages with commas.
                </small>

              </label>


              <label class="field">

                <span>
                  How will your students participate?
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

                  <strong>
                    I can serve as a facilitator
                  </strong>

                  <small>
                    I can help lead a breakout room
                    or support student discussion.
                  </small>

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

          </section>



          <!-- =================================================
               Students
               ================================================= -->

          <section class="registration-section">

            <div class="registration-section-heading">

              <span class="registration-section-number">
                04
              </span>

              <div>

                <p class="eyebrow">
                  Students
                </p>

                <h2>
                  Participating Students
                </h2>

                <p class="muted">
                  Add the students who may participate
                  in Global Classroom sessions.
                </p>

              </div>

            </div>


            <div class="registration-privacy-note">

              <strong>
                🔒 Student privacy
              </strong>

              <span>
                Please enter first names,
                nicknames, or display names only.
                Do not enter sensitive personal information.
              </span>

            </div>


            <div
              id="registration-student-list"
              class="registration-student-list"
            ></div>


            <button
              id="registration-add-student"
              class="secondary-button"
              type="button"
            >
              + Add Another Student
            </button>

          </section>



          <!-- =================================================
               Message
               ================================================= -->

          <section class="registration-section">

            <div class="registration-section-heading">

              <span class="registration-section-number">
                05
              </span>

              <div>

                <p class="eyebrow">
                  Final Step
                </p>

                <h2>
                  Message to the Host
                </h2>

                <p class="muted">
                  You can tell us about your students,
                  preferred activities, time availability,
                  or anything else that may help us
                  plan an exchange.
                </p>

              </div>

            </div>


            <label class="field full">

              <span>
                Message
              </span>

              <textarea
                id="registration-notes"
                class="input textarea"
                placeholder="Optional message..."
              ></textarea>

            </label>

          </section>



          <!-- =================================================
               Submit
               ================================================= -->

          <div class="registration-submit-area">

            <p class="muted">
              Your registration will be reviewed
              by the Global Classroom host before
              being added to the network.
            </p>


            <button
              id="registration-submit"
              class="primary-button registration-submit"
              type="submit"
            >
              🌍 Submit Registration
            </button>


            <p
              id="registration-message"
              class="registration-message"
              aria-live="polite"
            ></p>

          </div>


        </form>

      </article>


    </section>

  `;

}