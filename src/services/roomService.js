import {
  supabase,
} from './supabase.js';


// =========================================================
// Save Room Plan
// =========================================================

export async function saveRoomPlan({
  eventId,
  roundNumber,
  roundName,
  participantsPerRoom,
  rooms,
}) {

  const payload =
    rooms.map(
      (room, index) => ({

        room_number:
          index + 1,

        name:
          room.name,

        facilitator_id:
          room.facilitator?.id ||
          null,

        participants:
          room.participants.map(
            (participant) => ({

              participant_id:
                participant.id,

            })
          ),

      })
    );


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_room_plan',
      {

        p_event_id:
          eventId,

        p_round_number:
          roundNumber,

        p_round_name:
          roundName,

        p_participants_per_room:
          participantsPerRoom,

        p_rooms:
          payload,

      }
    );


  if (error) {
    throw error;
  }


  return data;
}



// =========================================================
// Previous Roommate History
// =========================================================

export async function getPreviousRoommateCounts({
  eventId,
  roundNumber,
}) {

  // Round 1には過去データがない
  if (
    !eventId ||
    roundNumber <= 1
  ) {

    return new Map();

  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'room_assignments'
      )
      .select(`
        room_id,
        participant_id,

        rounds!inner (
          event_id,
          round_number
        )
      `)
      .eq(
        'rounds.event_id',
        eventId
      )
      .lt(
        'rounds.round_number',
        roundNumber
      );


  if (error) {
    throw error;
  }


  // Roomごとに参加者をまとめる
  const roomMembers =
    new Map();


  (data ?? [])
    .forEach(
      (assignment) => {

        const roomId =
          assignment.room_id;


        if (
          !roomMembers.has(
            roomId
          )
        ) {

          roomMembers.set(
            roomId,
            []
          );

        }


        roomMembers
          .get(
            roomId
          )
          .push(
            assignment.participant_id
          );

      }
    );


  // Pairごとの「過去に何回同室だったか」
  const pairCounts =
    new Map();


  roomMembers
    .forEach(
      (members) => {

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

            const pair =
              [
                members[i],
                members[j],
              ]
                .sort()
                .join(
                  '::'
                );


            const previousCount =
              pairCounts.get(
                pair
              ) ||
              0;


            pairCounts.set(
              pair,
              previousCount + 1
            );

          }

        }

      }
    );


  return pairCounts;
}



// =========================================================
// Helper
// =========================================================

export function getParticipantPairKey(
  participantA,
  participantB
) {

  if (
    !participantA ||
    !participantB
  ) {

    return null;

  }


  return [
    participantA,
    participantB,
  ]
    .sort()
    .join(
      '::'
    );
}
// =========================================================
// Round Overview
// =========================================================

export async function getRoundOverview(
  eventId
) {

  if (!eventId) {
    return [];
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_event_round_overview',
      {
        p_event_id:
          eventId,
      }
    );


  if (error) {
    throw error;
  }


  return Array.isArray(data)
    ? data
    : [];
}