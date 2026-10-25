import {supabase} from './supabase.js';

export async function volunteerGalleryV122(){
  if(!supabase)throw Error('GCC is not connected to the database.');
  const {data,error}=await supabase.rpc('gcc_v122_volunteer_gallery');
  if(error)throw error;
  return Array.isArray(data)?data:[];
}
