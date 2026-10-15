import {supabase} from './supabase.js';
export async function updateRegistrationNames(signupId, teacherName, students) {
  if (!supabase) throw Error('Supabase is not configured.');
  const {data, error} = await supabase.rpc('gcc_v7_update_registration_names', {
    p_signup_id: signupId,
    p_teacher_name: teacherName,
    p_students: students.map(student => ({id:student.id, name:student.name, grade:student.grade || ''}))
  });
  if (error) throw error;
  return data;
}
