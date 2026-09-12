import { supabase } from './supabase.js';


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
      timezone: school.timezone || null,
      languages: school.languages || [],
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