import { supabase } from './services/supabase.js';

import {
  addSchool,
  getSchoolById,
  updateSchool,
  deleteSchool,
} from './services/schoolService.js';

import {
  bindRoundOverview,
} from './controllers/roundOverviewController.js';

import {
  bindRoomBuilder,
} from './controllers/roomBuilderController.js';

import {
  bindEventManagement,
} from './controllers/eventController.js';

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
  submitRegistration,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from './services/registrationService.js';

import {
  signIn,
  getCurrentProfile,
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
} from './pages/host/RoomsPage.js';

import {
  RoundOverviewPage,
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

const publicRoutes =
  new Set([
    'login',
    'registration',
  ]);


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
  // Round Overview
  // =========================================================

  bindRoundOverview();


  // =========================================================
  // Room Builder
  // =========================================================

  bindRoomBuilder();


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

    const newSchoolNameInput =
  document.querySelector(
    '#registration-new-school'
  );


const newSchoolCountryInput =
  document.querySelector(
    '#registration-country'
  );


    const updateSchoolFields =
  () => {

    const hasExistingSchool =
      Boolean(
        schoolSelect?.value
      );


    newSchoolSection
      ?.classList
      .toggle(
        'hidden',
        hasExistingSchool
      );


    if (
      newSchoolNameInput
    ) {

      newSchoolNameInput.required =
        !hasExistingSchool;

    }


    if (
      newSchoolCountryInput
    ) {

      newSchoolCountryInput.required =
        !hasExistingSchool;

    }

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

<option value="Grade 1">
  Grade 1
</option>

<option value="Grade 2">
  Grade 2
</option>

<option value="Grade 3">
  Grade 3
</option>

<option value="Grade 4">
  Grade 4
</option>

<option value="Grade 5">
  Grade 5
</option>

<option value="Grade 6">
  Grade 6
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

<option value="Other">
  Other
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




            registrationForm.innerHTML = `

  <div
    class="registration-success"
  >

    <div
      class="registration-success-icon"
    >
      ✓
    </div>


    <p class="eyebrow">
      GLOBAL CLASSROOM CONNECT
    </p>


    <h2>
      Registration Complete!
    </h2>


    <p class="registration-success-lead">
      Thank you for joining
      Global Classroom.
    </p>


    <p class="muted">
      Your registration has been
      successfully received.
      The host will review your school,
      teacher, and student information.
    </p>


    <div class="registration-success-next">

      <strong>
        What happens next?
      </strong>

      <p>
        Once your registration is reviewed,
        your school and participants will be
        added to the Global Classroom network.
      </p>

    </div>


    <p class="muted">
      You may now close this page.
    </p>


    <button
      id="registration-another-button"
      class="secondary-button"
      type="button"
    >
      Submit Another Registration
    </button>

  </div>

`;


const anotherButton =
  document.querySelector(
    '#registration-another-button'
  );


anotherButton
  ?.addEventListener(
    'click',
    async () => {

      await renderApp();

    }
  );


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
  submitButton?.isConnected
) {

  submitButton.disabled =
    false;


  submitButton.textContent =
    '🌍 Submit Registration';

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


  if (!app) {
    return;
  }


  // =========================================================
  // Route Access Control
  // =========================================================

  const isPublicRoute =
    publicRoutes.has(
      route
    );


  if (
    !isPublicRoute
  ) {

    const profile =
      await getCurrentProfile();


    if (
      !profile ||
      profile.role !== 'host'
    ) {

      window.location.hash =
        '#/login';


      return;

    }

  }


  // =========================================================
  // Public Layout
  // =========================================================

  if (
    route === 'login' ||
    route === 'registration'
  ) {

    app.innerHTML = `

      <main
        id="page-content"
        class="page-content public-page-content"
      ></main>

    `;

  }


  // =========================================================
  // Host Layout
  // =========================================================

  else {

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