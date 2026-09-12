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


function formatEventDate(
  value
) {

  if (!value) {
    return 'Date not set';
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return 'Date not set';

  }


  return new Intl.DateTimeFormat(
    'en',
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',

      timeZoneName:
        'short',
    }
  ).format(
    date
  );
}


function formatStatus(
  status
) {

  switch (status) {

    case 'published':

      return {
        label:
          'Published',
        className:
          'event-status-published',
      };


    case 'live':

      return {
        label:
          'Live',
        className:
          'event-status-live',
      };


    case 'completed':

      return {
        label:
          'Completed',
        className:
          'event-status-completed',
      };


    default:

      return {
        label:
          'Draft',
        className:
          'event-status-draft',
      };

  }
}


// =========================================================
// Events Page
// =========================================================

export async function EventsPage() {

  try {

    const events =
      await getEvents();


    const draftCount =
      events.filter(
        (event) =>
          event.status ===
          'draft'
      ).length;


    const publishedCount =
      events.filter(
        (event) =>
          event.status ===
          'published'
      ).length;


    const liveCount =
      events.filter(
        (event) =>
          event.status ===
          'live'
      ).length;


    return `

      <section class="panel">

        <!-- ===============================================
             Header
             =============================================== -->

        <div
          class="section-head"
        >

          <div>

            <p class="eyebrow">
              EVENT MANAGEMENT
            </p>

            <h2
              class="section-title"
            >
              Events
            </h2>

            <p class="muted">
              Create and manage
              Global Classroom sessions.
            </p>

          </div>


          <button
            id="add-event-button"
            class="primary-button"
            type="button"
          >
            + Create Event
          </button>

        </div>



        <!-- ===============================================
             Stats
             =============================================== -->

        <div
          class="event-management-stats"
        >

          <div
            class="event-management-stat"
          >

            <strong>
              ${events.length}
            </strong>

            <span>
              Total Events
            </span>

          </div>


          <div
            class="event-management-stat"
          >

            <strong>
              ${draftCount}
            </strong>

            <span>
              Draft
            </span>

          </div>


          <div
            class="event-management-stat"
          >

            <strong>
              ${publishedCount}
            </strong>

            <span>
              Published
            </span>

          </div>


          <div
            class="event-management-stat"
          >

            <strong>
              ${liveCount}
            </strong>

            <span>
              Live
            </span>

          </div>

        </div>



        <!-- ===============================================
             Create Event
             =============================================== -->

        <div
          id="add-event-panel"
          class="
            event-editor-panel
            hidden
          "
        >

          <div
            class="event-editor-head"
          >

            <div>

              <p class="eyebrow">
                NEW EVENT
              </p>

              <h3>
                Create Event
              </h3>

            </div>


            <button
              id="cancel-event-button"
              class="secondary-button"
              type="button"
            >
              Cancel
            </button>

          </div>


          <form
            id="add-event-form"
            class="event-form"
          >

            <!-- Title -->

            <label
              class="form-field"
            >

              <span>
                Event Title
              </span>

              <input
                id="event-title"
                class="input"
                type="text"
                placeholder="e.g. Online Mate Vol. 150"
                required
              />

            </label>



            <!-- Date -->

            <label
              class="form-field"
            >

              <span>
                Start Date & Time
              </span>

              <input
                id="event-starts-at"
                class="input"
                type="datetime-local"
              />

            </label>



            <!-- Timezone -->

            <label
              class="form-field"
            >

              <span>
                Time Zone
              </span>

              <select
                id="event-timezone"
                class="input"
              >

                <option
                  value="Asia/Tokyo"
                  selected
                >
                  Japan — Asia/Tokyo
                </option>

                <option
                  value="Asia/Manila"
                >
                  Philippines — Asia/Manila
                </option>

                <option
                  value="Asia/Jakarta"
                >
                  Indonesia — Asia/Jakarta
                </option>

                <option
                  value="Asia/Kuala_Lumpur"
                >
                  Malaysia — Asia/Kuala_Lumpur
                </option>

                <option
                  value="Asia/Colombo"
                >
                  Sri Lanka — Asia/Colombo
                </option>

                <option
                  value="Australia/Perth"
                >
                  Australia — Perth
                </option>

                <option
                  value="America/New_York"
                >
                  USA — New York
                </option>

                <option
                  value="Europe/London"
                >
                  UK — London
                </option>

              </select>

            </label>



            <!-- Status -->

            <label
              class="form-field"
            >

              <span>
                Status
              </span>

              <select
                id="event-status"
                class="input"
              >

                <option
                  value="draft"
                  selected
                >
                  Draft
                </option>

                <option
                  value="published"
                >
                  Published
                </option>

                <option
                  value="live"
                >
                  Live
                </option>

                <option
                  value="completed"
                >
                  Completed
                </option>

              </select>

            </label>



            <div
              class="event-form-actions"
            >

              <button
                id="save-event-button"
                class="primary-button"
                type="submit"
              >
                Create Event
              </button>

            </div>


            <p
              id="event-form-message"
              class="form-message"
            ></p>

          </form>

        </div>



        <!-- ===============================================
             Event List
             =============================================== -->

        <div
          class="event-management-list"
        >

          ${
            events.length ===
            0

              ? `

                <div
                  class="empty-state"
                >

                  <h3>
                    No events yet
                  </h3>

                  <p class="muted">
                    Create your first
                    Global Classroom event.
                  </p>

                </div>

              `

              : events
                  .map(
                    (event) => {

                      const status =
                        formatStatus(
                          event.status
                        );


                      return `

                        <article
                          class="event-management-card"
                        >

                          <div
                            class="event-management-card-main"
                          >

                            <div
                              class="event-management-title-row"
                            >

                              <div>

                                <span
                                  class="
                                    event-status-badge
                                    ${status.className}
                                  "
                                >
                                  ${status.label}
                                </span>


                                <h3>
                                  ${escapeHtml(
                                    event.title
                                  )}
                                </h3>

                              </div>

                            </div>


                            <div
                              class="event-management-meta"
                            >

                              <span>
                                📅
                                ${escapeHtml(
                                  formatEventDate(
                                    event.starts_at
                                  )
                                )}
                              </span>


                              <span>
                                🌏
                                ${escapeHtml(
                                  event.timezone ||
                                  'Asia/Tokyo'
                                )}
                              </span>

                            </div>

                          </div>


                          <div
                            class="event-management-actions"
                          >

                            <button
                              class="
                                secondary-button
                                edit-event-button
                              "
                              type="button"
                              data-event-id="${event.id}"
                            >
                              Edit
                            </button>

                            <button
  class="
    secondary-button
    manage-event-participants-button
  "
  type="button"
  data-event-id="${event.id}"
  data-event-title="${escapeHtml(
    event.title
  )}"
