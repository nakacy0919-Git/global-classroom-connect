import {supabase} from './supabase.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase has not been configured.');
  return supabase;
}

export async function loadSessionJoinRequests() {
  const {data, error} = await requireClient().from('session_join_requests')
    .select('id,offer_id,requesting_teacher_id,status,message,requested_students,created_at,reviewed_at,reviewed_by')
    .order('created_at', {ascending:false});
  if (error) throw error;
  return data || [];
}

export async function requestSessionJoin(offerId, requestingTeacherId, message, studentCount=1) {
  if(!Number.isInteger(studentCount)||studentCount<1||studentCount>500)
    throw Error('Enter 1–500 students for the applicant school.');
  const db=requireClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError) throw authError;
  if(!user) throw new Error('Please sign in as a host.');
  const {data,error}=await db.from('session_join_requests')
    .insert({offer_id:offerId,requesting_teacher_id:requestingTeacherId,
      message:(message||'').trim(),requested_students:studentCount,created_by:user.id})
    .select('id,status').single();
  if(error) throw error;
  return data;
}

export async function reviewSessionJoinRequest(requestId, decision) {
  if(!['approved','declined'].includes(decision)) throw Error('Invalid review decision.');
  const db=requireClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError) throw authError;
  if(!user) throw Error('Please sign in as a host.');
  const {data,error}=await db.from('session_join_requests')
    .update({status:decision,reviewed_by:user.id,reviewed_at:new Date().toISOString()})
    .eq('id',requestId).eq('status','pending').select('id,status').maybeSingle();
  if(error) throw error;
  if(!data) throw Error('This request is no longer pending. Refresh and try again.');
  return data;
}
