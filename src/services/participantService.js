import { supabase } from './supabase.js';


export async function getParticipants() {

  if (!supabase) {
    throw new Error(
      'Supabase is not configured.'
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from('participants')
      .select(`
        id,
        display_name,
        grade,
        school_id,
        teacher_id,
        registration_request_id,
        is_active,
        created_at,

        schools (
          id,
          name,
          country_code,
          country_name,
          city
        ),

        teachers (
          id,
          display_name
        )
      `)
      .eq(
        'is_active',
        true
      )
      .order(
        'display_name',
        {
          ascending: true,
        }
      );


  if (error) {
    throw error;
  }


  return data ?? [];
}