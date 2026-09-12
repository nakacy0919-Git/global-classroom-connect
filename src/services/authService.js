import { supabase } from './supabase.js';


export async function signIn(
  email,
  password
) {

  if (!supabase) {
    throw new Error(
      'Supabase is not configured.'
    );
  }


  const {
    data,
    error
  } =
    await supabase.auth
      .signInWithPassword({
        email,
        password,
      });


  if (error) {
    throw error;
  }


  return data;
}


export async function signOut() {

  if (!supabase) {
    return;
  }


  const { error } =
    await supabase.auth
      .signOut();


  if (error) {
    throw error;
  }

}


export async function getCurrentUser() {

  if (!supabase) {
    return null;
  }


  const {
    data: { user },
    error,
  } =
    await supabase.auth
      .getUser();


  if (error) {
    return null;
  }


  return user;
}


export async function getCurrentProfile() {

  const user =
    await getCurrentUser();


  if (!user) {
    return null;
  }


  const {
    data,
    error
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        role
      `)
      .eq(
        'id',
        user.id
      )
      .single();


  if (error) {

    console.error(
      'Profile load error:',
      error
    );

    return null;

  }


  return data;
}