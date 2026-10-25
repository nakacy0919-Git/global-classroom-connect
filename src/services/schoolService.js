import { supabase } from './supabase.js';
const validZoneV116=zone=>{if(!zone)return null;try{new Intl.DateTimeFormat('en',{timeZone:zone});return zone;}catch{throw Error('Enter a valid IANA time zone (e.g. Asia/Tokyo).');}};


export async function getSchools() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('schools')
    .select(`
      id,
      name,
      country_code,
      country_name,
      city,
      timezone,
      school_level,
      languages,
      introduction,
      website_url,
      logo_url
    `)
    .order('country_name', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}


export async function addSchool(school) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('schools')
    .insert({
      name: school.name,
      country_code: school.country_code,
      country_name: school.country_name,
      city: school.city || null,
      timezone: validZoneV116(school.timezone),
      languages: school.languages || [],
      school_level: school.school_level || null,
      introduction: school.introduction || null,
      website_url: school.website_url || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
export async function getSchoolById(id) {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function updateSchool(id, updates) {
  if(updates.timezone!==undefined)updates.timezone=validZoneV116(updates.timezone);
  const { data, error } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function deleteSchool(id) {
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}