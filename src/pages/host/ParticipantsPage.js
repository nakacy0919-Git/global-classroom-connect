import {
  getParticipants,
} from '../../services/participantService.js';

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

  if (
    !countryCode ||
    countryCode.length !== 2
  ) {
    return '🌍';
  }


  return countryCode
    .toUpperCase()
    .replace(
      /./g,
      (char) =>
        String.fromCodePoint(
          127397 +
          char.charCodeAt()
        )
    );

}


export async function ParticipantsPage() {

  const profile =
    await getCurrentProfile();


  if (profile?.role !== 'host') {

    return `
      <section class="panel">

        <p class="eyebrow">
          Participant Management
        </p>

        <h2 class="section-title">
          Host access only
        </h2>

      </section>
    `;

  }


  try {

    const participants =
      await getParticipants();


    const schoolIds =
      new Set(
        participants
          .map(
            (participant) =>
              participant.school_id
          )
          .filter(Boolean)
      );


    const countries =
      new Set(
        participants
          .map(
            (participant) =>
              participant.schools
                ?.country_code
          )
          .filter(Boolean)
      );


    const schoolOptions =
      Array.from(
        new Map(
          participants
            .filter(
              (participant) =>
                participant.schools
            )
            .map(
              (participant) => [
                participant.schools.id,
                participant.schools,
              ]
            )
        ).values()
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );


    return `
      <section class="panel">

        <div class="section-head">

          <div>

            <p class="eyebrow">
              Global Participant Network
            </p>

            <h2 class="section-title">
              Participant Pool
            </h2>

            <p class="muted">
              Approved students available
              for future room assignments.
            </p>

          </div>

        </div>


        <div class="participant-stats">

          <div class="participant-stat">

            <strong>
              ${participants.length}
            </strong>

            <span>
              Participants
            </span>

          </div>


          <div class="participant-stat">

            <strong>
              ${schoolIds.size}
            </strong>

            <span>
              Schools
            </span>

          </div>


          <div class="participant-stat">

            <strong>
              ${countries.size}
            </strong>

            <span>
              Countries
            </span>

          </div>

        </div>


        <div class="participant-toolbar">

          <input
            id="participant-search"
            class="input"
            type="search"
            placeholder="Search participant, school, teacher..."
          />


          <select
            id="participant-school-filter"
            class="input"
          >

            <option value="">
              All Schools
            </option>

            ${schoolOptions
              .map(
                (school) => `
                  <option
                    value="${school.id}"
                  >
                    ${escapeHtml(
                      school.name
                    )}
                  </option>
                `
              )
              .join('')}

          </select>

        </div>


        ${
          participants.length === 0

            ? `
              <div class="empty-state">

                <h3>
                  No participants yet
                </h3>

                <p class="muted">
                  Approved student registrations
                  will appear here.
                </p>

              </div>
            `

            : `
              <div
                id="participant-table"
                class="participant-table"
              >

                <div
                  class="participant-table-head"
                >

                  <span>
                    Participant
                  </span>

                  <span>
                    Grade
                  </span>

                  <span>
                    School
                  </span>

                  <span>
                    Country
                  </span>

                  <span>
                    Teacher
                  </span>

                </div>


                ${participants
                  .map(
                    (participant) => {

                      const school =
                        participant.schools;

                      const teacher =
                        participant.teachers;

                      const flag =
                        getCountryFlag(
                          school?.country_code
                        );


                      const searchText =
                        [
                          participant.display_name,
                          participant.grade,
                          school?.name,
                          school?.country_name,
                          teacher?.display_name,
                        ]
                          .filter(Boolean)
                          .join(' ')
                          .toLowerCase();


                      return `
                        <div
                          class="participant-row"
                          data-participant-search="${escapeHtml(
                            searchText
                          )}"
                          data-school-id="${school?.id || ''}"
                        >

                          <div
                            class="participant-name-cell"
                          >

                            <div
                              class="participant-avatar"
                            >
                              ${escapeHtml(
                                participant
                                  .display_name
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </div>

                            <strong>
                              ${escapeHtml(
                                participant.display_name
                              )}
                            </strong>

                          </div>


                          <span>
                            ${escapeHtml(
                              participant.grade ||
                              '-'
                            )}
                          </span>


                          <span>
                            ${escapeHtml(
                              school?.name ||
                              '-'
                            )}
                          </span>


                          <span>
                            ${flag}
                            ${escapeHtml(
                              school?.country_name ||
                              '-'
                            )}
                          </span>


                          <span>
                            ${escapeHtml(
                              teacher?.display_name ||
                              '-'
                            )}
                          </span>

                        </div>
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
      'Participant Pool error:',
      error
    );


    return `
      <section class="panel">

        <h2>
          Could not load Participant Pool
        </h2>

        <p class="muted">
          Please check Supabase
          and the browser console.
        </p>

      </section>
    `;

  }

}