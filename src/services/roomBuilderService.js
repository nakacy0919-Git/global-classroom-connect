import {
  getParticipantsByEvent,
} from './participantService.js';

import {
  getTeachers,
} from './teacherService.js';

import {
  getPreviousRoommateCounts,
  getParticipantPairKey,
} from './roomService.js';


// =========================================================
// Relation Helper
// =========================================================

function oneRelation(value) {

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}


// =========================================================
// School / Country Helpers
// =========================================================

function getParticipantSchool(
  participant
) {

  return oneRelation(
    participant.schools
  );
}


function getTeacherSchool(
  teacher
) {

  return oneRelation(
    teacher.schools
  );
}


function getSchoolKey(
  participant
) {

  return (
    participant.school_id ||
    getParticipantSchool(
      participant
    )?.id ||
    'unknown-school'
  );
}


function getCountryKey(
  participant
) {

  return (
    getParticipantSchool(
      participant
    )?.country_code ||
    'unknown-country'
  );
}


// =========================================================
// Previous Roommate Penalty
// =========================================================

function getPreviousRoommatePenalty(
  room,
  participant,
  previousRoommateCounts
) {

  let penalty = 0;


  room.participants.forEach(
    (member) => {

      const pairKey =
        getParticipantPairKey(
          participant.id,
          member.id
        );


      if (!pairKey) {
        return;
      }


      penalty +=
        previousRoommateCounts.get(
          pairKey
        ) || 0;

    }
  );


  return penalty;
}


// =========================================================
// Room Score
// Lower score = better room
// =========================================================

function getRoomScore(
  room,
  participant,
  previousRoommateCounts
) {

  const schoolKey =
    getSchoolKey(
      participant
    );


  const countryKey =
    getCountryKey(
      participant
    );


  const sameSchoolCount =

    schoolKey ===
      'unknown-school'

      ? 0

      : room.participants
          .filter(
            (member) =>
              getSchoolKey(
                member
              ) ===
              schoolKey
          )
          .length;


  const sameCountryCount =

    countryKey ===
      'unknown-country'

      ? 0

      : room.participants
          .filter(
            (member) =>
              getCountryKey(
                member
              ) ===
              countryKey
          )
          .length;


  const previousRoommateCount =
    getPreviousRoommatePenalty(
      room,
      participant,
      previousRoommateCounts
    );


  return (

    // 1. 過去に同室だった人を最優先で避ける
    previousRoommateCount *
      10000

    +

    // 2. 同じ学校を分散
    sameSchoolCount *
      1000

    +

    // 3. 同じ国を分散
    sameCountryCount *
      30

    +

    // 4. Room人数を均等にする
    room.participants.length

  );
}


// =========================================================
// Random Shuffle Helper
// =========================================================

function shuffledCopy(
  items
) {

  const copy =
    [...items];


  for (
    let i =
      copy.length - 1;

    i > 0;

    i -= 1
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


    [
      copy[i],
      copy[j],
    ] = [
      copy[j],
      copy[i],
    ];

  }


  return copy;
}


// =========================================================
// Participant Distribution
// =========================================================

function distributeParticipants(
  participants,
  rooms,
  capacity,
  previousRoommateCounts,
  randomize = false
) {

  const schoolGroups =
    new Map();


  participants.forEach(
    (participant) => {

      const schoolKey =
        getSchoolKey(
          participant
        );


      if (
        !schoolGroups.has(
          schoolKey
        )
      ) {

        schoolGroups.set(
          schoolKey,
          []
        );

      }


      schoolGroups
        .get(
          schoolKey
        )
        .push(
          participant
        );

    }
  );


  // 人数が多い学校から配置
  // Try Another Mix時は、
  // 同人数の学校や生徒順をランダム化
  const groups =
    Array
      .from(
        schoolGroups.values()
      )
      .map(
        (group) => ({

          members:
            randomize
              ? shuffledCopy(
                  group
                )
              : [...group],

          tie:
            randomize
              ? Math.random()
              : 0,

        })
      )
      .sort(
        (a, b) => {

          const sizeDifference =
            b.members.length -
            a.members.length;


          if (
            sizeDifference !== 0
          ) {

            return sizeDifference;

          }


          return (
            a.tie -
            b.tie
          );

        }
      )
      .map(
        (item) =>
          item.members
      );


  groups.forEach(
    (group) => {


      group.forEach(
        (participant) => {


          const availableRooms =
            rooms.filter(
              (room) =>
                room.participants
                  .length <
                capacity
            );


          if (
            availableRooms.length ===
            0
          ) {

            return;

          }


          const rankedRooms =
            availableRooms
              .map(
                (room) => ({

                  room,

                  score:
                    getRoomScore(
                      room,
                      participant,
                      previousRoommateCounts
                    ),

                  tie:
                    randomize
                      ? Math.random()
                      : 0,

                })
              )
              .sort(
                (a, b) => {

                  const scoreDifference =
                    a.score -
                    b.score;


                  if (
                    scoreDifference !==
                    0
                  ) {

                    return (
                      scoreDifference
                    );

                  }


                  return (
                    a.tie -
                    b.tie
                  );

                }
              );


          const bestRoom =
            rankedRooms[0]
              .room;


          bestRoom
            .participants
            .push(
              participant
            );

        }
      );

    }
  );

}


