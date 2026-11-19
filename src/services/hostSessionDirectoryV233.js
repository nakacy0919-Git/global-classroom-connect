// GCC V23.3 — Host Admin only. All reads/writes remain protected by existing Supabase RLS.
import {supabase} from './supabase.js';
import {deleteFinishedSessionV105} from './sessionDeletionV105.js';
import {normalizeHostSessionsV233,validateAdminOfferChangeV233} from '../lib/hostSessionDirectoryV233.js';

const db=()=>{if(!supabase)throw Error('Supabase is not configured');return supabase;};
async function readEveryRow(table,columns) {
  const pageSize=200,all=[];
  for(let page=0;page<200;page++){
    const {data,error}=await db().from(table).select(columns).range(page*pageSize,(page+1)*pageSize-1);
    if(error)throw new Error('Could not load '+table+': '+error.message);
    all.push(...(data||[]));
    if(!data||data.length<pageSize)return all;
  }
  throw Error('Session directory exceeded the safe page limit; no results have been silently truncated.');
}
export async function loadHostSessionDirectoryV233() {
  const {error:accessError}=await db().rpc('gcc_v6_require_host');
  if(accessError)throw new Error('Host Admin access is required.');
  const [events,offers,teachers,schools,requests]=await Promise.all([
    readEveryRow('events','id,title,starts_at,ends_at,timezone,status,created_at,session_details'),
    readEveryRow('exchange_availability','id,teacher_id,country_code,timezone,starts_at,ends_at,student_count,room_count,age_band,topic,notes,status,created_at,updated_at,session_details'),
    readEveryRow('teachers','id,display_name,school_id'),
    readEveryRow('schools','id,name,country_name'),
    readEveryRow('session_join_requests','id,offer_id,status,requested_students')
  ]);
  return normalizeHostSessionsV233(events,offers,teachers,schools,requests);
}
export async function updateHostTeacherSessionV233(record,draft) {
  if(record.source!=='teacher')throw Error('Only teacher sessions can be edited in this form.');
  const offer=record.original;
  const v=validateAdminOfferChangeV233(offer,draft,record.requestStats.approvedStudents);
  if(!v.ok)throw Error(v.errors.join(' '));
  const details={...offer.session_details,
    session_name:v.title,max_participants:v.capacity};
  if(draft.deadline)details.registration_closes_at=draft.deadline;
  const payload={
    starts_at:draft.startsAt,ends_at:draft.endsAt,
    student_count:v.students,room_count:v.rooms,topic:v.topic,notes:v.notes,
    session_details:details,status:draft.status,updated_at:new Date().toISOString()
  };
  const {data,error}=await db().from('exchange_availability').update(payload)
    .eq('id',record.id).eq('updated_at',offer.updated_at).select('id');
  if(error)throw error;
  if(data?.length!==1)throw Error('This session was changed by someone else. Refresh before editing again.');
  return data[0];
}
export async function deleteHostSessionV233(record,exactTitle) {
  if(exactTitle!==record.title)throw Error('Type the exact session title to confirm.');
  if(record.source==='host')return deleteFinishedSessionV105(record.id,exactTitle);
  if(record.source!=='teacher')throw Error('Unknown session type.');
  // Request rows have RESTRICT foreign keys: never remove applications or their audit history.
  const {data:requests,error:checkError}=await db().from('session_join_requests')
    .select('id').eq('offer_id',record.id).limit(1);
  if(checkError)throw checkError;
  if(requests?.length)throw Error('This session has join requests. Close it instead to preserve participant records.');
  const {data,error}=await db().from('exchange_availability').delete()
    .eq('id',record.id).eq('updated_at',record.original.updated_at).select('id');
  if(error)throw error;
  if(data?.length!==1)throw Error('Session could not be deleted. Refresh and check for changes.');
  return {deleted:true};
}
