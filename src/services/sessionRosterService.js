import {supabase} from './supabase.js';
async function rpc(name,params={}){
 if(!supabase)throw Error('Supabase is not configured');
 const {data,error}=await supabase.rpc(name,params);
 if(error)throw error;return data;
}
export const publicSessions=()=>rpc('gcc_v6_public_sessions');
export const submitSessionSignup=p=>rpc('gcc_v165_submit_signup',{
 p_code:p.code,p_event_id:p.eventId,p_teacher_name:p.teacher,
 p_school_name:p.school,p_country_code:p.country,p_country_name:p.countryName,
 p_students:p.students,p_facilitators:p.facilitators,p_pairs:p.pairs||[]
});
export const issueSessionCode=label=>rpc('gcc_v6_issue_code',{p_label:label});
export const listSessionCodes=()=>rpc('gcc_v6_list_codes');
export const revokeSessionCode=id=>rpc('gcc_v6_revoke_code',{p_id:id});
export const listSessionSignups=()=>rpc('gcc_v6_host_signups');
export const reviewSessionSignup=(id,approve)=>rpc('gcc_v155_review_signup_with_auto_rooms',{p_signup_id:id,p_approve:approve});
export async function getEventFacilitatorIds(eventId){
 if(!eventId)return {managed:false,ids:new Set()};
 if(!supabase)throw Error('Supabase is not configured');
 const [scope,facilitators]=await Promise.all([
   supabase.rpc('gcc_v6_event_uses_registrations',{p_event_id:eventId}),
   supabase.from('gcc_event_facilitators').select('teacher_id').eq('event_id',eventId)
 ]);
 if(scope.error)throw scope.error;
 if(facilitators.error)throw facilitators.error;
 return {
   managed:scope.data===true,
   ids:new Set((facilitators.data||[]).map(x=>x.teacher_id))
 };
}
