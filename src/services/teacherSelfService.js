import {supabase} from './supabase.js';
const client=()=>{if(!supabase)throw Error('Supabase is not configured.');return supabase;};
async function rpc(name,args={}){
  const {data,error}=await client().rpc(name,args);
  if(error)throw error;
  return data;
}
export async function issueTeacherInvite(teacherId){return rpc('gcc_issue_teacher_invite',{p_teacher_id:teacherId});}
export async function claimTeacherInvite(token){return rpc('gcc_claim_teacher_invite',{p_token:token.trim().toLowerCase()});}
export async function teacherIdentity(){return rpc('gcc_teacher_identity');}
export async function teacherSessions(){return rpc('gcc_teacher_browse_sessions');}
export async function teacherRequests(){return rpc('gcc_teacher_list_requests');}
export async function teacherCreateSession(slot,data){
  const enhanced=Boolean(data.details);
  return rpc(enhanced?'gcc_v203_teacher_register_session':'gcc_teacher_register_session',{
    p_starts_at:slot.startsAt,p_ends_at:slot.endsAt,p_timezone:data.zone,
    p_student_count:data.students,p_room_count:data.rooms,p_age_band:data.band,
    p_topic:data.topic,p_notes:data.notes,
    ...(enhanced?{p_details:data.details}:{})
  });
}
export async function teacherCloseSession(id){return rpc('gcc_teacher_close_session',{p_offer_id:id});}
export async function teacherApply(id,message,students=1){
  return rpc('gcc_v212_teacher_apply_to_session',{
    p_offer_id:id,p_message:message,p_students:students
  });
}
export async function teacherManageSession(id){
  return rpc('gcc_v212_teacher_manage_session',{p_offer_id:id});
}
export async function teacherEditSession({offerId,slot,students,rooms,band,topic,notes,details}){
  return rpc('gcc_v212_teacher_edit_session',{
    p_offer_id:offerId,p_starts_at:slot.startsAt,p_ends_at:slot.endsAt,
    p_student_count:students,p_room_count:rooms,p_age_band:band,
    p_topic:topic,p_notes:notes,p_details:details
  });
}
export async function teacherNotifications(){return rpc('gcc_v212_notifications');}
export async function teacherReadNotification(id){
  return rpc('gcc_v212_mark_notification_read',{p_notification_id:id});
}
export async function teacherReopenSession(id){
  return rpc('gcc_v212_teacher_reopen_session',{p_offer_id:id});
}
export async function teacherConfirmSchedule(requestId){
  return rpc('gcc_v212_confirm_new_schedule',{p_request_id:requestId});
}
export async function teacherReview(id,decision){return rpc('gcc_teacher_review_request',{p_request_id:id,p_decision:decision});}
export async function teacherWorkspaceV213(){return rpc('gcc_v213_teacher_workspace');}
export async function teacherSaveDraftV213(draft){return rpc('gcc_v213_save_teacher_draft',{p_draft:draft});}
export async function teacherClearDraftV213(){return rpc('gcc_v213_clear_teacher_draft');}
export async function teacherSetFavoriteV213(source,id,saved){
  return rpc('gcc_v213_set_teacher_favorite',{p_source:source,p_session_id:id,p_saved:saved});
}
export async function teacherSignIn(email,password){
  const {data,error}=await client().auth.signInWithPassword({email,password});if(error)throw error;return data;
}
export async function teacherSignUp(email,password){
  const {data,error}=await client().auth.signUp({email,password});if(error)throw error;return data;
}
export async function teacherSignOut(){const {error}=await client().auth.signOut();if(error)throw error;}
