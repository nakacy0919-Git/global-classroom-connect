// GCC V10.5: only a host can delete a draft or a finished session.
import {supabase} from './supabase.js';
export async function deleteFinishedSessionV105(eventId,exactTitle){
  if(!supabase)throw Error('Supabase is not configured');
  if(!eventId || typeof exactTitle!=='string' || !exactTitle.trim())throw Error('Session title is required');
  const {data,error}=await supabase.rpc('gcc_v105_delete_finished_session',{
    p_event_id:eventId,p_expected_title:exactTitle,
  });
  if(error)throw error;
  if(data?.deleted!==true)throw Error('Session deletion was not confirmed by the server');
  return data;
}