// =========================================================
// Facilitator Score
// Lower score = better
// =========================================================

function facilitatorScore(
  facilitator,
  room
) {

  const facilitatorSchool =
    getTeacherSchool(
      facilitator
    );


  const facilitatorSchoolId =
    facilitator.school_id ||
    facilitatorSchool?.id;


  const facilitatorCountry =
    facilitatorSchool
      ?.country_code;


  let sameSchoolCount =
    0;


  let sameCountryCount =
    0;


  room.participants.forEach(
    (participant) => {

      const participantSchool =
        getParticipantSchool(
          participant
        );


      if (
        facilitatorSchoolId &&
        participant.school_id ===
          facilitatorSchoolId
      ) {

        sameSchoolCount +=
          1;

      }


      if (
        facilitatorCountry &&
        participantSchool
          ?.country_code ===
          facilitatorCountry
      ) {

        sameCountryCount +=
          1;

      }

    }
  );


  return (

    sameSchoolCount *
      100

    +

    sameCountryCount *
      5

  );
}


// =========================================================
// Facilitator Assignment
// =========================================================

function assignFacilitators(
  rooms,
  facilitators
) {

  const remaining =
    [...facilitators];


  rooms.forEach(
    (room) => {


      if (
        remaining.length ===
        0
      ) {

        room.facilitator =
          null;

        return;

      }


      const ranked =
        remaining
          .map(
            (
              facilitator,
              index
            ) => ({

              facilitator,

              index,

              score:
                facilitatorScore(
                  facilitator,
                  room
                ),

            })
          )
          .sort(
            (a, b) =>
              a.score -
              b.score
          );


      const selected =
        ranked[0];


      room.facilitator =
        selected.facilitator;


      remaining.splice(
        selected.index,
        1
      );

    }
  );


  return remaining;
}


// =========================================================
// Count repeated pairs in generated plan
// =========================================================

function countRepeatedPairs(
  rooms,
  previousRoommateCounts
) {

  let repeatedPairs =
    0;


  rooms.forEach(
    (room) => {

      const members =
        room.participants;


      for (
        let i = 0;
        i < members.length;
        i += 1
      ) {

        for (
          let j =
            i + 1;

          j < members.length;

          j += 1
        ) {

          const pairKey =
            getParticipantPairKey(
              members[i].id,
              members[j].id
            );


          if (
            pairKey &&
            previousRoommateCounts
              .has(
                pairKey
              )
          ) {

            repeatedPairs +=
              1;

          }

        }

      }

    }
  );


  return repeatedPairs;
}


// =========================================================
// Room Plan Quality Analysis
// =========================================================

