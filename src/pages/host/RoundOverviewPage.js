import {
  getEvents,
} from '../../services/eventService.js';

import {
  getRoundOverview,
} from '../../services/roomService.js';



// =========================================================
// Helpers
// =========================================================

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



function pairKey(
  idA,
  idB
) {

  return [
    idA,
    idB,
  ]
    .sort()
    .join('::');
}



// =========================================================
// Pair Data
// =========================================================

function getRoomPairs(
  room
) {

  const pairs =
    new Set();


  const participants =
    room.participants ||
    [];


  for (
    let i = 0;
    i < participants.length;
    i += 1
  ) {

    for (
      let j = i + 1;
      j < participants.length;
      j += 1
    ) {

      pairs.add(
        pairKey(
          participants[i].id,
          participants[j].id
        )
      );

    }

  }


  return pairs;
}



function getRoundPairs(
  round
) {

  const pairs =
    new Set();


  (
    round.rooms ||
    []
  )
    .forEach(
      (room) => {

        const roomPairs =
          getRoomPairs(
            room
          );


        roomPairs.forEach(
          (pair) => {

            pairs.add(
              pair
            );

          }
        );

      }
    );


  return pairs;
}



// =========================================================
// Repeated Pair Analysis
// =========================================================

function getRepeatedPairInfo(
  room,
  previousPairs
) {

  const participants =
    room.participants ||
    [];


  const repeatedStudentIds =
    new Set();


  const repeatedPairs =
    [];


  for (
    let i = 0;
    i < participants.length;
    i += 1
  ) {

    for (
      let j = i + 1;
      j < participants.length;
      j += 1
    ) {

      const studentA =
        participants[i];


      const studentB =
        participants[j];


      const key =
        pairKey(
          studentA.id,
          studentB.id
        );


      if (
        previousPairs.has(
          key
        )
      ) {

        repeatedStudentIds.add(
          studentA.id
        );


        repeatedStudentIds.add(
          studentB.id
        );


        repeatedPairs.push({

          studentA,

          studentB,

        });

      }

    }

  }


  return {

    repeatedStudentIds,

    repeatedPairs,

  };
}



// =========================================================
// Room Card
// =========================================================

function renderRoomCard(
  room,
  previousPairs
) {

  const facilitator =
    room.facilitator;


  const participants =
    room.participants ||
    [];


  const repeatedInfo =
    getRepeatedPairInfo(
      room,
      previousPairs
    );


  const repeatedCount =
    repeatedInfo
      .repeatedPairs
      .length;


  return `

    <article
      class="
        overview-room-card
        ${
          repeatedCount > 0
            ? 'overview-room-card-warning'
            : ''
        }
      "
    >

      <div
        class="overview-room-head"
      >

        <div>

          <p class="eyebrow">
            ROOM
          </p>

          <h3>
            ${escapeHtml(
              room.room_name ||
              `Room ${room.room_number}`
            )}
          </h3>

        </div>


        <span class="tag">

          ${participants.length}
          students

        </span>

      </div>



      ${
        repeatedCount > 0

          ? `

            <div
              class="repeated-pair-warning"
            >

              <strong>
                ↻ ${repeatedCount}
                repeated pair${
                  repeatedCount > 1
                    ? 's'
                    : ''
                }
              </strong>

              <span>
                These students have met
                in a previous round.
              </span>

            </div>

          `

          : ''
      }



      <div
        class="
          overview-facilitator
          ${
            facilitator
              ? ''
              : 'overview-facilitator-missing'
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
                  facilitator.name
                )}
              </strong>

              <small>
                ${escapeHtml(
                  facilitator.school ||
                  facilitator.country ||
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



      <div
        class="overview-member-list"
      >

        ${participants
          .map(
            (participant) => {

              const isRepeated =
                repeatedInfo
                  .repeatedStudentIds
                  .has(
                    participant.id
                  );


              return `

                <div
                  class="
                    overview-member
                    ${
                      isRepeated
                        ? 'overview-member-repeated'
                        : ''
                    }
                  "
                >

                  <div
                    class="overview-member-avatar"
                  >

                    ${escapeHtml(
                      participant
                        .name
                        ?.charAt(0)
                        .toUpperCase() ||
                      '?'
                    )}

                  </div>


                  <div
                    class="overview-member-info"
                  >

                    <strong>

                      ${escapeHtml(
                        participant.name
                      )}

                      ${
                        isRepeated
                          ? `
                            <span
                              class="repeat-icon"
                              title="Repeated partner"
                            >
                              ↻
                            </span>
                          `
                          : ''
                      }

                    </strong>


                    <span>

                      ${countryFlag(
                        participant.country_code
                      )}

                      ${escapeHtml(
                        participant.school ||
                        participant.country ||
                        ''
                      )}

                    </span>


                    ${
                      participant.grade

                        ? `

                          <small>
                            ${escapeHtml(
                              participant.grade
                            )}
                          </small>

                        `

                        : ''
                    }

                  </div>

                </div>

              `;

            }
          )
          .join('')}

      </div>



      ${
        repeatedCount > 0

          ? `

            <div
              class="repeated-pair-detail"
            >

              ${repeatedInfo
                .repeatedPairs
                .map(
                  (pair) => `

                    <span>

                      ↻
                      ${escapeHtml(
                        pair.studentA.name
                      )}
                      +
                      ${escapeHtml(
                        pair.studentB.name
                      )}

                    </span>

                  `
                )
                .join('')}

            </div>

          `

          : ''
      }

    </article>

  `;
}



