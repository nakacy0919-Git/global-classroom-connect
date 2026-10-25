import {supabase} from './supabase.js';
async function rpc(name,args){
 if(!supabase)throw Error('Supabase is not configured.');
 const {data,error}=await supabase.rpc(name,args);
 if(error)throw error;
 if(data?.ok===false)throw Error(data.error||'The operation was not accepted.');
 return data;
}
export const setSessionTeacherCodeV107=(eventId,pin)=>rpc('gcc_v107_host_set_shared_pin',{
 p_event_id:eventId,p_pin:pin,
});
export const disableSessionTeacherCodeV107=eventId=>rpc('gcc_v107_host_disable_shared_pin',{p_event_id:eventId});
export const sessionTeacherCodeStatusV107=eventId=>rpc('gcc_v107_host_status',{p_event_id:eventId});
export const openTeacherEditorV106=credentials=>rpc('gcc_v107_open_editor',{
 p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
});
export const applyTeacherRoomEditV106=(credentials,change)=>rpc('gcc_v107_edit_room',{
 p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
 p_editor_name:change.editorName,p_action:change.action,
 p_student_a:change.a,p_student_b:change.b||null,
 p_target_room:change.room||null,p_expected_revision:change.revision,
});
