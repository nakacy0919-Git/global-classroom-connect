import {
  supabase,
} from './supabase.js';


// =========================================================
// Get Events
// =========================================================

export async function getEvents() {

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
      .from('events')
      .select(`
        id,
        title,
        starts_at,
        timezone,
        status,
        created_by,
        created_at
      `)
      .order(
        'starts_at',
        {
          ascending: true,
          nullsFirst: false,
        }
      );


  if (error) {
    throw error;
  }


  return data ?? [];
}


// =========================================================
// Get One Event
// =========================================================

export async function getEventById(
  eventId
) {

  if (!eventId) {
    throw new Error(
      'Event ID is required.'
    );
  }


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
        status,
        created_by,
        created_at
      `)
      .eq(
        'id',
        eventId
      )
      .single();


  if (error) {
    throw error;
  }


  return data;
}


// =========================================================
// Create Event
// =========================================================

export async function addEvent({
  title,
  startsAt = null,
  timezone = 'Asia/Tokyo',
  status = 'draft',
}) {

  if (
    !title ||
    !title.trim()
  ) {

    throw new Error(
      'Event title is required.'
    );

  }


  const {
    data: authData,
    error: authError,
  } =
    await supabase
      .auth
      .getUser();


  if (authError) {
    throw authError;
  }


  const userId =
    authData
      ?.user
      ?.id ||
    null;


  const {
    data,
    error,
  } =
    await supabase
      .from('events')
      .insert({

        title:
          title.trim(),

        starts_at:
          startsAt ||
          null,

        timezone:
          timezone ||
          'Asia/Tokyo',

        status,

        created_by:
          userId,

      })
      .select(`
        id,
        title,
        starts_at,
        timezone,
        status,
        created_by,
        created_at
      `)
      .single();


  if (error) {
    throw error;
  }


  return data;
}


// =========================================================
// Update Event
// =========================================================

export async function updateEvent(
  eventId,
  updates
) {

  if (!eventId) {

    throw new Error(
      'Event ID is required.'
    );

  }


  const payload = {};


  if (
    updates.title !==
    undefined
  ) {

    payload.title =
      updates.title.trim();

  }


  if (
    updates.startsAt !==
    undefined
  ) {

    payload.starts_at =
      updates.startsAt ||
      null;

  }


  if (
    updates.timezone !==
    undefined
  ) {

    payload.timezone =
      updates.timezone ||
      'Asia/Tokyo';

  }


  if (
    updates.status !==
    undefined
  ) {

    payload.status =
      updates.status;

  }


  const {
    data,
    error,
  } =
    await supabase
      .from('events')
      .update(
        payload
      )
      .eq(
        'id',
        eventId
      )
      .select(`
        id,
        title,
        starts_at,
        timezone,
        status,
        created_by,
        created_at
      `)
      .single();


  if (error) {
    throw error;
  }


  return data;
}


// =========================================================
// Delete Event
// =========================================================

export async function deleteEvent(
  eventId
) {

  if (!eventId) {

    throw new Error(
      'Event ID is required.'
    );

  }


  const {
    error,
  } =
    await supabase
      .from('events')
      .delete()
      .eq(
        'id',
        eventId
      );


  if (error) {
    throw error;
  }


  return true;
}