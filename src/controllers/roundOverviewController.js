import {
  getRoundOverview,
} from '../services/roomService.js';


import {
  renderRoundOverviewContent,
} from '../pages/host/RoundOverviewPage.js';



// =========================================================
// Round Overview Controller
// =========================================================

export function bindRoundOverview() {

  const eventSelect =
    document.querySelector(
      '#round-overview-event'
    );


  const overviewContent =
    document.querySelector(
      '#round-overview-content'
    );


  const overviewStatus =
    document.querySelector(
      '#round-overview-status'
    );


  // Round Overviewページでなければ終了
  if (
    !eventSelect ||
    !overviewContent
  ) {

    return;

  }



  // =======================================================
  // Event Change
  // =======================================================

  eventSelect
    .addEventListener(
      'change',
      async () => {

        const eventId =
          eventSelect.value;


        if (!eventId) {

          overviewContent.innerHTML = `

            <div class="empty-state">

              <h3>
                Select an event
              </h3>

            </div>

          `;


          return;

        }


        if (
          overviewStatus
        ) {

          overviewStatus.textContent =
            'Loading saved rounds...';

        }


        try {

          const rounds =
            await getRoundOverview(
              eventId
            );


          overviewContent.innerHTML =
            renderRoundOverviewContent(
              rounds
            );


          if (
            overviewStatus
          ) {

            overviewStatus.textContent =
              `Comparing ${rounds.length} saved round${
                rounds.length === 1
                  ? ''
                  : 's'
              }.`;

          }


        } catch (error) {

          console.error(
            'Round Overview error:',
            error
          );


          overviewContent.innerHTML = `

            <div class="empty-state">

              <h3>
                Could not load Round Overview
              </h3>

              <p class="muted">
                Please check the browser console.
              </p>

            </div>

          `;


          if (
            overviewStatus
          ) {

            overviewStatus.textContent =
              error?.message ||
              'Could not load saved rounds.';

          }

        }

      }
    );

}