import { supabase } from './services/supabase.js';

import {
  addSchool,
  getSchoolById,
  updateSchool,
  deleteSchool,
} from './services/schoolService.js';

import {
  bindEventManagement,
} from './controllers/eventController.js';

import {
  saveRoomPlan,
  getRoundOverview,
} from './services/roomService.js';

import {
  TeachersPage
} from './pages/host/TeachersPage.js';

import {
  addTeacher,
  updateTeacher,
  uploadTeacherPhoto,
} from './services/teacherService.js';

import {
  ParticipantsPage
} from './pages/host/ParticipantsPage.js';

import {
  buildRoomPlan,
} from './services/roomBuilderService.js';

import {
  submitRegistration,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from './services/registrationService.js';

import {
  signIn
} from './services/authService.js';


import {
  Sidebar
} from './components/Sidebar.js';

import {
  Header
} from './components/Header.js';


import {
  DashboardPage
} from './pages/host/DashboardPage.js';

import {
  EventsPage
} from './pages/host/EventsPage.js';

import {
  SchoolsPage
} from './pages/host/SchoolsPage.js';

import {
  RoomsPage,
  renderRoomPlan,
} from './pages/host/RoomsPage.js';

import {
  RoundOverviewPage,
  renderRoundOverviewContent,
} from './pages/host/RoundOverviewPage.js';

import {
  RegistrationPage
} from './pages/teacher/RegistrationPage.js';

import {
  SessionBoardPage
} from './pages/participant/SessionBoardPage.js';

import {
  LoginPage
} from './pages/auth/LoginPage.js';




let currentRoomPlan = null;




const routes = {
  dashboard: DashboardPage,
  events: EventsPage,
  schools: SchoolsPage,
  teachers: TeachersPage,
  participants: ParticipantsPage,
  rooms: RoomsPage,

  'round-overview': RoundOverviewPage,

  registration: RegistrationPage,
  'session-board': SessionBoardPage,
  login: LoginPage,
};




function getCurrentRoute() {

  const raw =
    window
      .location
      .hash
      .replace(
        '#/',
        ''
      )
      .trim();


  return routes[raw]
    ? raw
    : 'dashboard';

}




async function renderCurrentPage(
  route
) {

  const page =
    routes[route];


  const container =
    document.querySelector(
      '#page-content'
    );


  if (!container) {
    return;
  }


  container.innerHTML = `

    <section class="panel">

      <p class="muted">
        Loading...
      </p>

    </section>

  `;


  try {

    const pageHtml =
      await page();


    container.innerHTML =
      pageHtml;


  } catch (error) {

    console.error(
      'Page render error:',
      error
    );


    container.innerHTML = `

      <section class="panel">

        <h2>
          Something went wrong
        </h2>

        <p class="muted">
          Please check the browser console.
        </p>

      </section>

    `;

  }

}




function bindUiEvents() {


    // =========================================================
  // Smart Room Builder
  // =========================================================

  const generateRoomsButton =
    document.querySelector(
      '#generate-rooms-button'
    );


  const saveRoomPlanButton =
    document.querySelector(
      '#save-room-plan-button'
    );


  const tryAnotherMixButton =
    document.querySelector(
      '#try-another-mix-button'
    );


  const roomEventSelect =
    document.querySelector(
      '#room-event'
    );


  const roomRoundSelect =
    document.querySelector(
      '#room-round-number'
    );


  const roomSizeSelect =
    document.querySelector(
      '#participants-per-room'
    );


  const roomBuilderStatus =
    document.querySelector(
      '#room-builder-status'
    );


  const generatedRoomGrid =
    document.querySelector(
      '#generated-room-grid'
    );


  const qualityDashboard =
    document.querySelector(
      '#room-quality-dashboard'
    );


  const qualityDiversityScore =
    document.querySelector(
      '#quality-diversity-score'
    );


  const qualityRepeatedPairs =
    document.querySelector(
      '#quality-repeated-pairs'
    );


  const qualitySchoolConflicts =
    document.querySelector(
      '#quality-school-conflicts'
    );


  const qualityCountryMix =
    document.querySelector(
      '#quality-country-mix'
    );


  const qualityFacilitatorCoverage =
    document.querySelector(
      '#quality-facilitator-coverage'
    );


  const qualityFeedback =
    document.querySelector(
      '#room-quality-feedback'
    );


  // ---------------------------------------------------------
  // Quality Dashboard
  // ---------------------------------------------------------

  function renderQualityDashboard(
    plan
  ) {

    if (
      !plan?.quality ||
      !qualityDashboard
    ) {

      return;

    }


    qualityDashboard
      .classList
      .remove(
        'hidden'
      );


    if (
      qualityDiversityScore
    ) {

      qualityDiversityScore.textContent =
        `${plan.quality.diversityScore}%`;

    }


    if (
      qualityRepeatedPairs
    ) {

      qualityRepeatedPairs.textContent =
        plan.quality.repeatedPairs;

    }


    if (
      qualitySchoolConflicts
    ) {

      qualitySchoolConflicts.textContent =
        plan.quality.sameSchoolPairs;

    }


    if (
      qualityCountryMix
    ) {

      qualityCountryMix.textContent =
        plan.quality.countryMix;

    }


    if (
      qualityFacilitatorCoverage
    ) {

      qualityFacilitatorCoverage.textContent =
        `${plan.quality.facilitatorCoverage}%`;

    }


    if (
      qualityFeedback
    ) {

      const feedbackItems =
        Array.isArray(
          plan.quality.feedback
        )
          ? plan.quality.feedback
          : [];


      qualityFeedback.innerHTML =
        feedbackItems
          .map(
            (item) => {

              let icon =
                'ℹ';


              if (
                item.type ===
                'success'
              ) {

                icon =
                  '✓';

              }


              if (
                item.type ===
                'warning'
              ) {

                icon =
                  '⚠';

              }


              return `

                <div
                  class="
                    quality-feedback-item
                    quality-feedback-${item.type}
                  "
                >

                  <span
                    class="quality-feedback-icon"
                  >
                    ${icon}
                  </span>


                  <span
                    class="quality-feedback-message"
                  >
                    ${item.message}
                  </span>

                </div>

              `;

            }
          )
          .join('');

    }

  }


  // ---------------------------------------------------------
  // Try Another Mix availability
  // ---------------------------------------------------------

  function canTryAnotherMix(
    plan
  ) {

    return Boolean(

      plan &&

      plan.signature &&

      plan.roomCount > 1 &&

      plan.participantCount >
        plan.roomCount

    );

  }


  function updateTryAnotherMixButton(
    plan
  ) {

    if (
      !tryAnotherMixButton
    ) {

      return;

    }


    tryAnotherMixButton.disabled =
      !canTryAnotherMix(
        plan
      );


    tryAnotherMixButton.textContent =
      '🔀 Try Another Mix';

  }


  // ---------------------------------------------------------
  // Compare current plan vs alternative
  // ---------------------------------------------------------

  function isPlanAtLeastAsGood(
    candidate,
    current
  ) {

    if (
      !candidate?.quality ||
      !current?.quality
    ) {

      return false;

    }


    const candidateQuality =
      candidate.quality;


    const currentQuality =
      current.quality;


    // 1. Diversity Score

    if (
      candidateQuality
        .diversityScore !==
      currentQuality
        .diversityScore
    ) {

      return (
        candidateQuality
          .diversityScore >
        currentQuality
          .diversityScore
      );

    }


    // 2. Repeated Partners

    if (
      candidateQuality
        .repeatedPairs !==
      currentQuality
        .repeatedPairs
    ) {

      return (
        candidateQuality
          .repeatedPairs <
        currentQuality
          .repeatedPairs
      );

    }


    // 3. Same School

    if (
      candidateQuality
        .sameSchoolPairs !==
      currentQuality
        .sameSchoolPairs
    ) {

      return (
        candidateQuality
          .sameSchoolPairs <
        currentQuality
          .sameSchoolPairs
      );

    }


    // 4. Same Country

    if (
      candidateQuality
        .sameCountryPairs !==
      currentQuality
        .sameCountryPairs
    ) {

      return (
        candidateQuality
          .sameCountryPairs <
        currentQuality
          .sameCountryPairs
      );

    }


    // 5. Facilitator Coverage

    if (
      candidateQuality
        .facilitatorCoverage !==
      currentQuality
        .facilitatorCoverage
    ) {

      return (
        candidateQuality
          .facilitatorCoverage >
        currentQuality
          .facilitatorCoverage
      );

    }


    // 完全同点なら採用可能
    return true;

  }


  // ---------------------------------------------------------
  // Reset Room Plan
  // ---------------------------------------------------------

  function invalidateRoomPlan() {

    currentRoomPlan =
      null;


    if (
      qualityDashboard
    ) {

      qualityDashboard
        .classList
        .add(
          'hidden'
        );

    }


    if (
      qualityFeedback
    ) {

      qualityFeedback.innerHTML =
        '';

    }


    if (
      saveRoomPlanButton
    ) {

      saveRoomPlanButton.disabled =
        true;


      saveRoomPlanButton.textContent =
        'Save Round';

    }


    if (
      tryAnotherMixButton
    ) {

      tryAnotherMixButton.disabled =
        true;


      tryAnotherMixButton.textContent =
        '🔀 Try Another Mix';

    }


    if (
      generatedRoomGrid
    ) {

      generatedRoomGrid.innerHTML =
        '';

    }


    if (
      roomBuilderStatus
    ) {

      roomBuilderStatus.textContent =
        'Settings changed. Generate a new room plan.';

    }

  }


  roomEventSelect
    ?.addEventListener(
      'change',
      invalidateRoomPlan
    );


  roomRoundSelect
    ?.addEventListener(
      'change',
      invalidateRoomPlan
    );


  roomSizeSelect
    ?.addEventListener(
      'change',
      invalidateRoomPlan
    );


  // =========================================================
  // Round Overview
  // =========================================================

  const roundOverviewEvent =
    document.querySelector(
      '#round-overview-event'
    );


  roundOverviewEvent
    ?.addEventListener(
      'change',
      async () => {

        const eventId =
          roundOverviewEvent.value;


        const status =
          document.querySelector(
            '#round-overview-status'
          );


        const content =
          document.querySelector(
            '#round-overview-content'
          );


        if (
          !eventId ||
          !content
        ) {

          return;

        }


        if (
          status
        ) {

          status.textContent =
            'Loading saved rounds...';

        }


        try {

          const rounds =
            await getRoundOverview(
              eventId
            );


          content.innerHTML =
            renderRoundOverviewContent(
              rounds
            );


          if (
            status
          ) {

            status.textContent =
              `Comparing ${rounds.length} saved round(s).`;

          }


        } catch (error) {

          console.error(
            'Round Overview change error:',
            error
          );


          if (
            status
          ) {

            status.textContent =
              error?.message ||
              'Could not load the selected event.';

          }

        }

      }
    );


  // ---------------------------------------------------------
  // Generate Rooms
  // ---------------------------------------------------------

  generateRoomsButton
    ?.addEventListener(
      'click',
      async () => {

        const eventId =
          roomEventSelect?.value ||
          null;


        const roundNumber =
          Number(
            roomRoundSelect?.value ||
            1
          );


        const participantsPerRoom =
          Number(
            roomSizeSelect?.value ||
            4
          );


        currentRoomPlan =
          null;


        if (
          saveRoomPlanButton
        ) {

          saveRoomPlanButton.disabled =
            true;


          saveRoomPlanButton.textContent =
            'Save Round';

        }


        if (
          tryAnotherMixButton
        ) {

          tryAnotherMixButton.disabled =
            true;


          tryAnotherMixButton.textContent =
            '🔀 Try Another Mix';

        }


        generateRoomsButton.disabled =
          true;


        generateRoomsButton.textContent =
          'Generating...';


        if (
          roomBuilderStatus
        ) {

          if (
            roundNumber > 1
          ) {

            roomBuilderStatus.textContent =
              `Checking previous rounds and generating Round ${roundNumber}...`;

          } else {

            roomBuilderStatus.textContent =
              'Mixing schools and countries...';

          }

        }


        try {

          const plan =
            await buildRoomPlan({

              participantsPerRoom,

              eventId,

              roundNumber,

            });


          currentRoomPlan =
            plan;


          renderQualityDashboard(
            plan
          );


          if (
            generatedRoomGrid
          ) {

            generatedRoomGrid.innerHTML =
              renderRoomPlan(
                plan
              );

          }


          if (
            saveRoomPlanButton &&
            plan.rooms.length > 0
          ) {

            saveRoomPlanButton.disabled =
              false;


            saveRoomPlanButton.textContent =
              'Save Round';

          }


          updateTryAnotherMixButton(
            plan
          );


          if (
            roomBuilderStatus
          ) {

            let statusHtml = `

              ✓ ${plan.participantCount}
              participants assigned to
              ${plan.roomCount} rooms.

            `;


            if (
              roundNumber > 1
            ) {

              statusHtml += `

                <br>

                Previous roommate pairs checked:
                <strong>
                  ${plan.historyPairCount}
                </strong>

                <br>

                Repeated pairs in this round:
                <strong>
                  ${plan.repeatedPairs}
                </strong>

              `;

            }


            if (
              plan.missingFacilitators > 0
            ) {

              statusHtml += `

                <br>

                <strong>
                  ⚠ ${plan.missingFacilitators}
                  more facilitator(s) needed.
                </strong>

              `;

            } else {

              statusHtml += `

                <br>

                All rooms have facilitators.

              `;

            }


            roomBuilderStatus.innerHTML =
              statusHtml;

          }


        } catch (error) {

          currentRoomPlan =
            null;


          if (
            qualityDashboard
          ) {

            qualityDashboard
              .classList
              .add(
                'hidden'
              );

          }


          if (
            qualityFeedback
          ) {

            qualityFeedback.innerHTML =
              '';

          }


          if (
            tryAnotherMixButton
          ) {

            tryAnotherMixButton.disabled =
              true;

          }


          console.error(
            'Room generation error:',
            error
          );


          if (
            roomBuilderStatus
          ) {

            roomBuilderStatus.textContent =
              error?.message ||
              'Could not generate rooms.';

          }


        } finally {

          generateRoomsButton.disabled =
            false;


          generateRoomsButton.textContent =
            '✨ Generate Rooms';

        }

      }
    );


  // ---------------------------------------------------------
  // Try Another Mix
  // ---------------------------------------------------------

  tryAnotherMixButton
    ?.addEventListener(
      'click',
      async () => {

        if (
          !currentRoomPlan
        ) {

          return;

        }


        const eventId =
          roomEventSelect?.value ||
          null;


        const roundNumber =
          Number(
            roomRoundSelect?.value ||
            1
          );


        const participantsPerRoom =
          Number(
            roomSizeSelect?.value ||
            4
          );


        const previousPlan =
          currentRoomPlan;


        const previousScore =
          previousPlan
            .quality
            ?.diversityScore ||
          0;


        generateRoomsButton.disabled =
          true;


        tryAnotherMixButton.disabled =
          true;


        tryAnotherMixButton.textContent =
          'Searching...';


        if (
          saveRoomPlanButton
        ) {

          saveRoomPlanButton.disabled =
            true;

        }


        if (
          roomBuilderStatus
        ) {

          roomBuilderStatus.textContent =
            'Searching up to 30 alternative room combinations...';

        }


        try {

          const alternative =
            await buildRoomPlan({

              participantsPerRoom,

              eventId,

              roundNumber,

              attempts:
                30,

              excludeSignature:
                previousPlan.signature,

            });


          // ---------------------------------
          // 別の組み合わせが存在しない
          // ---------------------------------

          if (
            !alternative
              .isDifferentMix
          ) {

            if (
              roomBuilderStatus
            ) {

              roomBuilderStatus.textContent =
                'No different room combination is possible with the current participants and room size.';

            }


            if (
              saveRoomPlanButton
            ) {

              saveRoomPlanButton.disabled =
                false;

            }


            return;

          }


          // ---------------------------------
          // 現在より悪い案しかない
          // ---------------------------------

          if (
            !isPlanAtLeastAsGood(
              alternative,
              previousPlan
            )
          ) {

            if (
              roomBuilderStatus
            ) {

              roomBuilderStatus.innerHTML = `

                No equal-or-better alternative
                was found after
                <strong>
                  ${alternative.attemptsTried}
                </strong>
                attempts.

                <br>

                Current plan kept:
                <strong>
                  ${previousScore}%
                </strong>

              `;

            }


            if (
              saveRoomPlanButton
            ) {

              saveRoomPlanButton.disabled =
                false;

            }


            return;

          }


          // ---------------------------------
          // 新しい案を採用
          // ---------------------------------

          const newScore =
            alternative
              .quality
              ?.diversityScore ||
            0;


          currentRoomPlan =
            alternative;


          if (
            generatedRoomGrid
          ) {

            generatedRoomGrid.innerHTML =
              renderRoomPlan(
                alternative
              );

          }


          renderQualityDashboard(
            alternative
          );


          if (
            roomBuilderStatus
          ) {

            if (
              newScore >
              previousScore
            ) {

              roomBuilderStatus.innerHTML = `

                ✓ Better mix found!

                <strong>
                  ${previousScore}%
                  →
                  ${newScore}%
                </strong>

                <br>

                ${alternative.attemptsTried}
                candidate combinations checked.

              `;


            } else {

              roomBuilderStatus.innerHTML = `

                ✓ Another combination found
                with equal or better detailed quality.

                <strong>
                  ${newScore}%
                </strong>

                <br>

                ${alternative.attemptsTried}
                candidate combinations checked.

              `;

            }

          }


          if (
            saveRoomPlanButton
          ) {

            saveRoomPlanButton.disabled =
              false;


            saveRoomPlanButton.textContent =
              'Save Round';

          }


        } catch (error) {

          console.error(
            'Try another mix error:',
            error
          );


          if (
            roomBuilderStatus
          ) {

            roomBuilderStatus.textContent =
              error?.message ||
              'Could not generate another mix.';

          }


          if (
            saveRoomPlanButton
          ) {

            saveRoomPlanButton.disabled =
              false;

          }


        } finally {

          generateRoomsButton.disabled =
            false;


          updateTryAnotherMixButton(
            currentRoomPlan
          );

        }

      }
    );


  // ---------------------------------------------------------
  // Save Round
  // ---------------------------------------------------------

  saveRoomPlanButton
    ?.addEventListener(
      'click',
      async () => {

        if (
          !currentRoomPlan
        ) {

          alert(
            'Please generate rooms first.'
          );

          return;

        }


        const eventId =
          roomEventSelect?.value;


        const roundNumber =
          Number(
            roomRoundSelect?.value ||
            1
          );


        const participantsPerRoom =
          Number(
            roomSizeSelect?.value ||
            4
          );


        if (
          !eventId
        ) {

          alert(
            'Please select an event.'
          );

          return;

        }


        const confirmed =
          window.confirm(
            `Save Round ${roundNumber}?`
          );


        if (
          !confirmed
        ) {

          return;

        }


        saveRoomPlanButton.disabled =
          true;


        saveRoomPlanButton.textContent =
          'Saving...';


        try {

          const roundId =
            await saveRoomPlan({

              eventId,

              roundNumber,

              roundName:
                `Round ${roundNumber}`,

              participantsPerRoom,

              rooms:
                currentRoomPlan.rooms,

            });


          console.log(
            '✅ Room plan saved:',
            roundId
          );


          saveRoomPlanButton.textContent =
            '✓ Saved';


          if (
            roomBuilderStatus
          ) {

            roomBuilderStatus.innerHTML += `

              <br>

              <strong>
                ✓ Round ${roundNumber} saved to Supabase.
              </strong>

            `;

          }


          alert(
            `Round ${roundNumber} saved successfully.`
          );


        } catch (error) {

          console.error(
            '❌ Save room plan error:',
            error
          );


          alert(
            error?.message ||
            'Could not save the room plan.'
          );


          saveRoomPlanButton.disabled =
            false;


          saveRoomPlanButton.textContent =
            'Save Round';

        }

      }
    );

  // =========================================================
  // Event Management
  // =========================================================

  bindEventManagement({
    renderApp,
  });
  
  // =========================================================
  // Language
  // =========================================================


  const langButtons =
    document.querySelectorAll(
      '[data-lang]'
    );


  const langLabel =
    document.querySelector(
      '#current-language'
    );




  langButtons.forEach(

    (button) => {


      button.addEventListener(

        'click',

        () => {


          const lang =
            button.dataset.lang;




          if (
            langLabel
          ) {

            langLabel.textContent =
              lang === 'ja'
                ? '日本語'
                : 'English';

          }

        }

      );

    }

  );






  // =========================================================
  // Participant Pool
  // =========================================================


  const participantSearch =
    document.querySelector(
      '#participant-search'
    );


  const participantSchoolFilter =
    document.querySelector(
      '#participant-school-filter'
    );




  function filterParticipants() {


    const query =
      participantSearch
        ?.value
        .trim()
        .toLowerCase() ||
      '';




    const schoolId =
      participantSchoolFilter
        ?.value ||
      '';




    document
      .querySelectorAll(
        '.participant-row'
      )
      .forEach(

        (row) => {


          const text =
            row.dataset
              .participantSearch ||
            '';




          const rowSchool =
            row.dataset
              .schoolId ||
            '';




          const matchesSearch =
            text.includes(
              query
            );




          const matchesSchool =
            !schoolId ||
            rowSchool ===
              schoolId;




          row.style.display =
            matchesSearch &&
            matchesSchool
              ? ''
              : 'none';

        }

      );

  }




  participantSearch
    ?.addEventListener(
      'input',
      filterParticipants
    );




  participantSchoolFilter
    ?.addEventListener(
      'change',
      filterParticipants
    );






  // =========================================================
  // Add School
  // =========================================================


  const addSchoolButton =
    document.querySelector(
      '#add-school-button'
    );


  const schoolFormWrapper =
    document.querySelector(
      '#add-school-form-wrapper'
    );


  const cancelSchoolButton =
    document.querySelector(
      '#cancel-school-button'
    );




  if (
    addSchoolButton &&
    schoolFormWrapper
  ) {


    addSchoolButton
      .addEventListener(

        'click',

        () => {


          schoolFormWrapper
            .classList
            .remove(
              'hidden'
            );


          addSchoolButton
            .classList
            .add(
              'hidden'
            );

        }

      );

  }




  if (
    cancelSchoolButton &&
    schoolFormWrapper
  ) {


    cancelSchoolButton
      .addEventListener(

        'click',

        () => {


          schoolFormWrapper
            .classList
            .add(
              'hidden'
            );


          addSchoolButton
            ?.classList
            .remove(
              'hidden'
            );

        }

      );

  }




  const addSchoolForm =
    document.querySelector(
      '#add-school-form'
    );




  if (
    addSchoolForm
  ) {


    addSchoolForm
      .addEventListener(

        'submit',

        async (
          event
        ) => {


          event.preventDefault();




          const message =
            document.querySelector(
              '#school-form-message'
            );




          const saveButton =
            document.querySelector(
              '#save-school-button'
            );




          const languages =
            document
              .querySelector(
                '#school-languages'
              )
              .value
              .split(
                ','
              )
              .map(

                (item) =>
                  item.trim()

              )
              .filter(
                Boolean
              );




          const school = {


            name:

              document
                .querySelector(
                  '#school-name'
                )
                .value
                .trim(),




            country_name:

              document
                .querySelector(
                  '#school-country-name'
                )
                .value
                .trim(),




            country_code:

              document
                .querySelector(
                  '#school-country-code'
                )
                .value
                .trim()
                .toUpperCase(),




            city:

              document
                .querySelector(
                  '#school-city'
                )
                .value
                .trim(),




            timezone:

              document
                .querySelector(
                  '#school-timezone'
                )
                .value
                .trim(),




            languages,




            introduction:

              document
                .querySelector(
                  '#school-introduction'
                )
                .value
                .trim(),




            website_url:

              document
                .querySelector(
                  '#school-website'
                )
                .value
                .trim(),

          };




          if (
            message
          ) {

            message.textContent =
              'Saving school...';

          }




          if (
            saveButton
          ) {

            saveButton.disabled =
              true;


            saveButton.textContent =
              'Saving...';

          }




          try {


            await addSchool(
              school
            );




            if (
              message
            ) {

              message.textContent =
                '✓ School saved successfully';

            }




            await renderApp();


          } catch (error) {


            console.error(
              'Add school error:',
              error
            );




            if (
              message
            ) {


              if (
                error?.code ===
                '23505'
              ) {

                message.textContent =
                  'This school is already registered.';


              } else {


                message.textContent =
                  error?.message ||
                  'Could not save the school.';

              }

            }




            if (
              saveButton
            ) {

              saveButton.disabled =
                false;


              saveButton.textContent =
                'Save School';

            }

          }

        }

      );

  }






  // =========================================================
  // School Profile
  // =========================================================


  const profileButtons =
    document.querySelectorAll(
      '.school-profile-button'
    );


  const profileModal =
    document.querySelector(
      '#school-profile-modal'
    );


  const closeProfileButton =
    document.querySelector(
      '#close-school-profile'
    );




  profileButtons.forEach(

    (button) => {


      button.addEventListener(

        'click',

        async () => {


          const schoolId =
            button.dataset
              .schoolId;




          try {


            const school =
              await getSchoolById(
                schoolId
              );




            document.querySelector(
              '#edit-school-id'
            ).value =
              school.id;




            document.querySelector(
              '#profile-school-name'
            ).textContent =
              school.name;




            document.querySelector(
              '#edit-school-name'
            ).value =
              school.name ||
              '';




            document.querySelector(
              '#edit-school-country-name'
            ).value =
              school.country_name ||
              '';




            document.querySelector(
              '#edit-school-country-code'
            ).value =
              school.country_code ||
              '';




            document.querySelector(
              '#edit-school-city'
            ).value =
              school.city ||
              '';




            document.querySelector(
              '#edit-school-timezone'
            ).value =
              school.timezone ||
              '';




            document.querySelector(
              '#edit-school-languages'
            ).value =

              Array.isArray(
                school.languages
              )

                ? school.languages.join(
                    ', '
                  )

                : '';




            document.querySelector(
              '#edit-school-introduction'
            ).value =
              school.introduction ||
              '';




            document.querySelector(
              '#edit-school-website'
            ).value =
              school.website_url ||
              '';




            profileModal
              ?.classList
              .remove(
                'hidden'
              );


          } catch (error) {


            console.error(
              'School profile error:',
              error
            );

          }

        }

      );

    }

  );




  closeProfileButton
    ?.addEventListener(

      'click',

      () => {


        profileModal
          ?.classList
          .add(
            'hidden'
          );

      }

    );




  const editSchoolForm =
    document.querySelector(
      '#edit-school-form'
    );




  if (
    editSchoolForm
  ) {


    editSchoolForm
      .addEventListener(

        'submit',

        async (
          event
        ) => {


          event.preventDefault();




          const id =
            document.querySelector(
              '#edit-school-id'
            ).value;




          const languages =
            document
              .querySelector(
                '#edit-school-languages'
              )
              .value
              .split(
                ','
              )
              .map(

                (item) =>
                  item.trim()

              )
              .filter(
                Boolean
              );




          const updates = {


            name:

              document
                .querySelector(
                  '#edit-school-name'
                )
                .value
                .trim(),




            country_name:

              document
                .querySelector(
                  '#edit-school-country-name'
                )
                .value
                .trim(),




            country_code:

              document
                .querySelector(
                  '#edit-school-country-code'
                )
                .value
                .trim()
                .toUpperCase(),




            city:

              document
                .querySelector(
                  '#edit-school-city'
                )
                .value
                .trim(),




            timezone:

              document
                .querySelector(
                  '#edit-school-timezone'
                )
                .value
                .trim(),




            languages,




            introduction:

              document
                .querySelector(
                  '#edit-school-introduction'
                )
                .value
                .trim(),




            website_url:

              document
                .querySelector(
                  '#edit-school-website'
                )
                .value
                .trim(),

          };




          const message =
            document.querySelector(
              '#edit-school-message'
            );




          try {


            await updateSchool(
              id,
              updates
            );




            if (
              message
            ) {

              message.textContent =
                '✓ School profile updated';

            }




            await renderApp();


          } catch (error) {


            console.error(
              error
            );




            if (
              message
            ) {

              message.textContent =
                error.message;

            }

          }

        }

      );

  }




  const deleteSchoolButton =
    document.querySelector(
      '#delete-school-button'
    );




  deleteSchoolButton
    ?.addEventListener(

      'click',

      async () => {


        const id =
          document.querySelector(
            '#edit-school-id'
          ).value;




        const schoolName =
          document.querySelector(
            '#edit-school-name'
          ).value;




        const confirmed =
          window.confirm(

            `Delete "${schoolName}" from the School Library?`

          );




        if (
          !confirmed
        ) {

          return;

        }




        try {


          await deleteSchool(
            id
          );




          await renderApp();


        } catch (error) {


          console.error(
            'Delete school error:',
            error
          );

        }

      }

    );






  // =========================================================
  // Teacher Database
  // =========================================================


  const addTeacherButton =
    document.querySelector(
      '#add-teacher-button'
    );


  const addTeacherPanel =
    document.querySelector(
      '#add-teacher-panel'
    );


  const cancelTeacherButton =
    document.querySelector(
      '#cancel-teacher-button'
    );




  addTeacherButton
    ?.addEventListener(

      'click',

      () => {


        addTeacherPanel
          ?.classList
          .remove(
            'hidden'
          );


        addTeacherButton
          .classList
          .add(
            'hidden'
          );

      }

    );




  cancelTeacherButton
    ?.addEventListener(

      'click',

      () => {


        addTeacherPanel
          ?.classList
          .add(
            'hidden'
          );


        addTeacherButton
          ?.classList
          .remove(
            'hidden'
          );

      }

    );




  const facilitatorCheck =
    document.querySelector(
      '#teacher-can-facilitate'
    );


  const facilitatorTopicsField =
    document.querySelector(
      '#facilitator-topics-field'
    );




  facilitatorCheck
    ?.addEventListener(

      'change',

      () => {


        facilitatorTopicsField
          ?.classList
          .toggle(

            'hidden',

            !facilitatorCheck.checked

          );

      }

    );




  const teacherPhotoInput =
    document.querySelector(
      '#teacher-photo'
    );


  const teacherPhotoPreview =
    document.querySelector(
      '#teacher-photo-preview'
    );




  teacherPhotoInput
    ?.addEventListener(

      'change',

      () => {


        const file =
          teacherPhotoInput
            .files?.[0];




        if (
          !file
        ) {

          return;

        }




        if (
          file.size >
          5 *
          1024 *
          1024
        ) {


          alert(
            'Photo must be 5MB or smaller.'
          );


          teacherPhotoInput.value =
            '';


          return;

        }




        const previewUrl =
          URL.createObjectURL(
            file
          );




        if (
          teacherPhotoPreview
        ) {


          teacherPhotoPreview.innerHTML = `

            <img
              src="${previewUrl}"
              alt="Teacher preview"
            />

          `;

        }

      }

    );




  const teacherSearch =
    document.querySelector(
      '#teacher-search'
    );




  teacherSearch
    ?.addEventListener(

      'input',

      () => {


        const query =
          teacherSearch
            .value
            .trim()
            .toLowerCase();




        document
          .querySelectorAll(
            '.teacher-card'
          )
          .forEach(

            (card) => {


              const text =
                card.dataset
                  .teacherSearch ||
                '';




              card.style.display =
                text.includes(
                  query
                )

                  ? ''

                  : 'none';

            }

          );

      }

    );




  const addTeacherForm =
    document.querySelector(
      '#add-teacher-form'
    );




  addTeacherForm
    ?.addEventListener(

      'submit',

      async (
        event
      ) => {


        event.preventDefault();




        const message =
          document.querySelector(
            '#teacher-form-message'
          );




        const saveButton =
          document.querySelector(
            '#save-teacher-button'
          );




        const languages =
          document
            .querySelector(
              '#teacher-languages'
            )
            .value
            .split(
              ','
            )
            .map(

              (value) =>
                value.trim()

            )
            .filter(
              Boolean
            );




        const canFacilitate =
          document
            .querySelector(
              '#teacher-can-facilitate'
            )
            .checked;




        const facilitatorTopics =
          canFacilitate

            ? document
                .querySelector(
                  '#teacher-facilitator-topics'
                )
                .value
                .split(
                  ','
                )
                .map(

                  (value) =>
                    value.trim()

                )
                .filter(
                  Boolean
                )

            : [];




        const teacherData = {


          display_name:

            document
              .querySelector(
                '#teacher-name'
              )
              .value
              .trim(),




          school_id:

            document
              .querySelector(
                '#teacher-school'
              )
              .value,




          email:

            document
              .querySelector(
                '#teacher-email'
              )
              .value
              .trim() ||
            null,




          job_title:

            document
              .querySelector(
                '#teacher-job-title'
              )
              .value
              .trim() ||
            null,




          languages,




          can_facilitate:
            canFacilitate,




          facilitator_topics:
            facilitatorTopics,




          is_main_coordinator:

            document
              .querySelector(
                '#teacher-main-coordinator'
              )
              .checked,




          bio:

            document
              .querySelector(
                '#teacher-bio'
              )
              .value
              .trim() ||
            null,

        };




        if (
          message
        ) {

          message.textContent =
            'Saving teacher...';

        }




        if (
          saveButton
        ) {


          saveButton.disabled =
            true;


          saveButton.textContent =
            'Saving...';

        }




        try {


          const teacher =
            await addTeacher(
              teacherData
            );




          const photoFile =
            teacherPhotoInput
              ?.files?.[0];




          if (
            photoFile
          ) {


            const photoPath =
              await uploadTeacherPhoto(

                teacher.id,

                photoFile

              );




            await updateTeacher(

              teacher.id,

              {

                photo_path:
                  photoPath,

              }

            );

          }




          if (
            message
          ) {

            message.textContent =
              '✓ Teacher saved successfully';

          }




          await renderApp();


        } catch (error) {


          console.error(
            'Add teacher error:',
            error
          );




          if (
            message
          ) {


            message.textContent =

              error?.message ||
              'Could not save teacher.';

          }




          if (
            saveButton
          ) {


            saveButton.disabled =
              false;


            saveButton.textContent =
              'Save Teacher';

          }

        }

      }

    );






  // =========================================================
  // Pending Registrations
  // =========================================================


  document
    .querySelectorAll(
      '.approve-registration-button'
    )
    .forEach(

      (button) => {


        button.addEventListener(

          'click',

          async () => {


            const requestId =
              button.dataset
                .requestId;




            const confirmed =
              window.confirm(
                'Approve this registration?'
              );




            if (
              !confirmed
            ) {

              return;

            }




            button.disabled =
              true;


            button.textContent =
              'Approving...';




            try {


              const result =
                await approveRegistrationRequest(
                  requestId
                );




              console.log(
                'Registration approved:',
                result
              );




              await renderApp();


            } catch (error) {


              console.error(
                'Approve error:',
                error
              );




              alert(

                error?.message ||
                'Could not approve registration.'

              );




              button.disabled =
                false;


              button.textContent =
                'Approve';

            }

          }

        );

      }

    );




  document
    .querySelectorAll(
      '.reject-registration-button'
    )
    .forEach(

      (button) => {


        button.addEventListener(

          'click',

          async () => {


            const requestId =
              button.dataset
                .requestId;




            const confirmed =
              window.confirm(
                'Reject this registration?'
              );




            if (
              !confirmed
            ) {

              return;

            }




            try {


              await rejectRegistrationRequest(
                requestId
              );




              await renderApp();


            } catch (error) {


              console.error(
                'Reject error:',
                error
              );




              alert(

                error?.message ||
                'Could not reject registration.'

              );

            }

          }

        );

      }

    );






  // =========================================================
  // Login
  // =========================================================


  const loginForm =
    document.querySelector(
      '#login-form'
    );




  if (
    loginForm
  ) {


    console.log(
      '✅ Login form connected'
    );




    loginForm
      .addEventListener(

        'submit',

        async (
          event
        ) => {


          event.preventDefault();




          console.log(
            '🔐 Login submitted'
          );




          const emailInput =
            document.querySelector(
              '#login-email'
            );


          const passwordInput =
            document.querySelector(
              '#login-password'
            );


          const message =
            document.querySelector(
              '#login-message'
            );


          const submitButton =
            loginForm.querySelector(
              'button[type="submit"]'
            );




          const email =
            emailInput
              ?.value
              .trim();




          const password =
            passwordInput
              ?.value;




          if (
            !email ||
            !password
          ) {


            if (
              message
            ) {

              message.textContent =
                'Please enter your email and password.';

            }


            return;

          }




          if (
            message
          ) {

            message.textContent =
              'Signing in...';

          }




          if (
            submitButton
          ) {


            submitButton.disabled =
              true;


            submitButton.textContent =
              'Signing in...';

          }




          try {


            const result =
              await signIn(

                email,

                password

              );




            console.log(
              '✅ Login successful:',
              result
            );




            if (
              message
            ) {

              message.textContent =
                '✓ Signed in successfully';

            }




            window.location.hash =
              '#/dashboard';


          } catch (error) {


            console.error(
              '❌ Login error:',
              error
            );




            if (
              message
            ) {


              message.textContent =

                error?.message ||
                'Email or password is incorrect.';

            }


          } finally {


            if (
              submitButton
            ) {


              submitButton.disabled =
                false;


              submitButton.textContent =
                'Sign In';

            }

          }

        }

      );

  }






  // =========================================================
  // Public Teacher Registration
  // =========================================================


  const registrationForm =
    document.querySelector(
      '#public-registration-form'
    );




  if (
    registrationForm
  ) {


    const schoolSelect =
      document.querySelector(
        '#registration-school'
      );


    const newSchoolSection =
      document.querySelector(
        '#new-school-registration'
      );




    const updateSchoolFields =
      () => {


        newSchoolSection
          ?.classList
          .toggle(

            'hidden',

            Boolean(
              schoolSelect?.value
            )

          );

      };




    schoolSelect
      ?.addEventListener(

        'change',

        updateSchoolFields

      );




    updateSchoolFields();




    const facilitator =
      document.querySelector(
        '#registration-facilitator'
      );


    const facilitatorField =
      document.querySelector(
        '#registration-facilitator-topics-field'
      );




    facilitator
      ?.addEventListener(

        'change',

        () => {


          facilitatorField
            ?.classList
            .toggle(

              'hidden',

              !facilitator.checked

            );

        }

      );






    // ---------------------------------------------------------
    // Student Rows
    // ---------------------------------------------------------


    const studentList =
      document.querySelector(
        '#registration-student-list'
      );


    const addStudentButton =
      document.querySelector(
        '#registration-add-student'
      );




    let studentNumber =
      0;




    function addStudentRow() {


      studentNumber +=
        1;




      const row =
        document.createElement(
          'div'
        );




      row.className =
        'registration-student-row';




      row.innerHTML = `

        <span
          class="student-number"
        >
          ${studentNumber}
        </span>


        <input
          class="input registration-student-name"
          type="text"
          placeholder="Student display name"
        />


        <select
          class="input registration-student-grade"
        >

          <option value="">
            Grade
          </option>

          <option value="Grade 7">
            Grade 7
          </option>

          <option value="Grade 8">
            Grade 8
          </option>

          <option value="Grade 9">
            Grade 9
          </option>

          <option value="Grade 10">
            Grade 10
          </option>

          <option value="Grade 11">
            Grade 11
          </option>

          <option value="Grade 12">
            Grade 12
          </option>

        </select>


        <button
          class="student-remove-button"
          type="button"
        >
          Remove
        </button>

      `;




      row
        .querySelector(
          '.student-remove-button'
        )
        ?.addEventListener(

          'click',

          () => {


            row.remove();

          }

        );




      studentList
        ?.appendChild(
          row
        );

    }




    addStudentButton
      ?.addEventListener(

        'click',

        addStudentRow

      );




    addStudentRow();

    addStudentRow();

    addStudentRow();






    // ---------------------------------------------------------
    // Submit Registration
    // ---------------------------------------------------------


    registrationForm
      .addEventListener(

        'submit',

        async (
          event
        ) => {


          event.preventDefault();




          const message =
            document.querySelector(
              '#registration-message'
            );




          const submitButton =
            document.querySelector(
              '#registration-submit'
            );




          const students =
            Array
              .from(

                document
                  .querySelectorAll(
                    '.registration-student-row'
                  )

              )
              .map(

                (row) => ({


                  name:

                    row
                      .querySelector(
                        '.registration-student-name'
                      )
                      .value
                      .trim(),




                  grade:

                    row
                      .querySelector(
                        '.registration-student-grade'
                      )
                      .value,

                })

              )
              .filter(

                (student) =>
                  student.name

              );




          if (
            students.length ===
            0
          ) {


            if (
              message
            ) {

              message.textContent =
                'Please add at least one student.';

            }


            return;

          }




          const teacherLanguages =
            document
              .querySelector(
                '#registration-teacher-languages'
              )
              .value
              .split(
                ','
              )
              .map(

                (value) =>
                  value.trim()

              )
              .filter(
                Boolean
              );




          const canFacilitate =
            Boolean(
              facilitator?.checked
            );




          const facilitatorTopics =
            canFacilitate

              ? document
                  .querySelector(
                    '#registration-facilitator-topics'
                  )
                  .value
                  .split(
                    ','
                  )
                  .map(

                    (value) =>
                      value.trim()

                  )
                  .filter(
                    Boolean
                  )

              : [];




          const registration = {


            invite_code:

              document
                .querySelector(
                  '#registration-invite-code'
                )
                .value
                .trim(),




            school_id:

              schoolSelect
                ?.value ||
              null,




            new_school_name:

              schoolSelect
                ?.value

                ? null

                : document
                    .querySelector(
                      '#registration-new-school'
                    )
                    .value
                    .trim(),




            new_school_country:

              schoolSelect
                ?.value

                ? null

                : document
                    .querySelector(
                      '#registration-country'
                    )
                    .value
                    .trim(),




            new_school_city:

              schoolSelect
                ?.value

                ? null

                : document
                    .querySelector(
                      '#registration-city'
                    )
                    .value
                    .trim(),




            teacher_name:

              document
                .querySelector(
                  '#registration-teacher-name'
                )
                .value
                .trim(),




            teacher_email:

              document
                .querySelector(
                  '#registration-teacher-email'
                )
                .value
                .trim(),




            teacher_languages:
              teacherLanguages,




            participation_style:

              document
                .querySelector(
                  '#registration-participation-style'
                )
                .value,




            can_facilitate:
              canFacilitate,




            facilitator_topics:
              facilitatorTopics,




            students,




            notes:

              document
                .querySelector(
                  '#registration-notes'
                )
                .value
                .trim() ||
              null,

          };




          if (
            submitButton
          ) {


            submitButton.disabled =
              true;


            submitButton.textContent =
              'Submitting...';

          }




          if (
            message
          ) {

            message.textContent =
              'Sending registration...';

          }




          try {


            await submitRegistration(
              registration
            );




            registrationForm.reset();




            if (
              studentList
            ) {

              studentList.innerHTML =
                '';

            }




            studentNumber =
              0;




            addStudentRow();

            addStudentRow();

            addStudentRow();




            updateSchoolFields();




            facilitatorField
              ?.classList
              .add(
                'hidden'
              );




            if (
              message
            ) {

              message.textContent =
                '✓ Registration received. The host will review your information.';

            }


          } catch (error) {


            console.error(
              'Registration error:',
              error
            );




            if (
              message
            ) {


              if (
                error?.code ===
                '42501'
              ) {


                message.textContent =
                  'Invitation code is invalid or no longer active.';


              } else {


                message.textContent =

                  error?.message ||
                  'Could not submit registration.';

              }

            }


          } finally {


            if (
              submitButton
            ) {


              submitButton.disabled =
                false;


              submitButton.textContent =
                'Submit Registration';

            }

          }

        }

      );

  }

}




export async function renderApp() {


  const route =
    getCurrentRoute();




  const app =
    document.querySelector(
      '#app'
    );




  if (
    !app
  ) {

    return;

  }




  if (
    route ===
    'login'
  ) {


    app.innerHTML = `

      <main
        id="page-content"
        class="page-content"
      ></main>

    `;


  } else {


    app.innerHTML = `

      <div class="app-shell">


        ${Sidebar(
          route
        )}


        <div class="main-shell">


          ${Header(
            route
          )}


          <main
            id="page-content"
            class="page-content"
          ></main>


        </div>


      </div>

    `;

  }




  await renderCurrentPage(
    route
  );




  bindUiEvents();

}




// =========================================================
// Supabase connection check
// =========================================================


if (
  supabase
) {


  supabase
    .auth
    .getSession()
    .then(

      ({
        error
      }) => {


        if (
          error
        ) {


          console.error(

            '❌ Supabase connection error:',

            error.message

          );


        } else {


          console.log(

            '✅ Global Classroom Connect connected to Supabase'

          );

        }

      }

    );

}