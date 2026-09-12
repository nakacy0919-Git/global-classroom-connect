import { supabase } from './supabase.js';


export async function getTeachers() {

  const { data, error } =
    await supabase
      .from('teachers')
      .select(`
        id,
        display_name,
        email,
        job_title,
        languages,
        can_facilitate,
        facilitator_topics,
        is_main_coordinator,
        bio,
        photo_path,
        school_id,
        schools (
          id,
          name,
          country_code,
          country_name,
          city
        )
      `)
      .eq('is_active', true)
      .order(
        'display_name',
        { ascending: true }
      );


  if (error) {
    throw error;
  }


  return data ?? [];
}


export async function addTeacher(
  teacher
) {

  const { data, error } =
    await supabase
      .from('teachers')
      .insert(teacher)
      .select()
      .single();


  if (error) {
    throw error;
  }


  return data;
}


export async function updateTeacher(
  id,
  updates
) {

  const { data, error } =
    await supabase
      .from('teachers')
      .update({
        ...updates,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();


  if (error) {
    throw error;
  }


  return data;
}
export async function uploadTeacherPhoto(
  teacherId,
  file
) {

  if (!file) {
    return null;
  }


  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase() || 'jpg';


  const fileName =
    `${crypto.randomUUID()}.${extension}`;


  const path =
    `${teacherId}/${fileName}`;


  const { error } =
    await supabase.storage
      .from('teacher-photos')
      .upload(
        path,
        file,
        {
          cacheControl: '3600',
          upsert: false,
        }
      );


  if (error) {
    throw error;
  }


  return path;
}
export async function getTeacherPhotoUrl(
  photoPath
) {

  if (!photoPath) {
    return null;
  }


  const { data, error } =
    await supabase.storage
      .from('teacher-photos')
      .createSignedUrl(
        photoPath,
        60 * 60
      );


  if (error) {
    console.error(
      'Teacher photo URL error:',
      error
    );

    return null;
  }


  return data.signedUrl;
}
export async function deleteTeacher(
  id
) {

  const { error } =
    await supabase
      .from('teachers')
      .delete()
      .eq('id', id);


  if (error) {
    throw error;
  }

}