>
  👥 Manage Participants
</button>

                            <a
                              class="secondary-button"
                              href="#/rooms"
                            >
                              Room Builder
                            </a>


                            <a
                              class="secondary-button"
                              href="#/round-overview"
                            >
                              Round Overview
                            </a>


                            <button
                              class="
                                danger-button
                                delete-event-button
                              "
                              type="button"
                              data-event-id="${event.id}"
                              data-event-title="${escapeHtml(
                                event.title
                              )}"
                            >
                              Delete
                            </button>

                          </div>

                        </article>

                      `;

                    }
                  )
                  .join('')
          }

        </div>

        <!-- ===============================================
             Manage Participants Modal
             =============================================== -->

        <dialog
  id="event-participants-modal"
  class="event-participants-dialog"
>

  <div
    class="event-participants-modal"
  >

            <div
              class="modal-head"
            >

              <div>

                <p class="eyebrow">
                  EVENT PARTICIPANTS
                </p>

                <h3
                  id="event-participants-title"
                >
                  Manage Participants
                </h3>

                <p class="muted">
                  Choose the students who
                  will participate in this event.
                </p>

              </div>


              <button
  id="close-event-participants"
  class="event-participants-close-button"
  type="button"
  aria-label="Close"
>
  ×
</button>
            </div>



            <input
              id="event-participants-event-id"
              type="hidden"
            />



            <!-- Search / Actions -->

            <div
              class="event-participants-toolbar"
            >

              <input
                id="event-participant-search"
                class="input"
                type="search"
                placeholder="Search student or school..."
              />


              <div
                class="event-participant-toolbar-actions"
              >

                <button
                  id="select-all-event-participants"
                  class="secondary-button"
                  type="button"
                >
                  Select All
                </button>


                <button
                  id="clear-event-participants"
                  class="secondary-button"
                  type="button"
                >
                  Clear
                </button>

              </div>

            </div>



            <!-- Counter -->

            <div
              class="event-participant-counter"
            >

              <strong
                id="event-participant-selected-count"
              >
                0
              </strong>

              <span>
                participants selected
              </span>

            </div>



            <!-- Participant List -->

            <div
              id="event-participant-list"
              class="event-participant-list"
            >

              <div
                class="empty-state"
              >

                <p class="muted">
                  Loading participants...
                </p>

              </div>

            </div>



            <!-- Save -->

            <div
              class="event-participant-footer"
            >

              <p
                id="event-participant-message"
                class="form-message"
              ></p>


              <button
                id="save-event-participants"
                class="primary-button"
                type="button"
              >
                Save Participants
              </button>

            </div>

          </div>

        </dialog>

        <!-- ===============================================
             Edit Event Modal
             =============================================== -->

        <div
          id="edit-event-modal"
          class="
            modal-backdrop
            hidden
          "
        >

          <div
            class="
              modal-card
              event-edit-modal
            "
          >

            <div
              class="modal-head"
            >

              <div>

                <p class="eyebrow">
                  EDIT EVENT
                </p>

                <h3>
                  Event Settings
                </h3>

              </div>


              <button
                id="close-event-edit"
                class="secondary-button"
                type="button"
              >
                Close
              </button>

            </div>


            <form
              id="edit-event-form"
              class="event-form"
            >

              <input
                id="edit-event-id"
                type="hidden"
              />


              <label
                class="form-field"
              >

                <span>
                  Event Title
                </span>

                <input
                  id="edit-event-title"
                  class="input"
                  type="text"
                  required
                />

              </label>


              <label
                class="form-field"
              >

                <span>
                  Start Date & Time
                </span>

                <input
                  id="edit-event-starts-at"
                  class="input"
                  type="datetime-local"
                />

              </label>


              <label
                class="form-field"
              >

                <span>
                  Time Zone
                </span>

                <select
                  id="edit-event-timezone"
                  class="input"
                >

                  <option
                    value="Asia/Tokyo"
                  >
                    Japan — Asia/Tokyo
                  </option>

                  <option
                    value="Asia/Manila"
                  >
                    Philippines — Asia/Manila
                  </option>

                  <option
                    value="Asia/Jakarta"
                  >
                    Indonesia — Asia/Jakarta
                  </option>

                  <option
                    value="Asia/Kuala_Lumpur"
                  >
                    Malaysia — Asia/Kuala_Lumpur
                  </option>

                  <option
                    value="Asia/Colombo"
                  >
                    Sri Lanka — Asia/Colombo
                  </option>

                  <option
                    value="Australia/Perth"
                  >
                    Australia — Perth
                  </option>

                  <option
                    value="America/New_York"
                  >
                    USA — New York
                  </option>

                  <option
                    value="Europe/London"
                  >
                    UK — London
                  </option>

                </select>

              </label>


              <label
                class="form-field"
              >

                <span>
                  Status
                </span>

                <select
                  id="edit-event-status"
                  class="input"
                >

                  <option value="draft">
                    Draft
                  </option>

                  <option value="published">
                    Published
                  </option>

                  <option value="live">
                    Live
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                </select>

              </label>


              <div
                class="event-form-actions"
              >

                <button
                  id="update-event-button"
                  class="primary-button"
                  type="submit"
                >
                  Save Changes
                </button>

              </div>


              <p
                id="edit-event-message"
                class="form-message"
              ></p>

            </form>

          </div>

        </div>

      </section>

    `;


  } catch (error) {

    console.error(
      'Events page error:',
      error
    );


    return `

      <section class="panel">

        <h2>
          Could not load Events
        </h2>

        <p class="muted">
          Please check the browser console.
        </p>

      </section>

    `;

  }

}