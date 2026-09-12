import { supabase } from './supabase.js';


export async function submitRegistration(
  registration
) {

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
      .from(
        'registration_requests'
      )
      .insert(registration);


  if (error) {
    throw error;
  }


  return data;
}


export async function getRegistrationRequests() {

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'registration_requests'
      )
      .select(`
        *,
        schools (
          id,
          name,
          country_name
        )
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
export async function approveRegistrationRequest(
  requestId
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'approve_registration_request',
      {
        p_request_id:
          requestId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function rejectRegistrationRequest(
  requestId
) {

  const {
    error,
  } =
    await supabase.rpc(
      'reject_registration_request',
      {
        p_request_id:
          requestId,
      }
    );


  if (error) {
    throw error;
  }

}