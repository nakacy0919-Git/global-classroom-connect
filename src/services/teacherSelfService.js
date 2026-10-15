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
export async function teacherCreateSession(slot,data){return rpc('gcc_teacher_register_session',{
  p_starts_at:slot.startsAt,p_ends_at:slot.endsAt,p_timezone:data.zone,
  p_student_count:data.students,p_room_count:data.rooms,p_age_band:data.band,
  p_topic:data.topic,p_notes:data.notes
});}
export async function teacherCloseSession(id){return rpc('gcc_teacher_close_session',{p_offer_id:id});}
export async function teacherApply(id,message){return rpc('gcc_teacher_apply_to_session',{p_offer_id:id,p_message:message});}
export async function teacherReview(id,decision){return rpc('gcc_teacher_review_request',{p_request_id:id,p_decision:decision});}
export async function teacherSignIn(email,password){
  const {data,error}=await client().auth.signInWithPassword({email,password});if(error)throw error;return data;
}
export async function teacherSignUp(email,password){
  const {data,error}=await client().auth.signUp({email,password});if(error)throw error;return data;
}
export async function teacherSignOut(){const {error}=await client().auth.signOut();if(error)throw error;}
