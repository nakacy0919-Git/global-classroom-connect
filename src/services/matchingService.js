import {supabase} from './supabase.js';

export async function loadMatchData() {
  if(!supabase) throw new Error('Supabase is not configured.');
  const [teachers,offers,shortlists] = await Promise.all([
    supabase.from('teachers').select('id,display_name,school_id,schools(name,country_code,country_name,timezone)')
      .eq('is_active',true).order('display_name'),
    supabase.from('exchange_availability').select('*').order('starts_at',{ascending:true}),
    supabase.from('exchange_shortlists').select('*').order('created_at',{ascending:false})
  ]);
  for(const r of [teachers,offers,shortlists]) if(r.error) throw r.error;
  return {teachers:teachers.data||[],offers:offers.data||[],shortlists:shortlists.data||[]};
}

export async function createAvailability(payload) {
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError) throw authError;
  if(!user) throw new Error('Sign in as a host to save an availability.');
  const {data,error}=await supabase.from('exchange_availability')
    .insert({...payload,created_by:user.id}).select().single();
  if(error) throw error;
  return data;
}

export async function setAvailabilityStatus(id,status) {
  const {error}=await supabase.from('exchange_availability')
    .update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if(error) throw error;
}

export async function saveShortlist(match) {
  const ids=[match.a.id,match.b.id].sort();
  const payload={offer_a:ids[0],offer_b:ids[1],
    overlap_start:match.from,overlap_end:match.to,score:match.score,status:'shortlisted'};
  const {data,error}=await supabase.from('exchange_shortlists')
    .upsert(payload,{onConflict:'offer_a,offer_b'}).select().single();
  if(error) throw error;
  return data;
}

export async function removeShortlist(id) {
  const {error}=await supabase.from('exchange_shortlists').delete().eq('id',id);
  if(error) throw error;
}
