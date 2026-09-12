import {
  getTeachers,
  getTeacherPhotoUrl,
} from '../../services/teacherService.js';

import {
  getSchools,
} from '../../services/schoolService.js';

import {
  getCurrentProfile,
} from '../../services/authService.js';


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


function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join('');
}


export async function TeachersPage() {

  const profile =
    await getCurrentProfile();


  if (profile?.role !== 'host') {
    return `
      <section class="panel">

        <p class="eyebrow">
          Teacher Network
        </p>

        <h2 class="section-title">
          Host access only
        </h2>

        <p class="muted">
          Teacher Database can only be managed
          by the Global Classroom Connect host.
        </p>

      </section>
    `;
  }


  try {

    const [
      teachers,
      schools,
    ] = await Promise.all([
      getTeachers(),
      getSchools(),
    ]);


    const teachersWithPhotos =
      await Promise.all(

        teachers.map(
          async (teacher) => {

            const photoUrl =
              teacher.photo_path
                ? await getTeacherPhotoUrl(
                    teacher.photo_path
                  )
                : null;

            return {
              ...teacher,
              photoUrl,
            };

          }
        )

      );


    const facilitatorCount =
      teachers.filter(
        (teacher) =>
          teacher.can_facilitate
      ).length;


    const schoolIds =
      new Set(
        teachers
          .map(
            (teacher) =>
              teacher.school_id
          )
          .filter(Boolean)
      );


    const countries =
      new Set(
        teachers
          .map(
            (teacher) =>
              teacher.schools
                ?.country_code
          )
          .filter(Boolean)
      );


    return `
      <section class="panel">

        <div class="section-head">

          <div>

            <p class="eyebrow">
              Global Teacher Network
            </p>

            <h2 class="section-title">
              Teacher Database
            </h2>

            <p class="muted">
              Teachers, coordinators and facilitators
              connected through Global Classroom.
            </p>

          </div>


          <button
            id="add-teacher-button"
            class="primary-button"
            type="button"
          >
            + Add Teacher
          </button>

        </div>


        <div class="teacher-stats">

          <div class="teacher-stat">
            <strong>
              ${teachers.length}
            </strong>
            <span>
              Teachers
            </span>
          </div>

          <div class="teacher-stat">
            <strong>
              ${schoolIds.size}
            </strong>
            <span>
              Schools
            </span>
          </div>

          <div class="teacher-stat">
            <strong>
              ${facilitatorCount}
            </strong>
            <span>
              Facilitators
            </span>
          </div>

          <div class="teacher-stat">
            <strong>
              ${countries.size}
            </strong>
            <span>
              Countries
            </span>
          </div>

        </div>


        <div class="teacher-toolbar">

          <input
            id="teacher-search"
            class="input teacher-search"
            type="search"
            placeholder="Search teacher, school, country..."
          />

        </div>


        <section
          id="add-teacher-panel"
          class="add-teacher-panel hidden"
        >

          <div class="section-head">

            <div>

              <p class="eyebrow">
                New Teacher
              </p>

              <h3>
                Add Teacher Profile
              </h3>

            </div>


            <button
              id="cancel-teacher-button"
              class="secondary-button"
              type="button"
            >
              Cancel
            </button>

          </div>


          <form
            id="add-teacher-form"
          >

            <div class="teacher-form-layout">


              <div class="teacher-photo-editor">

                <div
                  id="teacher-photo-preview"
                  class="teacher-photo-preview"
                >
                  <span>
                    Photo
                  </span>
                </div>


                <label
                  class="secondary-button teacher-upload-button"
                >
                  Upload Photo

                  <input
                    id="teacher-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                  />

                </label>


                <p class="upload-note">
                  JPG / PNG / WebP · Max 5MB
                </p>

              </div>


              <div class="teacher-form-fields">

                <div class="form-grid">


                  <label class="field">

                    <span>
                      Teacher Name *
                    </span>

                    <input
                      id="teacher-name"
                      class="input"
                      type="text"
                      required
                    />

                  </label>


                  <label class="field">

                    <span>
                      School *
                    </span>

                    <select
                      id="teacher-school"
                      class="input"
                      required
                    >

                      <option value="">
                        Select School
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


                  <label class="field">

                    <span>
                      Email
                    </span>

                    <input
                      id="teacher-email"
                      class="input"
                      type="email"
                    />

                  </label>


                  <label class="field">

                    <span>
                      Job Title
                    </span>

                    <input
                      id="teacher-job-title"
                      class="input"
                      type="text"
                      placeholder="English Teacher"
                    />

                  </label>


                  <label class="field full">

                    <span>
                      Languages
                    </span>

                    <input
                      id="teacher-languages"
                      class="input"
                      type="text"
                      placeholder="English, Japanese"
                    />

                  </label>


                  <label
                    class="teacher-check"
                  >

                    <input
                      id="teacher-main-coordinator"
                      type="checkbox"
                    />

                    <span>
                      Main Coordinator
                    </span>

                  </label>


                  <label
                    class="teacher-check"
                  >

                    <input
                      id="teacher-can-facilitate"
                      type="checkbox"
                    />

                    <span>
                      Can serve as Facilitator
                    </span>

                  </label>


                  <label
                    id="facilitator-topics-field"
                    class="field full hidden"
                  >

                    <span>
                      Facilitator Topics
                    </span>

                    <input
                      id="teacher-facilitator-topics"
                      class="input"
                      type="text"
                      placeholder="Culture, SDGs, Science, Free Talk"
                    />

                  </label>


                  <label class="field full">

                    <span>
                      Short Bio
                    </span>

                    <textarea
                      id="teacher-bio"
                      class="input textarea"
                      placeholder="Brief introduction..."
                    ></textarea>

                  </label>

                </div>


                <div class="button-row">

                  <button
                    id="save-teacher-button"
                    class="primary-button"
                    type="submit"
                  >
                    Save Teacher
                  </button>

                </div>


                <p
                  id="teacher-form-message"
                  class="muted"
                ></p>

              </div>

            </div>

          </form>

        </section>


        ${
          teachersWithPhotos.length === 0
            ? `
              <div class="empty-state">

                <h3>
                  No teachers yet
                </h3>

                <p class="muted">
                  Add the first teacher
                  to Global Classroom Connect.
                </p>

              </div>
            `
            : `
              <div
                id="teacher-grid"
                class="teacher-grid"
              >

                ${teachersWithPhotos
                  .map(
                    (teacher) => {

                      const school =
                        teacher.schools;

                      const flag =
                        getCountryFlag(
                          school?.country_code
                        );

                      const languages =
                        Array.isArray(
                          teacher.languages
                        )
                          ? teacher.languages
                              .join(' / ')
                          : '';

                      const searchText = [
                        teacher.display_name,
                        school?.name,
                        school?.country_name,
                        languages,
                      ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();


                      return `
                        <article
                          class="teacher-card"
                          data-teacher-search="${escapeHtml(
                            searchText
                          )}"
                        >

                          <div class="teacher-photo-area">

                            ${
                              teacher.photoUrl
                                ? `
                                  <img
                                    src="${teacher.photoUrl}"
                                    alt="${escapeHtml(
                                      teacher.display_name
                                    )}"
                                    class="teacher-photo"
                                  />
                                `
                                : `
                                  <div
                                    class="teacher-photo teacher-photo-fallback"
                                  >
                                    ${escapeHtml(
                                      getInitials(
                                        teacher.display_name
                                      )
                                    )}
                                  </div>
                                `
                            }

                          </div>


                          <div class="teacher-card-body">

                            <div class="teacher-card-tags">

                              <span class="tag">
                                ${flag}
                                ${escapeHtml(
                                  school?.country_name ||
                                  ''
                                )}
                              </span>

                              ${
                                teacher.is_main_coordinator
                                  ? `
                                    <span
                                      class="teacher-role-badge"
                                    >
                                      Coordinator
                                    </span>
                                  `
                                  : ''
                              }

                            </div>


                            <h3>
                              ${escapeHtml(
                                teacher.display_name
                              )}
                            </h3>


                            <p class="teacher-school-name">
                              ${escapeHtml(
                                school?.name ||
                                'No school'
                              )}
                            </p>


                            ${
                              teacher.job_title
                                ? `
                                  <p class="muted">
                                    ${escapeHtml(
                                      teacher.job_title
                                    )}
                                  </p>
                                `
                                : ''
                            }


                            ${
                              languages
                                ? `
                                  <p class="teacher-languages">
                                    🌐
                                    ${escapeHtml(
                                      languages
                                    )}
                                  </p>
                                `
                                : ''
                            }


                            ${
                              teacher.can_facilitate
                                ? `
                                  <div
                                    class="facilitator-badge"
                                  >
                                    🎤 Facilitator
                                  </div>
                                `
                                : ''
                            }


                            ${
                              teacher.bio
                                ? `
                                  <p
                                    class="muted teacher-bio"
                                  >
                                    ${escapeHtml(
                                      teacher.bio
                                    )}
                                  </p>
                                `
                                : ''
                            }

                          </div>

                        </article>
                      `;

                    }
                  )
                  .join('')}

              </div>
            `
        }

      </section>
    `;

  } catch (error) {

    console.error(
      'Teacher Database error:',
      error
    );


    return `
      <section class="panel">

        <h2>
          Could not load Teacher Database
        </h2>

        <p class="muted">
          Please check Supabase
          and the browser console.
        </p>

      </section>
    `;

  }

}