function analyzeRoomPlan(
  rooms,
  previousRoommateCounts,
  roundNumber
) {

  let totalPairs =
    0;


  let sameSchoolPairs =
    0;


  let sameCountryPairs =
    0;


  let multiCountryRooms =
    0;


  rooms.forEach(
    (room) => {

      const participants =
        room.participants ||
        [];


      // ---------------------------------
      // Country Mix
      // ---------------------------------

      const countries =
        new Set(
          participants
            .map(
              (participant) =>
                getCountryKey(
                  participant
                )
            )
            .filter(
              (country) =>
                country !==
                'unknown-country'
            )
        );


      if (
        countries.size >=
        2
      ) {

        multiCountryRooms +=
          1;

      }


      // ---------------------------------
      // Pair Analysis
      // ---------------------------------

      for (
        let i = 0;
        i < participants.length;
        i += 1
      ) {

        for (
          let j =
            i + 1;

          j < participants.length;

          j += 1
        ) {

          totalPairs +=
            1;


          const participantA =
            participants[i];


          const participantB =
            participants[j];


          const schoolA =
            getSchoolKey(
              participantA
            );


          const schoolB =
            getSchoolKey(
              participantB
            );


          const countryA =
            getCountryKey(
              participantA
            );


          const countryB =
            getCountryKey(
              participantB
            );


          if (
            schoolA !==
              'unknown-school' &&
            schoolA ===
              schoolB
          ) {

            sameSchoolPairs +=
              1;

          }


          if (
            countryA !==
              'unknown-country' &&
            countryA ===
              countryB
          ) {

            sameCountryPairs +=
              1;

          }

        }

      }

    }
  );


  // ---------------------------------
  // Repeated Partners
  // ---------------------------------

  const repeatedPairs =
    countRepeatedPairs(
      rooms,
      previousRoommateCounts
    );


  // ---------------------------------
  // Facilitator Coverage
  // ---------------------------------

  const roomCount =
    rooms.length;


  const roomsWithFacilitator =
    rooms.filter(
      (room) =>
        room.facilitator
    ).length;


  const facilitatorCoverage =

    roomCount > 0

      ? roomsWithFacilitator /
        roomCount

      : 1;


  // ---------------------------------
  // Rates
  // ---------------------------------

  const repeatRate =

    totalPairs > 0

      ? repeatedPairs /
        totalPairs

      : 0;


  const schoolConflictRate =

    totalPairs > 0

      ? sameSchoolPairs /
        totalPairs

      : 0;


  const sameCountryRate =

    totalPairs > 0

      ? sameCountryPairs /
        totalPairs

      : 0;


  // ---------------------------------
  // Diversity Score
  // ---------------------------------

  let diversityScore =

    100

    -

    repeatRate *
      50

    -

    schoolConflictRate *
      25

    -

    sameCountryRate *
      15

    -

    (
      1 -
      facilitatorCoverage
    ) *
      10;


  diversityScore =
    Math.round(
      Math.max(
        0,
        Math.min(
          100,
          diversityScore
        )
      )
    );


  // ---------------------------------
  // Country Mix
  // ---------------------------------

  const countryMixRate =

    roomCount > 0

      ? multiCountryRooms /
        roomCount

      : 0;


  let countryMix =
    'Single-country';


  if (
    countryMixRate >=
    0.8
  ) {

    countryMix =
      'Excellent';


  } else if (
    countryMixRate >=
    0.5
  ) {

    countryMix =
      'Good';


  } else if (
    countryMixRate >
    0
  ) {

    countryMix =
      'Limited';

  }


  // ---------------------------------
  // Quality Feedback
  // ---------------------------------

  const feedback =
    [];


  // Previous partners

  if (
    roundNumber <=
    1
  ) {

    feedback.push({

      type:
        'info',

      message:
        'No previous round history to compare.',

    });


  } else if (
    repeatedPairs ===
    0
  ) {

    feedback.push({

      type:
        'success',

      message:
        'Previous partners were successfully separated.',

    });


  } else {

    feedback.push({

      type:
        'warning',

      message:
        `${repeatedPairs} repeated partner pair${
          repeatedPairs === 1
            ? ''
            : 's'
        } remain.`,

    });

  }


  // Same school

  if (
    sameSchoolPairs ===
    0
  ) {

    feedback.push({

      type:
        'success',

      message:
        'Students from the same school are well distributed.',

    });


  } else {

    feedback.push({

      type:
        'warning',

      message:
        `${sameSchoolPairs} same-school pairing${
          sameSchoolPairs === 1
            ? ''
            : 's'
        } remain.`,

    });

  }


  // Country diversity

  if (
    countryMix ===
    'Excellent'
  ) {

    feedback.push({

      type:
        'success',

      message:
        'Excellent international mix across rooms.',

    });


  } else if (
    countryMix ===
    'Good'
  ) {

    feedback.push({

      type:
        'success',

      message:
        'Good country diversity across rooms.',

    });


  } else if (
    countryMix ===
    'Limited'
  ) {

    feedback.push({

      type:
        'warning',

      message:
        'Country diversity is limited in some rooms.',

    });


  } else {

    feedback.push({

      type:
        'warning',

      message:
        'Participants are currently from a single country.',

    });

  }


  // Facilitators

  const facilitatorCoveragePercent =
    Math.round(
      facilitatorCoverage *
      100
    );


  if (
    facilitatorCoveragePercent ===
    100
  ) {

    feedback.push({

      type:
        'success',

      message:
        'All rooms have facilitators.',

    });


  } else {

    const missing =
      roomCount -
      roomsWithFacilitator;


    feedback.push({

      type:
        'warning',

      message:
        `${missing} room${
          missing === 1
            ? ''
            : 's'
        } still need a facilitator.`,

    });

  }


  // Overall score

  if (
    diversityScore >=
    85
  ) {

    feedback.unshift({

      type:
        'success',

      message:
        'This is a strong room plan.',

    });


  } else if (
    diversityScore >=
    65
  ) {

    feedback.unshift({

      type:
        'info',

      message:
        'This room plan is usable, but there is room for improvement.',

    });


  } else {

    feedback.unshift({

      type:
        'warning',

      message:
        'This room plan has several diversity conflicts.',

    });

  }


  return {

    diversityScore,

    totalPairs,

    repeatedPairs,

    sameSchoolPairs,

    sameCountryPairs,

    multiCountryRooms,

    countryMix,

    facilitatorCoverage:
      facilitatorCoveragePercent,

    feedback,

  };
}


