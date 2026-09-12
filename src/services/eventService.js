import { supabase } from './supabase.js';


export async function getEvents() {

  const {
    data,
    error,
  } =
    await supabase
      .from('events')
      .select(`
        id,
        title,
        starts_at,
        timezone,
        status
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      );


  if (error) {
    throw error;
  }


  return data ?? [];
}