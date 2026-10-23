import {supabase} from './supabase.js';

export async function fetchRoomDraft(eventId) {
  if (!supabase || !eventId) throw Error('Cannot load a room draft without a session.');
  const {data,error}=await supabase.rpc('gcc_v91_load_room_draft',{p_event_id:eventId});
  if(error)throw error;
  return data;
}

export async function saveRoomDraft(eventId,payload,expectedRevision) {
  if (!supabase || !eventId) throw Error('Cannot save a room draft without a session.');
  const {data,error}=await supabase.rpc('gcc_v91_save_room_draft',{
    p_event_id:eventId,p_draft:payload,p_expected_revision:expectedRevision,
  });
  if(error)throw error;
  return data;
}
