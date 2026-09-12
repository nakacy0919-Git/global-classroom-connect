import {
  buildRoomPlan,
} from '../services/roomBuilderService.js';


import {
  saveRoomPlan,
} from '../services/roomService.js';


import {
  renderRoomPlan,
} from '../pages/host/RoomsPage.js';



let currentRoomPlan = null;



// =========================================================
// Helpers
// =========================================================

function canTryAnotherMix(
  plan
) {

  if (
    !plan ||
    !plan.signature
  ) {

    return false;

  }


  if (
    !Array.isArray(
      plan.rooms
    ) ||
    plan.rooms.length <= 1
  ) {

    return false;

  }


  return (
    plan.participantCount >
    plan.roomCount
  );

}



function isPlanAtLeastAsGood(
  candidate,
  current
) {

  const candidateQuality =
    candidate?.quality;

  const currentQuality =
    current?.quality;


  if (
    !candidateQuality ||
    !currentQuality
  ) {

    return false;

  }


  if (
    candidateQuality.diversityScore !==
    currentQuality.diversityScore
  ) {

    return (
      candidateQuality.diversityScore >
      currentQuality.diversityScore
    );

  }


  if (
    candidateQuality.repeatedPairs !==
    currentQuality.repeatedPairs
  ) {

    return (
      candidateQuality.repeatedPairs <
      currentQuality.repeatedPairs
    );

  }


  if (
    candidateQuality.sameSchoolPairs !==
    currentQuality.sameSchoolPairs
  ) {

    return (
      candidateQuality.sameSchoolPairs <
      currentQuality.sameSchoolPairs
    );

  }


  if (
    candidateQuality.sameCountryPairs !==
    currentQuality.sameCountryPairs
  ) {

    return (
      candidateQuality.sameCountryPairs <
      currentQuality.sameCountryPairs
    );

  }


  return (
    candidateQuality.facilitatorCoverage >=
    currentQuality.facilitatorCoverage
  );

}



// =========================================================
// Main Controller
// =========================================================

export function bindRoomBuilder() {

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


  const generatedRoomGrid =
    document.querySelector(
      '#generated-room-grid'
    );


  const roomBuilderStatus =
    document.querySelector(
      '#room-builder-status'
    );


  const qualityDashboard =
    document.querySelector(
      '#room-quality-dashboard'
    );


  const qualityScore =
    document.querySelector(
      '#quality-diversity-score'
    );


  const qualityRepeated =
    document.querySelector(
      '#quality-repeated-pairs'
    );


  const qualitySchool =
    document.querySelector(
      '#quality-school-conflicts'
    );


  const qualityCountry =
    document.querySelector(
      '#quality-country-mix'
    );


  const qualityFacilitator =
    document.querySelector(
      '#quality-facilitator-coverage'
    );


  const qualityFeedback =
    document.querySelector(
      '#room-quality-feedback'
    );



  // PageがRoom Builderでなければ終了
  if (
    !generateRoomsButton
  ) {

    return;

  }



  // =======================================================
  // Quality Dashboard
  // =======================================================

  function renderQualityDashboard(
    plan
  ) {

    const quality =
      plan?.quality;


    if (
      !quality ||
      !qualityDashboard
    ) {

      return;

    }


    qualityDashboard
      .classList
      .remove(
        'hidden'
      );


    if (qualityScore) {

      qualityScore.textContent =
        `${quality.diversityScore}%`;

    }


    if (qualityRepeated) {

      qualityRepeated.textContent =
        quality.repeatedPairs;

    }


    if (qualitySchool) {

      qualitySchool.textContent =
        quality.sameSchoolPairs;

    }


    if (qualityCountry) {

      qualityCountry.textContent =
        quality.countryMix;

    }


    if (qualityFacilitator) {

      qualityFacilitator.textContent =
        `${quality.facilitatorCoverage}%`;

    }


    if (
      qualityFeedback
    ) {

      qualityFeedback.innerHTML =
        (
          quality.feedback ||
          []
        )
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

                  <span>
                    ${item.message}
                  </span>

                </div>

              `;

            }
          )
          .join('');

    }

  }



  // =======================================================
  // Try Another Mix Button
  // =======================================================

  function updateTryAnotherMixButton(
    plan
  ) {

    if (
      !tryAnotherMixButton
    ) {

      return;

    }


    const enabled =
      canTryAnotherMix(
        plan
      );


    tryAnotherMixButton.disabled =
      !enabled;


    tryAnotherMixButton.textContent =
      '🔀 Try Another Mix';

  }



  // =======================================================
  // Invalidate Plan
  // =======================================================

  function invalidateRoomPlan() {

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
      generatedRoomGrid
    ) {

      generatedRoomGrid.innerHTML =
        '';

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



  // =======================================================
  // Generate Rooms
  // =======================================================

  generateRoomsButton
    .addEventListener(
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

        }


        if (
          tryAnotherMixButton
        ) {

          tryAnotherMixButton.disabled =
            true;

        }


        generateRoomsButton.disabled =
          true;


        generateRoomsButton.textContent =
          'Generating...';


        if (
          roomBuilderStatus
        ) {

          roomBuilderStatus.textContent =
            roundNumber > 1

              ? `Checking previous rounds and generating Round ${roundNumber}...`

              : 'Mixing schools and countries...';

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


          console.error(
            'Room generation error:',
            error
          );


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



  // =======================================================
  // Try Another Mix
  // =======================================================

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

            roomBuilderStatus.innerHTML =
              newScore >
              previousScore

                ? `

                  ✓ Better mix found!

                  <strong>
                    ${previousScore}%
                    →
                    ${newScore}%
                  </strong>

                  <br>

                  ${alternative.attemptsTried}
                  candidate combinations checked.

                `

                : `

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


          if (
            saveRoomPlanButton
          ) {

            saveRoomPlanButton.disabled =
              false;

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



  // =======================================================
  // Save Round
  // =======================================================

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
                ✓ Round ${roundNumber}
                saved to Supabase.
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

}