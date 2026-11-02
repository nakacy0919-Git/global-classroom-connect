import {supabase} from './supabase.js';
async function rpc(name,args){
 if(!supabase)throw Error('Supabase is not configured.');
 const {data,error}=await supabase.rpc(name,args);
 if(error)throw error;
 if(data?.ok===false)throw Error(data.error||'Change not accepted.');
 return data;
}
export const listTeacherCodesV108=eventId=>rpc('gcc_v108_host_status',{p_event_id:eventId});
export const generateTeacherCodesV108=(eventId,signupId=null,rotate=false)=>rpc('gcc_v108_host_generate_codes',{
 p_event_id:eventId,p_signup_id:signupId,p_rotate:rotate,
});
export const toggleTeacherCodeV108=(eventId,signupId,enabled)=>rpc('gcc_v108_host_toggle_teacher',{
 p_event_id:eventId,p_signup_id:signupId,p_enabled:enabled,
});
export const openTeacherEditorV106=credentials=>rpc('gcc_v108_open_editor',{
 p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
});
export const applyTeacherRoomEditV106=(credentials,change)=>rpc('gcc_v108_edit_room',{
 p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
 p_action:change.action,p_student_a:change.a,p_student_b:change.b||null,
 p_target_room:change.room||null,p_expected_revision:change.revision,
});

// V19.6: update only the display name of a student from this PIN's approved signup.
// The server checks teacher ownership, the previous value and the existing access codes.
export const renameTeacherStudentV196=(credentials,studentId,previousName,newName)=>rpc('gcc_v196_rename_student',{
 p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
 p_student_id:studentId,p_expected_name:previousName,p_new_name:newName,
});

/** V20.2 — authorized, school-scoped teacher self-service. */
export const changeTeacherStudentV202=(credentials,change)=>rpc('gcc_v202_edit_student',{
 p_token:credentials.token,p_code:credentials.code,p_pin:credentials.pin,
 p_action:change.action,p_student_id:change.studentId||null,
 p_expected_name:change.expectedName||null,p_name:change.name||null,p_grade:change.grade||''
});
