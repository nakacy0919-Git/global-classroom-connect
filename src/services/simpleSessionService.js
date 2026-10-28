import {supabase} from './supabase.js';
async function rpc(name,params={}){
  if(!supabase)throw Error('Supabase is not configured');
  const {data,error}=await supabase.rpc(name,params);
  if(error)throw error;
  return data;
}
export const listPublicSessions=()=>rpc('gcc_v6_public_sessions');
export const listPublicSessionOverviews=()=>rpc('gcc_v168_public_session_overviews');
export const submitSharedRoster=p=>rpc('gcc_v165_submit_roster',{
  p_event_id:p.eventId,p_teacher_name:p.teacher,
  p_school_name:p.school,p_country_code:p.countryCode,
  p_country_name:p.countryName,p_students:p.students,p_facilitators:p.facilitators,p_pairs:p.pairs||[]
});
export const getSessionSettings=()=>rpc('gcc_v8_get_session_settings');
export const saveSessionSettings=p=>rpc('gcc_v8_save_session_settings',{
  p_event_id:p.eventId,p_breakout_rooms:p.rooms,
  p_max_students:p.maxStudents,p_facilitators_per_room:p.facilitatorsPerRoom
});
