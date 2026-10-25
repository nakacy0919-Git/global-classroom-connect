import {supabase} from './supabase.js';
async function rpc(name,args){
  if(!supabase)throw Error('Supabase is not configured.');
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw error;
  if(data?.ok===false)throw Error(data.error||'Could not save the change.');
  return data;
}
export const provisionTeacherV106=(eventId,name,pin)=>rpc('gcc_v106_host_set_editor',{
  p_event_id:eventId,p_name:name,p_pin:pin,
});
export const teacherEditAuditV106=eventId=>rpc('gcc_v106_host_editors_and_log',{p_event_id:eventId});
export const toggleTeacherV106=(eventId,teacherId,enabled)=>rpc('gcc_v106_host_toggle_editor',{
  p_event_id:eventId,p_editor_id:teacherId,p_enabled:enabled,
});
export const openTeacherEditorV106=(credentials)=>rpc('gcc_v106_open_editor',{
  p_token:credentials.token,p_code:credentials.code,
  p_name:credentials.name,p_pin:credentials.pin,
});
export const applyTeacherRoomEditV106=(credentials,change)=>rpc('gcc_v106_edit_room',{
  p_token:credentials.token,p_code:credentials.code,p_name:credentials.name,p_pin:credentials.pin,
  p_action:change.action,p_student_a:change.a,p_student_b:change.b||null,
  p_target_room:change.room||null,p_expected_revision:change.revision,
});
