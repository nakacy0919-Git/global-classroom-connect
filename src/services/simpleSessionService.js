import {supabase} from './supabase.js';
async function rpc(name,params={}){
  if(!supabase)throw Error('Supabase is not configured');
  const {data,error}=await supabase.rpc(name,params);
  if(error)throw error;
  return data;
}
export const listPublicSessions=()=>rpc('gcc_v6_public_sessions');
export const listPublicSessionOverviews=()=>rpc('gcc_v168_public_session_overviews');
const rosterParamsV237=p=>({
  p_event_id:p.eventId,p_teacher_name:p.teacher,
  p_school_name:p.school,p_country_code:p.countryCode,
  p_country_name:p.countryName,p_students:p.students,p_facilitators:p.facilitators,p_pairs:p.pairs||[]
});
export const submitSharedRoster=p=>p.botReceipt
 ?rpc('gcc_v239_submit_protected_roster',{...rosterParamsV237(p),p_receipt:p.botReceipt,p_invite:p.invite||''})
 :p.invite
 ?rpc('gcc_v237_submit_invited_roster',{...rosterParamsV237(p),p_invite:p.invite})
 :rpc('gcc_v165_submit_roster',rosterParamsV237(p));
export const getSessionSettings=()=>rpc('gcc_v8_get_session_settings');
export const saveSessionSettings=p=>rpc('gcc_v8_save_session_settings',{
  p_event_id:p.eventId,p_breakout_rooms:p.rooms,
  p_max_students:p.maxStudents,p_facilitators_per_room:p.facilitatorsPerRoom
});

export const rosterInviteStatusV237=eventId=>rpc('gcc_v237_invite_status',{p_event_id:eventId});
export const issueRosterInviteV237=eventId=>rpc('gcc_v237_issue_invite',{p_event_id:eventId});
export const revokeRosterInvitesV237=eventId=>rpc('gcc_v237_revoke_invites',{p_event_id:eventId});

export const rosterIdentityV238=()=>rpc('gcc_v238_my_roster_identity');
export const verifiedRosterPolicyV238=eventId=>rpc('gcc_v238_roster_policy',{p_event_id:eventId});
export const requireVerifiedRosterV238=eventId=>rpc('gcc_v238_require_verified',{p_event_id:eventId});

export const rosterBotPolicyV239=eventId=>rpc('gcc_v239_bot_policy',{p_event_id:eventId});
export async function verifyRosterBotV239(eventId,token){
 if(!supabase)throw Error('GCC_BOT_UNAVAILABLE');
 const {data,error}=await supabase.functions.invoke('gcc-roster-bot-verify',{body:{eventId,token}});
 if(error||!data||!(/^[a-f0-9]{64}$/.test(data.receipt)))throw Error('GCC_BOT_INVALID');
 return data.receipt;
}