// =========================================================
// Room Plan Signature
// =========================================================

function getRoomPlanSignature(
  rooms
) {

  return rooms
    .map(
      (room) =>
        room.participants
          .map(
            (participant) =>
              participant.id
          )
          .sort()
          .join(',')
    )
    .sort()
    .join('|');
}


// =========================================================
// Compare Plan Quality
// =========================================================

function isBetterPlan(
  candidate,
  currentBest
) {

  if (
    !currentBest
  ) {

    return true;

  }


  const candidateQuality =
    candidate.quality;


  const bestQuality =
    currentBest.quality;


  // まずDiversity Scoreを比較
  if (
    candidateQuality
      .diversityScore !==
    bestQuality
      .diversityScore
  ) {

    return (
      candidateQuality
        .diversityScore >
      bestQuality
        .diversityScore
    );

  }


  // 同点ならRepeated Pairが少ない方
  if (
    candidateQuality
      .repeatedPairs !==
    bestQuality
      .repeatedPairs
  ) {

    return (
      candidateQuality
        .repeatedPairs <
      bestQuality
        .repeatedPairs
    );

  }


  // 次にSame School
  if (
    candidateQuality
      .sameSchoolPairs !==
    bestQuality
      .sameSchoolPairs
  ) {

    return (
      candidateQuality
        .sameSchoolPairs <
      bestQuality
        .sameSchoolPairs
    );

  }


  // 次にSame Country
  if (
    candidateQuality
      .sameCountryPairs !==
    bestQuality
      .sameCountryPairs
  ) {

    return (
      candidateQuality
        .sameCountryPairs <
      bestQuality
        .sameCountryPairs
    );

  }


  // 最後にFacilitator Coverage
  if (
    candidateQuality
      .facilitatorCoverage !==
    bestQuality
      .facilitatorCoverage
  ) {

    return (
      candidateQuality
        .facilitatorCoverage >
      bestQuality
        .facilitatorCoverage
    );

  }


  return false;
}


// =========================================================
// Create Empty Rooms
// =========================================================

function createEmptyRooms(
  roomCount
) {

  return Array.from(

    {
      length:
        roomCount,
    },

    (
      _,
      index
    ) => ({

      id:
        `preview-room-${index + 1}`,

      name:
        `Room ${index + 1}`,

      participants:
        [],

      facilitator:
        null,

    })

  );
}


// =========================================================
// Build One Candidate Plan
// =========================================================

