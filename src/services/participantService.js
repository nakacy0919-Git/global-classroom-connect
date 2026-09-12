import { supabase } from './supabase.js';


export async function getParticipants() {

  if (!supabase) {
    throw new Error(
      'Supabase is not configured.'
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('participants')
      .select(`
        id,
        display_name,
        grade,
        school_id,
        teacher_id,
        registration_request_id,
        is_active,
        created_at,

        schools (
          id,
          name,
          country_code,
          country_name,
          city
        ),

        teachers (
          id,
          display_name
        )
      `)
      .eq(
        'is_active',
        true
      )
      .order(
        'display_name',
        {
          ascending: true,
        }
      );


  if (error) {
    throw error;
  }


  return data ?? [];
}
// =========================================================
// Get Participants by Event
// =========================================================

export async function getParticipantsByEvent(
  eventId
) {

  if (!eventId) {
    return [];
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'event_participants'
      )
      .select(`
        id,
        role,
        participant_id,

        participants (
          id,
          display_name,
          grade,
          school_id,
          teacher_id,
          registration_request_id,
          is_active,
          created_at,

          schools (
            id,
            name,
            country_code,
            country_name,
            city
          ),

          teachers (
            id,
            display_name
          )
        )
      `)
      .eq(
        'event_id',
        eventId
      );


  if (error) {
    throw error;
  }


  return (
    data ?? []
  )
    .map(
      (item) => {

        const participant =
          Array.isArray(
            item.participants
          )
            ? item.participants[0]
            : item.participants;


        if (!participant) {
          return null;
        }


        return {

          ...participant,

          event_participant_id:
            item.id,

          event_role:
            item.role,

        };

      }
    )
    .filter(
      Boolean
    );
}
// =========================================================
// Replace Event Participants
// =========================================================

export async function replaceEventParticipants(
  eventId,
  participantIds
) {

  if (!eventId) {

    throw new Error(
      'Event ID is required.'
    );

  }


  const ids =
    Array.isArray(
      participantIds
    )
      ? participantIds
      : [];


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'replace_event_participants',
      {
        p_event_id:
          eventId,

        p_participant_ids:
          ids,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}