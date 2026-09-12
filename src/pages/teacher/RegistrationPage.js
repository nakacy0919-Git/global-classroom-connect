import {
  getSchools
} from '../../services/schoolService.js';



function escapeHtml(
  value = ''
) {

  return String(value)
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );

}



export async function RegistrationPage() {

  const schools =
    await getSchools();


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
            Please use first names, nicknames,
            or display names for students.
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
                  School
                </p>

                <h2>
                  Your School
                </h2>

                <p class="muted">
                  Select your school if it is already
                  registered. Otherwise, add it below.
                </p>

              </div>

            </div>


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

                  <input
                    id="registration-country"
                    class="input"
                    type="text"
                    placeholder="e.g. Japan"
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
                    placeholder="e.g. Aichi"
                  />

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