function buildCandidatePlan({

  participants,

  facilitators,

  roomCount,

  participantsPerRoom,

  previousRoommateCounts,

  roundNumber,

  randomize,

}) {

  const rooms =
    createEmptyRooms(
      roomCount
    );


  distributeParticipants(

    participants,

    rooms,

    participantsPerRoom,

    previousRoommateCounts,

    randomize

  );


  const unusedFacilitators =
    assignFacilitators(

      rooms,

      facilitators

    );


  const assignedFacilitators =
    rooms.filter(
      (room) =>
        room.facilitator
    ).length;


  const repeatedPairs =
    countRepeatedPairs(

      rooms,

      previousRoommateCounts

    );


  const quality =
    analyzeRoomPlan(

      rooms,

      previousRoommateCounts,

      roundNumber

    );


  const signature =
    getRoomPlanSignature(
      rooms
    );


  return {

    rooms,

    participantCount:
      participants.length,

    facilitatorCount:
      facilitators.length,

    roomCount,

    missingFacilitators:
      Math.max(

        0,

        roomCount -
        assignedFacilitators

      ),

    unusedFacilitators:
      unusedFacilitators.length,

    repeatedPairs,

    historyPairCount:
      previousRoommateCounts.size,

    quality,

    signature,

  };
}


// =========================================================
// Main Room Builder
// =========================================================

export async function buildRoomPlan({

  participantsPerRoom =
    4,

  eventId =
    null,

  roundNumber =
    1,

  attempts =
    1,

  excludeSignature =
    null,

} = {}) {


    if (
    !eventId
  ) {

    throw new Error(
      'Please select an event first.'
    );

  }


  const [
    participants,
    teachers,
  ] =
    await Promise.all([

      getParticipantsByEvent(
        eventId
      ),

      getTeachers(),

    ]);


  const facilitators =
    teachers.filter(
      (teacher) =>
        teacher.can_facilitate
    );


  let previousRoommateCounts =
    new Map();


  // Round 2以降で
  // Eventが選択されている場合のみ
  // 過去のRoom履歴を取得
  if (
    eventId &&
    roundNumber > 1
  ) {

    previousRoommateCounts =
      await getPreviousRoommateCounts({

        eventId,

        roundNumber,

      });

  }


  // =======================================================
  // No Participants
  // =======================================================

  if (
    participants.length ===
    0
  ) {

    return {

      rooms:
        [],

      participantCount:
        0,

      facilitatorCount:
        facilitators.length,

      roomCount:
        0,

      missingFacilitators:
        0,

      unusedFacilitators:
        facilitators.length,

      repeatedPairs:
        0,

      historyPairCount:
        previousRoommateCounts.size,


      quality: {

        diversityScore:
          0,

        totalPairs:
          0,

        repeatedPairs:
          0,

        sameSchoolPairs:
          0,

        sameCountryPairs:
          0,

        multiCountryRooms:
          0,

        countryMix:
          'No data',

        facilitatorCoverage:
          0,

        feedback:
          [],

      },


      signature:
        '',


      attemptsTried:
        0,


      isDifferentMix:
        false,

    };

  }


  // =======================================================
  // Room Count
  // =======================================================

  const roomCount =
    Math.ceil(

      participants.length /

      participantsPerRoom

    );


  // =======================================================
  // Number of Search Attempts
  // =======================================================

  const safeAttempts =
    Math.max(

      1,

      Math.min(

        Number(
          attempts
        ) || 1,

        50

      )

    );


  let bestPlan =
    null;


  let fallbackPlan =
    null;


  // =======================================================
  // Generate Candidates
  // =======================================================

  for (
    let attempt = 0;

    attempt <
      safeAttempts;

    attempt += 1
  ) {


    const candidate =
      buildCandidatePlan({

        participants,

        facilitators,

        roomCount,

        participantsPerRoom,

        previousRoommateCounts,

        roundNumber,


        randomize:
          safeAttempts >
          1,

      });


    // 現在のPlanと同じものしか
    // 見つからなかった場合のために
    // fallbackを保持
    if (
      isBetterPlan(
        candidate,
        fallbackPlan
      )
    ) {

      fallbackPlan =
        candidate;

    }


    // Try Another Mix の場合、
    // 現在表示しているRoom構成は除外
    if (
      excludeSignature &&
      candidate.signature ===
        excludeSignature
    ) {

      continue;

    }


    // 別候補の中で
    // 一番Qualityが高いPlanを保持
    if (
      isBetterPlan(
        candidate,
        bestPlan
      )
    ) {

      bestPlan =
        candidate;

    }

  }


  // =======================================================
  // Select Best Plan
  // =======================================================

  const selectedPlan =
    bestPlan ||
    fallbackPlan;


  return {

    ...selectedPlan,


    attemptsTried:
      safeAttempts,


    isDifferentMix:

      !excludeSignature ||

      selectedPlan.signature !==
        excludeSignature,

  };
}