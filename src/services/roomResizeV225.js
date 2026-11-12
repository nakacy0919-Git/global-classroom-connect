import {supabase} from './supabase.js';

const rpc = async (name, params) => {
  if (!supabase) throw Error('Supabase is not configured.');
  const {data, error} = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
};

// Only a signed-in host can read fixed pairs for a particular session.
export const getLockedRoomPairsV225 = eventId =>
  rpc('gcc_v225_locked_room_pairs', {p_event_id: eventId});

// The server validates the draft, updates the room count, and advances the
// existing published chart and 6-digit access revision in ONE transaction.
export const saveResizedRoomPlanV225 = (eventId, revision, draft, roomCount) =>
  rpc('gcc_v225_resize_room_plan', {
    p_event_id: eventId,
    p_expected_revision: revision,
    p_draft: draft,
    p_target_rooms: roomCount,
  });
