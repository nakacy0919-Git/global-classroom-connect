import {
  getParticipants,
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


      const previousCount =
        previousRoommateCounts.get(
          pairKey
        ) || 0;


      penalty +=
        previousCount;

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
    room.participants
      .filter(
        (member) =>
          getSchoolKey(member) ===
          schoolKey
      )
      .length;


  const sameCountryCount =
    room.participants
      .filter(
        (member) =>
          getCountryKey(member) ===
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

    // 最優先：
    // 前のRoundで同室だった人を避ける
    previousRoommateCount *
      10000

    +

    // 次に：
    // 同じ学校を分散
    sameSchoolCount *
      1000

    +

    // 次に：
    // 同じ国を分散
    sameCountryCount *
      30

    +

    // 最後に：
    // Room人数を均等にする
    room.participants.length

  );
}



// =========================================================
// Participant Distribution
// =========================================================

function distributeParticipants(
  participants,
  rooms,
  capacity,
  previousRoommateCounts
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
  // → 同じ学校を分散しやすくする
  const groups =
    Array
      .from(
        schoolGroups.values()
      )
      .sort(
        (a, b) =>
          b.length -
          a.length
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
            availableRooms.length === 0
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

                })
              )
              .sort(
                (a, b) =>
                  a.score -
                  b.score
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


  let sameSchoolCount = 0;

  let sameCountryCount = 0;


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

        sameSchoolCount += 1;

      }


      if (
        facilitatorCountry &&
        participantSchool
          ?.country_code ===
          facilitatorCountry
      ) {

        sameCountryCount += 1;

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
        remaining.length === 0
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

  let repeatedPairs = 0;


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
          let j = i + 1;
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

            repeatedPairs += 1;

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
  previousRoommateCounts
) {

  let totalPairs = 0;

  let sameSchoolPairs = 0;

  let sameCountryPairs = 0;

  let multiCountryRooms = 0;


  rooms.forEach(
    (room) => {

      const participants =
        room.participants || [];


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
        countries.size >= 2
      ) {

        multiCountryRooms += 1;

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
          let j = i + 1;
          j < participants.length;
          j += 1
        ) {

          totalPairs += 1;


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

            sameSchoolPairs += 1;

          }


          if (
            countryA !==
              'unknown-country' &&
            countryA ===
              countryB
          ) {

            sameCountryPairs += 1;

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
  //
  // 100点から問題分を減点
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
  // Country Mix Label
  // ---------------------------------

  const countryMixRate =
    roomCount > 0

      ? multiCountryRooms /
        roomCount

      : 0;


  let countryMix =
    'Single-country';


  if (
    countryMixRate >= 0.8
  ) {

    countryMix =
      'Excellent';

  } else if (
    countryMixRate >= 0.5
  ) {

    countryMix =
      'Good';

  } else if (
    countryMixRate > 0
  ) {

    countryMix =
      'Limited';

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
      Math.round(
        facilitatorCoverage *
        100
      ),

  };
}

// =========================================================
// Main Room Builder
// =========================================================

export async function buildRoomPlan({

  participantsPerRoom = 4,

  eventId = null,

  roundNumber = 1,

} = {}) {


  const [
    participants,
    teachers,
  ] =
    await Promise.all([

      getParticipants(),

      getTeachers(),

    ]);



  const facilitators =
    teachers.filter(
      (teacher) =>
        teacher.can_facilitate
    );



  let previousRoommateCounts =
    new Map();



  // Round 2以降で、
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



  if (
    participants.length === 0
  ) {

    return {

      rooms: [],

      participantCount: 0,

      facilitatorCount:
        facilitators.length,

      roomCount: 0,

      missingFacilitators: 0,

      unusedFacilitators:
        facilitators.length,

      repeatedPairs: 0,

      historyPairCount:
        previousRoommateCounts.size,

      quality: {

        diversityScore: 0,

        totalPairs: 0,

        repeatedPairs: 0,

        sameSchoolPairs: 0,

        sameCountryPairs: 0,

        multiCountryRooms: 0,

        countryMix:
          'No data',

        facilitatorCoverage: 0,

      },

    };

  }



  const roomCount =
    Math.ceil(
      participants.length /
      participantsPerRoom
    );



  const rooms =
    Array.from(

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

        participants: [],

        facilitator: null,

      })

    );



  distributeParticipants(

    participants,

    rooms,

    participantsPerRoom,

    previousRoommateCounts

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
    )
    .length;



  const repeatedPairs =
    countRepeatedPairs(

      rooms,

      previousRoommateCounts

    );

  const quality =
    analyzeRoomPlan(
      rooms,
      previousRoommateCounts
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

  };

}