// =========================================================
// Round Column
// =========================================================

function renderRoundColumn(
  round,
  previousPairs
) {

  const rooms =
    round.rooms ||
    [];


  const participantCount =
    rooms.reduce(
      (
        total,
        room
      ) =>
        total +
        (
          room.participants
            ?.length ||
          0
        ),
      0
    );


  let repeatedPairCount =
    0;


  rooms.forEach(
    (room) => {

      const info =
        getRepeatedPairInfo(
          room,
          previousPairs
        );


      repeatedPairCount +=
        info.repeatedPairs.length;

    }
  );


  return `

    <section
      class="round-overview-column"
    >

      <div
        class="round-overview-header"
      >

        <div>

          <p class="eyebrow">
            ROUND
          </p>

          <h2>
            ${escapeHtml(
              round.round_name ||
              `Round ${round.round_number}`
            )}
          </h2>

        </div>


        <span
          class="round-number-badge"
        >

          ${round.round_number}

        </span>

      </div>



      <div
        class="round-overview-summary"
      >

        <div>

          <strong>
            ${rooms.length}
          </strong>

          <span>
            Rooms
          </span>

        </div>


        <div>

          <strong>
            ${participantCount}
          </strong>

          <span>
            Students
          </span>

        </div>


        <div
          class="
            ${
              repeatedPairCount > 0
                ? 'summary-warning'
                : ''
            }
          "
        >

          <strong>
            ${repeatedPairCount}
          </strong>

          <span>
            Repeated Pairs
          </span>

        </div>

      </div>



      <div
        class="round-room-list"
      >

        ${rooms
          .map(
            (room) =>
              renderRoomCard(
                room,
                previousPairs
              )
          )
          .join('')}

      </div>

    </section>

  `;
}



// =========================================================
// Overview Renderer
// =========================================================

export function renderRoundOverviewContent(
  rounds
) {

  if (
    !Array.isArray(rounds) ||
    rounds.length === 0
  ) {

    return `

      <div class="empty-state">

        <h3>
          No saved rounds yet
        </h3>

        <p class="muted">
          Generate and save Round 1
          in Room Builder first.
        </p>

      </div>

    `;

  }


  const sortedRounds =
    [...rounds]
      .sort(
        (a, b) =>
          a.round_number -
          b.round_number
      );


  const previousPairs =
    new Set();


  const columns =
    sortedRounds
      .map(
        (round) => {

          const columnHtml =
            renderRoundColumn(
              round,
              previousPairs
            );


          const currentPairs =
            getRoundPairs(
              round
            );


          currentPairs
            .forEach(
              (pair) => {

                previousPairs.add(
                  pair
                );

              }
            );


          return columnHtml;

        }
      )
      .join('');


  return `

    <div
      class="round-overview-legend"
    >

      <span>
        <span
          class="legend-dot legend-dot-normal"
        ></span>

        New combination
      </span>


      <span>
        <span
          class="legend-dot legend-dot-repeat"
        ></span>

        Repeated partner
      </span>

    </div>


    <div
      class="round-comparison-grid"
    >

      ${columns}

    </div>

  `;
}



// =========================================================
// Page
// =========================================================

export async function RoundOverviewPage() {

  try {

    const events =
      await getEvents();


    if (
      events.length === 0
    ) {

      return `

        <section class="panel">

          <p class="eyebrow">
            Round Management
          </p>

          <h2 class="section-title">
            Round Overview
          </h2>


          <div class="empty-state">

            <h3>
              No events available
            </h3>

            <p class="muted">
              Create an event first.
            </p>

          </div>

        </section>

      `;

    }


    const selectedEvent =
      events[0];


    const rounds =
      await getRoundOverview(
        selectedEvent.id
      );


    return `

      <section class="panel">

        <div
          class="section-head"
        >

          <div>

            <p class="eyebrow">
              Smart Shuffle Review
            </p>

            <h2 class="section-title">
              Round Overview
            </h2>

            <p class="muted">
              Compare room assignments
              and check repeated student
              pairings across rounds.
            </p>

          </div>


          <label
            class="round-event-selector"
          >

            <span>
              Event
            </span>

            <select
              id="round-overview-event"
              class="input"
            >

              ${events
                .map(
                  (event) => `

                    <option
                      value="${event.id}"
                      ${
                        event.id ===
                        selectedEvent.id
                          ? 'selected'
                          : ''
                      }
                    >

                      ${escapeHtml(
                        event.title
                      )}

                    </option>

                  `
                )
                .join('')}

            </select>

          </label>

        </div>



        <div
          id="round-overview-status"
          class="room-builder-status"
        >

          Comparing
          ${rounds.length}
          saved round(s).

        </div>



        <div
          id="round-overview-content"
        >

          ${renderRoundOverviewContent(
            rounds
          )}

        </div>

      </section>

    `;


  } catch (error) {

    console.error(
      'Round Overview error:',
      error
    );


    return `

      <section class="panel">

        <h2>
          Could not load Round Overview
        </h2>

        <p class="muted">
          Please check the browser console.
        </p>

      </section>

    `;

  }

}