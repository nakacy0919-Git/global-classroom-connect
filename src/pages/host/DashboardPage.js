import {
  dashboardStats,
  upcomingEvent,
  timeline,
} from '../../data/mockData.js';

import {
  StatCard,
} from '../../components/StatCard.js';

import {
  getRegistrationRequests,
} from '../../services/registrationService.js';


function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


export async function DashboardPage() {

  let requests = [];


  try {

    requests =
      await getRegistrationRequests();

  } catch (error) {

    console.error(
      'Could not load registrations:',
      error
    );

  }


  const pendingRequests =
    requests.filter(
      (request) =>
        request.status === 'pending'
    );


  return `

    <section class="hero-card">

      <div class="hero-copy">

        <p class="eyebrow">
          Platform Overview
        </p>

        <h2>
          Run international exchange
          with clarity and style.
        </h2>

        <p>
          Manage events, schools,
          facilitators, breakout rooms
          and participant views
          from one platform.
        </p>

      </div>


      <div class="hero-badge">

        <span>
          Ocean Blue Theme
        </span>

      </div>

    </section>


    <section class="stats-grid">

      ${dashboardStats
        .map(
          (item) =>
            StatCard(
              item.label,
              item.value
            )
        )
        .join('')}

      ${StatCard(
        'Pending Registrations',
        pendingRequests.length
      )}

    </section>


    <section class="panel pending-panel">

      <div class="section-head">

        <div>

          <p class="eyebrow">
            Registration Center
          </p>

          <h2 class="section-title">
            Pending Registrations
          </h2>

          <p class="muted">
            Review teacher and student
            registrations before adding
            them to GCC.
          </p>

        </div>


        <span class="pending-count">

          ${pendingRequests.length}
          Pending

        </span>

      </div>


      ${
        pendingRequests.length === 0

          ? `
            <div class="empty-state">

              <h3>
                All caught up
              </h3>

              <p class="muted">
                There are no registrations
                waiting for review.
              </p>

            </div>
          `

          : `
            <div class="registration-request-list">

              ${pendingRequests
                .map(
                  (request) => {

                    const schoolName =
                      request.schools?.name ||
                      request.new_school_name ||
                      'New School';

                    const country =
                      request.schools?.country_name ||
                      request.new_school_country ||
                      '';

                    const students =
                      Array.isArray(
                        request.students
                      )
                        ? request.students
                        : [];

                    return `

                      <article
                        class="registration-request-card"
                      >

                        <div
                          class="registration-request-main"
                        >

                          <div
                            class="request-school"
                          >

                            <span
                              class="request-status"
                            >
                              PENDING
                            </span>

                            <h3>
                              ${escapeHtml(
                                schoolName
                              )}
                            </h3>

                            <p class="muted">
                              ${escapeHtml(
                                country
                              )}
                            </p>

                          </div>


                          <div
                            class="request-info-grid"
                          >

                            <div>

                              <span>
                                Teacher
                              </span>

                              <strong>
                                ${escapeHtml(
                                  request.teacher_name
                                )}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Students
                              </span>

                              <strong>
                                ${students.length}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Style
                              </span>

                              <strong>
                                ${escapeHtml(
                                  request.participation_style ||
                                  '-'
                                )}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Facilitator
                              </span>

                              <strong>
                                ${
                                  request.can_facilitate
                                    ? '✓ Available'
                                    : 'No'
                                }
                              </strong>

                            </div>

                          </div>


                          ${
                            students.length > 0
                              ? `
                                <div
                                  class="request-students"
                                >

                                  ${students
                                    .map(
                                      (student) => `
                                        <span>
                                          ${escapeHtml(
                                            student.name
                                          )}

                                          ${
                                            student.grade
                                              ? ` · ${escapeHtml(
                                                  student.grade
                                                )}`
                                              : ''
                                          }
                                        </span>
                                      `
                                    )
                                    .join('')}

                                </div>
                              `
                              : ''
                          }


                          ${
                            request.notes
                              ? `
                                <p
                                  class="request-note"
                                >
                                  “${escapeHtml(
                                    request.notes
                                  )}”
                                </p>
                              `
                              : ''
                          }

                        </div>


                        <div
                          class="request-actions"
                        >

                          <button
                            class="secondary-button
                                   reject-registration-button"
                            type="button"
                            data-request-id="${request.id}"
                          >
                            Reject
                          </button>


                          <button
                            class="primary-button
                                   approve-registration-button"
                            type="button"
                            data-request-id="${request.id}"
                          >
                            Approve
                          </button>

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


    <section class="page-grid">

      <article class="panel">

        <p class="eyebrow">
          Upcoming Event
        </p>

        <h3>
          ${upcomingEvent.title}
        </h3>

        <p class="muted">
          ${upcomingEvent.subtitle}
        </p>


        <ul class="info-list">

          <li>
            <span>Date</span>
            <strong>
              ${upcomingEvent.date}
            </strong>
          </li>

          <li>
            <span>Time</span>
            <strong>
              ${upcomingEvent.timeJst}
            </strong>
          </li>

          <li>
            <span>Format</span>
            <strong>
              ${upcomingEvent.format}
            </strong>
          </li>

        </ul>

      </article>


      <article class="panel">

        <p class="eyebrow">
          Timeline
        </p>

        <h3>
          Session Flow
        </h3>

        <ul class="timeline-list">

          ${timeline
            .map(
              (item) => `
                <li>
                  <strong>
                    ${item.time}
                  </strong>

                  <span>
                    ${item.activity}
                  </span>
                </li>
              `
            )
            .join('')}

        </ul>

      </article>

    </section>

  `;
}