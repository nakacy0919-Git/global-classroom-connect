import {
  addEvent,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../services/eventService.js';


import {
  getParticipants,
  getParticipantsByEvent,
  replaceEventParticipants,
} from '../services/participantService.js';



// =========================================================
// Helpers
// =========================================================

function toDateTimeLocalValue(
  isoValue
) {

  if (!isoValue) {
    return '';
  }


  const date =
    new Date(
      isoValue
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';

  }


  const offset =
    date.getTimezoneOffset() *
    60000;


  return new Date(
    date.getTime() -
    offset
  )
    .toISOString()
    .slice(
      0,
      16
    );

}



function localDateTimeToIso(
  value
) {

  if (!value) {
    return null;
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date.toISOString();

}



function oneRelation(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value[0] || null;

  }


  return value || null;

}



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



// =========================================================
// Event Controller
// =========================================================

export function bindEventManagement({
  renderApp,
}) {

  // =======================================================
  // DOM
  // =======================================================

  const addEventButton =
    document.querySelector(
      '#add-event-button'
    );


  const addEventPanel =
    document.querySelector(
      '#add-event-panel'
    );


  const cancelEventButton =
    document.querySelector(
      '#cancel-event-button'
    );


  const addEventForm =
    document.querySelector(
      '#add-event-form'
    );


  const editEventModal =
    document.querySelector(
      '#edit-event-modal'
    );


  const closeEventEditButton =
    document.querySelector(
      '#close-event-edit'
    );


  const editEventForm =
    document.querySelector(
      '#edit-event-form'
    );



  // =======================================================
  // Create Event Panel
  // =======================================================

  addEventButton
    ?.addEventListener(
      'click',
      () => {

        addEventPanel
          ?.classList
          .remove(
            'hidden'
          );


        addEventButton
          ?.classList
          .add(
            'hidden'
          );

      }
    );



  cancelEventButton
    ?.addEventListener(
      'click',
      () => {

        addEventPanel
          ?.classList
          .add(
            'hidden'
          );


        addEventButton
          ?.classList
          .remove(
            'hidden'
          );


        addEventForm
          ?.reset();


        const message =
          document.querySelector(
            '#event-form-message'
          );


        if (message) {

          message.textContent =
            '';

        }

      }
    );



  // =======================================================
  // Create Event
  // =======================================================

  addEventForm
    ?.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();


        const title =
          document
            .querySelector(
              '#event-title'
            )
            ?.value
            .trim();


        const startsAtInput =
          document
            .querySelector(
              '#event-starts-at'
            )
            ?.value;


        const timezone =
          document
            .querySelector(
              '#event-timezone'
            )
            ?.value ||
          'Asia/Tokyo';


        const status =
          document
            .querySelector(
              '#event-status'
            )
            ?.value ||
          'draft';


        const message =
          document.querySelector(
            '#event-form-message'
          );


        const saveButton =
          document.querySelector(
            '#save-event-button'
          );


        if (!title) {

          if (message) {

            message.textContent =
              'Please enter an event title.';

          }


          return;

        }


        if (saveButton) {

          saveButton.disabled =
            true;


          saveButton.textContent =
            'Creating...';

        }


        if (message) {

          message.textContent =
            'Creating event...';

        }


        try {

          await addEvent({

            title,

            startsAt:
              localDateTimeToIso(
                startsAtInput
              ),

            timezone,

            status,

          });


          if (message) {

            message.textContent =
              '✓ Event created successfully.';

          }


          await renderApp();


        } catch (error) {

          console.error(
            'Create event error:',
            error
          );


          if (message) {

            message.textContent =
              error?.message ||
              'Could not create event.';

          }


          if (saveButton) {

            saveButton.disabled =
              false;


            saveButton.textContent =
              'Create Event';

          }

        }

      }
    );



  // =======================================================
  // Edit Event
  // =======================================================

  document
    .querySelectorAll(
      '.edit-event-button'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          'click',
          async () => {

            const eventId =
              button.dataset
                .eventId;


            if (!eventId) {
              return;
            }


            try {

              const eventData =
                await getEventById(
                  eventId
                );


              const idInput =
                document.querySelector(
                  '#edit-event-id'
                );


              const titleInput =
                document.querySelector(
                  '#edit-event-title'
                );


              const startsAtInput =
                document.querySelector(
                  '#edit-event-starts-at'
                );


              const timezoneInput =
                document.querySelector(
                  '#edit-event-timezone'
                );


              const statusInput =
                document.querySelector(
                  '#edit-event-status'
                );


              if (idInput) {

                idInput.value =
                  eventData.id;

              }


              if (titleInput) {

                titleInput.value =
                  eventData.title ||
                  '';

              }


              if (startsAtInput) {

                startsAtInput.value =
                  toDateTimeLocalValue(
                    eventData.starts_at
                  );

              }


              if (timezoneInput) {

                timezoneInput.value =
                  eventData.timezone ||
                  'Asia/Tokyo';

              }


              if (statusInput) {

                statusInput.value =
                  eventData.status ||
                  'draft';

              }


              const editMessage =
                document.querySelector(
                  '#edit-event-message'
                );


              if (editMessage) {

                editMessage.textContent =
                  '';

              }


              editEventModal
                ?.classList
                .remove(
                  'hidden'
                );


            } catch (error) {

              console.error(
                'Load event error:',
                error
              );


              alert(
                error?.message ||
                'Could not load the event.'
              );

            }

          }
        );

      }
    );



  closeEventEditButton
    ?.addEventListener(
      'click',
      () => {

        editEventModal
          ?.classList
          .add(
            'hidden'
          );

      }
    );



  // =======================================================
  // Update Event
  // =======================================================

  editEventForm
    ?.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();


        const eventId =
          document
            .querySelector(
              '#edit-event-id'
            )
            ?.value;


        const title =
          document
            .querySelector(
              '#edit-event-title'
            )
            ?.value
            .trim();


        const startsAtInput =
          document
            .querySelector(
              '#edit-event-starts-at'
            )
            ?.value;


        const timezone =
          document
            .querySelector(
              '#edit-event-timezone'
            )
            ?.value ||
          'Asia/Tokyo';


        const status =
          document
            .querySelector(
              '#edit-event-status'
            )
            ?.value ||
          'draft';


        const message =
          document.querySelector(
            '#edit-event-message'
          );


        const updateButton =
          document.querySelector(
            '#update-event-button'
          );


        if (
          !eventId ||
          !title
        ) {

          if (message) {

            message.textContent =
              'Event title is required.';

          }


          return;

        }


        if (updateButton) {

          updateButton.disabled =
            true;


          updateButton.textContent =
            'Saving...';

        }


        if (message) {

          message.textContent =
            'Saving changes...';

        }


        try {

          await updateEvent(
            eventId,
            {

              title,

              startsAt:
                localDateTimeToIso(
                  startsAtInput
                ),

              timezone,

              status,

            }
          );


          editEventModal
            ?.classList
            .add(
              'hidden'
            );


          await renderApp();


        } catch (error) {

          console.error(
            'Update event error:',
            error
          );


          if (message) {

            message.textContent =
              error?.message ||
              'Could not update the event.';

          }


          if (updateButton) {

            updateButton.disabled =
              false;


            updateButton.textContent =
              'Save Changes';

          }

        }

      }
    );



  // =======================================================
  // Delete Event
  // =======================================================

  document
    .querySelectorAll(
      '.delete-event-button'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          'click',
          async () => {

            const eventId =
              button.dataset
                .eventId;


            const eventTitle =
              button.dataset
                .eventTitle ||
              'this event';


            const confirmed =
              window.confirm(
                `Delete "${eventTitle}"?\n\nThis will also delete saved rounds and room assignments for this event.`
              );


            if (!confirmed) {
              return;
            }


            button.disabled =
              true;


            button.textContent =
              'Deleting...';


            try {

              await deleteEvent(
                eventId
              );


              await renderApp();


            } catch (error) {

              console.error(
                'Delete event error:',
                error
              );


              alert(
                error?.message ||
                'Could not delete the event.'
              );


              button.disabled =
                false;


              button.textContent =
                'Delete';

            }

          }
        );

      }
    );



  // =======================================================
  // Event Participants
  // =======================================================

  const eventParticipantsModal =
    document.querySelector(
      '#event-participants-modal'
    );


  const closeEventParticipantsButton =
    document.querySelector(
      '#close-event-participants'
    );


  const eventParticipantsEventId =
    document.querySelector(
      '#event-participants-event-id'
    );


  const eventParticipantsTitle =
    document.querySelector(
      '#event-participants-title'
    );


  const eventParticipantList =
    document.querySelector(
      '#event-participant-list'
    );


  const eventParticipantSearch =
    document.querySelector(
      '#event-participant-search'
    );


  const selectAllButton =
    document.querySelector(
      '#select-all-event-participants'
    );


  const clearButton =
    document.querySelector(
      '#clear-event-participants'
    );


  const saveParticipantsButton =
    document.querySelector(
      '#save-event-participants'
    );


  const selectedCount =
    document.querySelector(
      '#event-participant-selected-count'
    );


  const participantMessage =
    document.querySelector(
      '#event-participant-message'
    );



  function updateSelectedCount() {

    const checked =
      document.querySelectorAll(
        '.event-participant-checkbox:checked'
      );


    if (selectedCount) {

      selectedCount.textContent =
        checked.length;

    }

  }



  function filterParticipantList() {

    const query =
      eventParticipantSearch
        ?.value
        .trim()
        .toLowerCase() ||
      '';


    document
      .querySelectorAll(
        '.event-participant-option'
      )
      .forEach(
        (row) => {

          const searchText =
            row.dataset
              .participantSearch ||
            '';


          row.style.display =
            searchText.includes(
              query
            )
              ? ''
              : 'none';

        }
      );

  }



  eventParticipantSearch
    ?.addEventListener(
      'input',
      filterParticipantList
    );



  // =======================================================
  // Open Participant Manager
  // =======================================================

  document
    .querySelectorAll(
      '.manage-event-participants-button'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          'click',
          async () => {

            const eventId =
              button.dataset
                .eventId;


            const eventTitle =
              button.dataset
                .eventTitle ||
              'Event';


            if (
              !eventId ||
              !eventParticipantList
            ) {

              return;

            }


            if (
              eventParticipantsEventId
            ) {

              eventParticipantsEventId.value =
                eventId;

            }


            if (
              eventParticipantsTitle
            ) {

              eventParticipantsTitle.textContent =
                eventTitle;

            }


            if (
              participantMessage
            ) {

              participantMessage.textContent =
                '';

            }


            if (
              eventParticipantSearch
            ) {

              eventParticipantSearch.value =
                '';

            }


            eventParticipantList.innerHTML = `

              <div class="empty-state">

                <p class="muted">
                  Loading participants...
                </p>

              </div>

            `;


            if (
              eventParticipantsModal &&
              !eventParticipantsModal.open
            ) {

              eventParticipantsModal
                .showModal();

            }


            try {

              const [
                allParticipants,
                selectedParticipants,
              ] =
                await Promise.all([

                  getParticipants(),

                  getParticipantsByEvent(
                    eventId
                  ),

                ]);


              const selectedIds =
                new Set(
                  selectedParticipants
                    .map(
                      (participant) =>
                        participant.id
                    )
                );


              if (
                allParticipants.length ===
                0
              ) {

                eventParticipantList.innerHTML = `

                  <div class="empty-state">

                    <h3>
                      No participants available
                    </h3>

                    <p class="muted">
                      Approve participants first.
                    </p>

                  </div>

                `;


                updateSelectedCount();

                return;

              }


              eventParticipantList.innerHTML =
                allParticipants
                  .map(
                    (participant) => {

                      const school =
                        oneRelation(
                          participant.schools
                        );


                      const schoolName =
                        school?.name ||
                        'Unknown school';


                      const countryName =
                        school?.country_name ||
                        '';


                      const checked =
                        selectedIds.has(
                          participant.id
                        );


                      const searchText =
                        [
                          participant.display_name,
                          schoolName,
                          countryName,
                          participant.grade,
                        ]
                          .filter(Boolean)
                          .join(' ')
                          .toLowerCase();


                      return `

                        <label
                          class="event-participant-option"
                          data-participant-search="${escapeHtml(
                            searchText
                          )}"
                        >

                          <input
                            class="event-participant-checkbox"
                            type="checkbox"
                            value="${participant.id}"
                            ${
                              checked
                                ? 'checked'
                                : ''
                            }
                          />


                          <div
                            class="event-participant-option-info"
                          >

                            <strong>
                              ${escapeHtml(
                                participant.display_name
                              )}
                            </strong>


                            <span>

                              ${escapeHtml(
                                schoolName
                              )}

                              ${
                                participant.grade
                                  ? ` · ${escapeHtml(
                                      participant.grade
                                    )}`
                                  : ''
                              }

                            </span>

                          </div>

                        </label>

                      `;

                    }
                  )
                  .join('');


              document
                .querySelectorAll(
                  '.event-participant-checkbox'
                )
                .forEach(
                  (checkbox) => {

                    checkbox.addEventListener(
                      'change',
                      updateSelectedCount
                    );

                  }
                );


              updateSelectedCount();


            } catch (error) {

              console.error(
                'Load event participants error:',
                error
              );


              eventParticipantList.innerHTML = `

                <div class="empty-state">

                  <h3>
                    Could not load participants
                  </h3>

                  <p class="muted">
                    Please check the browser console.
                  </p>

                </div>

              `;

            }

          }
        );

      }
    );



  // =======================================================
  // Close Participant Manager
  // =======================================================

  closeEventParticipantsButton
    ?.addEventListener(
      'click',
      () => {

        eventParticipantsModal
          ?.close();

      }
    );



  eventParticipantsModal
    ?.addEventListener(
      'click',
      (event) => {

        if (
          event.target ===
          eventParticipantsModal
        ) {

          eventParticipantsModal
            .close();

        }

      }
    );



  // =======================================================
  // Select All / Clear
  // =======================================================

  selectAllButton
    ?.addEventListener(
      'click',
      () => {

        document
          .querySelectorAll(
            '.event-participant-option'
          )
          .forEach(
            (row) => {

              if (
                row.style.display ===
                'none'
              ) {

                return;

              }


              const checkbox =
                row.querySelector(
                  '.event-participant-checkbox'
                );


              if (checkbox) {

                checkbox.checked =
                  true;

              }

            }
          );


        updateSelectedCount();

      }
    );



  clearButton
    ?.addEventListener(
      'click',
      () => {

        document
          .querySelectorAll(
            '.event-participant-checkbox'
          )
          .forEach(
            (checkbox) => {

              checkbox.checked =
                false;

            }
          );


        updateSelectedCount();

      }
    );



  // =======================================================
  // Save Event Participants
  // =======================================================

  saveParticipantsButton
    ?.addEventListener(
      'click',
      async () => {

        const eventId =
          eventParticipantsEventId
            ?.value;


        if (!eventId) {
          return;
        }


        const participantIds =
          Array
            .from(
              document
                .querySelectorAll(
                  '.event-participant-checkbox:checked'
                )
            )
            .map(
              (checkbox) =>
                checkbox.value
            );


        saveParticipantsButton.disabled =
          true;


        saveParticipantsButton.textContent =
          'Saving...';


        if (
          participantMessage
        ) {

          participantMessage.textContent =
            'Saving participants...';

        }


        try {

          const count =
            await replaceEventParticipants(
              eventId,
              participantIds
            );


          if (
            participantMessage
          ) {

            participantMessage.textContent =
              `✓ ${count} participant${
                count === 1
                  ? ''
                  : 's'
              } saved.`;

          }


          updateSelectedCount();


          setTimeout(
            async () => {

              eventParticipantsModal
                ?.close();


              await renderApp();

            },
            600
          );


        } catch (error) {

          console.error(
            'Save event participants error:',
            error
          );


          if (
            participantMessage
          ) {

            participantMessage.textContent =
              error?.message ||
              'Could not save participants.';

          }


        } finally {

          saveParticipantsButton.disabled =
            false;


          saveParticipantsButton.textContent =
            'Save Participants';

        }

      }
    );

}