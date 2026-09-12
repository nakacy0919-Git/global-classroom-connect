import {
  getParticipants,
} from '../../services/participantService.js';

import {
  getTeachers,
} from '../../services/teacherService.js';

import {
  getEvents,
} from '../../services/eventService.js';



// =========================================================
// Helpers
// =========================================================

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



function oneRelation(
  value
) {

  if (
    Array.isArray(value)
  ) {

    return (
      value[0] ||
      null
    );

  }


  return (
    value ||
    null
  );
}



function countryFlag(
  code
) {

  if (
    !code ||
    code.length !== 2
  ) {

    return '🌍';

  }


  return code
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



// =========================================================
// Room Builder Page
// =========================================================

export async function RoomsPage() {

  try {

    const [
      participants,
      teachers,
      events,
    ] =
      await Promise.all([

        getParticipants(),

        getTeachers(),

        getEvents(),

      ]);


    const facilitators =
      teachers.filter(
        (teacher) =>
          teacher.can_facilitate
      );


    const schools =
      new Set(
        participants
          .map(
            (participant) =>
              participant.school_id
          )
          .filter(
            Boolean
          )
      );


    const countries =
      new Set(
        participants
          .map(
            (participant) =>
              oneRelation(
                participant.schools
              )?.country_code
          )
          .filter(
            Boolean
          )
      );


    return `

      <section class="panel">

        <!-- =================================================
             Header
             ================================================= -->

        <div
          class="section-head"
        >

          <div>

            <p class="eyebrow">
              Smart Automatic Assignment
            </p>

            <h2
              class="section-title"
            >
              Room Builder
            </h2>

            <p class="muted">
              Mix schools and countries,
              balance participants and
              assign facilitators automatically.
            </p>

          </div>

        </div>



        <!-- =================================================
             Stats
             ================================================= -->

        <div
          class="room-builder-stats"
        >

          <div
            class="room-builder-stat"
          >

            <strong>
              ${participants.length}
            </strong>

            <span>
              Participants
            </span>

          </div>


          <div
            class="room-builder-stat"
          >

            <strong>
              ${schools.size}
            </strong>

            <span>
              Schools
            </span>

          </div>


          <div
            class="room-builder-stat"
          >

            <strong>
              ${countries.size}
            </strong>

            <span>
              Countries
            </span>

          </div>


          <div
            class="room-builder-stat"
          >

            <strong>
              ${facilitators.length}
            </strong>

            <span>
              Facilitators
            </span>

          </div>

        </div>



        <!-- =================================================
             Room Settings
             ================================================= -->

        <section
          class="room-builder-control"
        >

          <div
            class="room-settings-title"
          >

            <p class="eyebrow">
              Room Settings
            </p>

            <h3>
              Generate Room Plan
            </h3>

          </div>



          <!-- Event -->

          <label
            class="room-size-control"
          >

            <span>
              Event
            </span>

            <select
              id="room-event"
              class="input"
            >

              ${
                events.length === 0

                  ? `

                    <option value="">
                      No events available
                    </option>

                  `

                  : events
                      .map(
                        (event) => `

                          <option
                            value="${event.id}"
                          >
                            ${escapeHtml(
                              event.title
                            )}
                          </option>

                        `
                      )
                      .join('')
              }

            </select>

          </label>



          <!-- Round -->

          <label
            class="room-size-control"
          >

            <span>
              Round
            </span>

            <select
              id="room-round-number"
              class="input"
            >

              <option value="1">
                Round 1
              </option>

              <option value="2">
                Round 2
              </option>

              <option value="3">
                Round 3
              </option>

            </select>

          </label>



          <!-- Students per Room -->

          <label
            class="room-size-control"
          >

            <span>
              Students per room
            </span>

            <select
  id="participants-per-room"
  class="input"
>

  <option value="2">
    2 students
  </option>

  <option value="3">
    3 students
  </option>

  <option
    value="4"
    selected
  >
    4 students
  </option>

  <option value="5">
    5 students
  </option>

  <option value="6">
    6 students
  </option>

</select>

          </label>



          <!-- Generate -->

          <button
            id="generate-rooms-button"
            class="primary-button"
            type="button"
          >
            ✨ Generate Rooms
          </button>



          <!-- Save -->

          <button
            id="save-room-plan-button"
            class="secondary-button"
            type="button"
            disabled
          >
            Save Round
          </button>

        </section>



        <!-- =================================================
             Status
             ================================================= -->

        <div
          id="room-builder-status"
          class="room-builder-status"
        >
          Select the room size,
          then generate a room plan.
        </div>



        <!-- =================================================
             Smart Shuffle Quality
             ================================================= -->

        <div
          id="room-quality-dashboard"
          class="room-quality-dashboard hidden"
        >

          <!-- Header + Try Another Mix -->

          <div
            class="room-quality-title"
          >

            <div>

              <p class="eyebrow">
                SMART SHUFFLE QUALITY
              </p>

              <h3>
                Room Plan Analysis
              </h3>

            </div>


            <button
  id="try-another-mix-button"
  class="try-another-mix-button"
  type="button"
  disabled
>
  <span class="try-mix-icon">
    🔀
  </span>

  <span>
    Try Another Mix
  </span>
</button>
          </div>



          <!-- Quality Cards -->

          <div
            class="room-quality-grid"
          >

            <!-- Diversity -->

            <div
              class="quality-card"
            >

              <strong
                id="quality-diversity-score"
              >
                -
              </strong>

              <span>
                Diversity Score
              </span>

            </div>



            <!-- Repeated Pairs -->

            <div
              class="quality-card"
            >

              <strong
                id="quality-repeated-pairs"
              >
                -
              </strong>

              <span>
                Repeated Pairs
              </span>

            </div>



            <!-- School Conflicts -->

            <div
              class="quality-card"
            >

              <strong
                id="quality-school-conflicts"
              >
                -
              </strong>

              <span>
                School Conflicts
              </span>

            </div>



            <!-- Country Mix -->

            <div
              class="quality-card"
            >

              <strong
                id="quality-country-mix"
              >
                -
              </strong>

              <span>
                Country Mix
              </span>

            </div>



            <!-- Facilitator Coverage -->

            <div
              class="quality-card"
            >

              <strong
                id="quality-facilitator-coverage"
              >
                -
              </strong>

              <span>
                Facilitator Coverage
              </span>

            </div>

          </div>



          <!-- =================================================
               Quality Feedback
               ================================================= -->

          <div
            class="room-quality-feedback-section"
          >

            <p class="eyebrow">
              ROOM PLAN FEEDBACK
            </p>


            <div
              id="room-quality-feedback"
              class="room-quality-feedback"
            ></div>

          </div>

        </div>



        <!-- =================================================
             Generated Rooms
             ================================================= -->

        <div
          id="generated-room-grid"
          class="room-grid"
        ></div>


      </section>

    `;


  } catch (error) {

    console.error(
      'Room Builder load error:',
      error
    );


    return `

      <section class="panel">

        <h2>
          Could not load Room Builder
        </h2>

        <p class="muted">
          Please check the browser console.
        </p>

      </section>

    `;

  }

}



// =========================================================
// Room Plan Renderer
// =========================================================

export function renderRoomPlan(
  plan
) {

  if (
    !plan ||
    !Array.isArray(
      plan.rooms
    ) ||
    plan.rooms.length === 0
  ) {

    return `

      <div
        class="empty-state"
      >

        <h3>
          No participants available
        </h3>

        <p class="muted">
          Approve participants first.
        </p>

      </div>

    `;

  }


  return plan.rooms
    .map(
      (room) => {

        const facilitator =
          room.facilitator;


        const facilitatorSchool =
          oneRelation(
            facilitator
              ?.schools
          );


        return `

          <article
            class="
              room-card
              smart-room-card
            "
          >

            <!-- Room Header -->

            <div
              class="room-head"
            >

              <div>

                <p class="eyebrow">
                  AUTO ASSIGNMENT
                </p>

                <h3>
                  ${escapeHtml(
                    room.name
                  )}
                </h3>

              </div>


              <span
                class="tag"
              >

                ${room.participants.length}
                students

              </span>

            </div>



            <!-- Facilitator -->

            <div
              class="
                facilitator-box
                ${
                  facilitator
                    ? ''
                    : 'facilitator-missing'
                }
              "
            >

              <span>
                Facilitator
              </span>


              ${
                facilitator

                  ? `

                    <strong>
                      🎤
                      ${escapeHtml(
                        facilitator.display_name
                      )}
                    </strong>


                    <small>

                      ${countryFlag(
                        facilitatorSchool
                          ?.country_code
                      )}

                      ${escapeHtml(
                        facilitatorSchool
                          ?.name ||
                        ''
                      )}

                    </small>

                  `

                  : `

                    <strong>
                      ⚠ Not assigned
                    </strong>

                  `
              }

            </div>



            <!-- Participants -->

            <div
              class="smart-member-list"
            >

              ${room.participants
                .map(
                  (participant) => {

                    const school =
                      oneRelation(
                        participant.schools
                      );


                    const displayName =
                      participant
                        .display_name ||
                      'Unknown';


                    return `

                      <div
                        class="smart-member"
                      >

                        <div
                          class="smart-member-avatar"
                        >

                          ${escapeHtml(
                            displayName
                              .charAt(0)
                              .toUpperCase()
                          )}

                        </div>


                        <div>

                          <strong>
                            ${escapeHtml(
                              displayName
                            )}
                          </strong>


                          <span>

                            ${countryFlag(
                              school
                                ?.country_code
                            )}

                            ${escapeHtml(
                              school?.name ||
                              'Unknown school'
                            )}

                          </span>

                        </div>

                      </div>

                    `;

                  }
                )
                .join('')}

            </div>

          </article>

        `;

      }
    )
    .join('');

}