-- =========================================================
-- Global Classroom Connect
-- Current Database Schema
-- Updated: 2026-09
--
-- IMPORTANT:
-- This file is a reference / fresh-install schema.
-- Do NOT run this entire file against the current live DB.
-- =========================================================


create extension if not exists pgcrypto;


-- =========================================================
-- PROFILES
-- =========================================================

create table if not exists public.profiles (

  id uuid
    primary key
    references auth.users(id)
    on delete cascade,

  display_name text,

  role text
    not null
    default 'teacher'
    check (
      role in (
        'host',
        'teacher'
      )
    ),

  created_at timestamptz
    not null
    default now()

);


-- =========================================================
-- SCHOOLS
-- =========================================================

create table if not exists public.schools (

  id uuid
    primary key
    default gen_random_uuid(),

  name text
    not null,

  country_code text,

  country_name text
    not null,

  city text,

  timezone text,

  languages text[]
    default '{}',

  introduction text,

  website_url text,

  logo_url text,

  is_public boolean
    not null
    default true,

  is_active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now()

);


create unique index if not exists
schools_unique_identity

on public.schools (

  lower(name),

  country_code,

  coalesce(
    city,
    ''
  )

);


-- =========================================================
-- TEACHERS
-- =========================================================

create table if not exists public.teachers (

  id uuid
    primary key
    default gen_random_uuid(),

  school_id uuid
    references public.schools(id)
    on delete set null,

  user_id uuid
    references auth.users(id)
    on delete set null,

  display_name text
    not null,

  email text,

  job_title text,

  languages text[]
    default '{}',

  can_facilitate boolean
    not null
    default false,

  facilitator_topics text[]
    default '{}',

  is_main_coordinator boolean
    not null
    default false,

  bio text,

  photo_path text,

  is_active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()

);


-- =========================================================
-- REGISTRATION INVITES
-- =========================================================

create table if not exists public.registration_invites (

  id uuid
    primary key
    default gen_random_uuid(),

  invite_code text
    not null
    unique,

  event_name text,

  is_active boolean
    not null
    default true,

  expires_at timestamptz,

  created_at timestamptz
    not null
    default now()

);


-- =========================================================
-- REGISTRATION REQUESTS
-- =========================================================

create table if not exists public.registration_requests (

  id uuid
    primary key
    default gen_random_uuid(),

  invite_code text
    not null,

  school_id uuid
    references public.schools(id)
    on delete set null,

  new_school_name text,

  new_school_country text,

  new_school_city text,

  teacher_name text
    not null,

  teacher_email text,

  teacher_languages text[]
    default '{}',

  participation_style text,

  can_facilitate boolean
    not null
    default false,

  facilitator_topics text[]
    default '{}',

  students jsonb
    not null
    default '[]'::jsonb,

  notes text,

  status text
    not null
    default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected'
      )
    ),

  processed_at timestamptz,

  processed_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null
    default now()

);


-- =========================================================
-- PARTICIPANTS
-- =========================================================

create table if not exists public.participants (

  id uuid
    primary key
    default gen_random_uuid(),

  school_id uuid
    references public.schools(id)
    on delete set null,

  teacher_id uuid
    references public.teachers(id)
    on delete set null,

  registration_request_id uuid
    references public.registration_requests(id)
    on delete set null,

  display_name text
    not null,

  grade text,

  is_active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now()

);


-- =========================================================
-- EVENTS
-- =========================================================

create table if not exists public.events (

  id uuid
    primary key
    default gen_random_uuid(),

  title text
    not null,

  starts_at timestamptz,

  timezone text
    default 'Asia/Tokyo',

  status text
    not null
    default 'draft'
    check (
      status in (
        'draft',
        'published',
        'live',
        'completed'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null
    default now()

);


-- =========================================================
-- EVENT PARTICIPANTS
-- =========================================================

create table if not exists public.event_participants (

  id uuid
    primary key
    default gen_random_uuid(),

  event_id uuid
    not null
    references public.events(id)
    on delete cascade,

  participant_id uuid
    not null
    references public.participants(id)
    on delete cascade,

  role text
    not null
    default 'participant'
    check (
      role in (
        'participant',
        'presenter',
        'guest',
        'audience'
      )
    ),

  created_at timestamptz
    not null
    default now(),

  unique (
    event_id,
    participant_id
  )

);


-- =========================================================
-- ROUNDS
-- =========================================================

create table if not exists public.rounds (

  id uuid
    primary key
    default gen_random_uuid(),

  event_id uuid
    not null
    references public.events(id)
    on delete cascade,

  round_number integer
    not null,

  name text
    not null,

  participants_per_room integer
    not null
    default 4,

  assignment_mode text
    not null
    default 'smart',

  created_at timestamptz
    not null
    default now(),

  unique (
    event_id,
    round_number
  )

);


-- =========================================================
-- ROOMS
-- =========================================================

create table if not exists public.rooms (

  id uuid
    primary key
    default gen_random_uuid(),

  round_id uuid
    not null
    references public.rounds(id)
    on delete cascade,

  room_number integer
    not null,

  name text
    not null,

  facilitator_teacher_id uuid
    references public.teachers(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  unique (
    round_id,
    room_number
  )

);


-- =========================================================
-- ROOM ASSIGNMENTS
-- =========================================================

create table if not exists public.room_assignments (

  id uuid
    primary key
    default gen_random_uuid(),

  round_id uuid
    not null
    references public.rounds(id)
    on delete cascade,

  room_id uuid
    not null
    references public.rooms(id)
    on delete cascade,

  participant_id uuid
    not null
    references public.participants(id)
    on delete cascade,

  role text
    not null
    default 'participant',

  created_at timestamptz
    not null
    default now(),

  unique (
    round_id,
    participant_id
  )

);
-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================


-- =========================================================
-- PROFILES
-- =========================================================

alter table public.profiles
enable row level security;


revoke all
on table public.profiles
from anon, authenticated;


grant select
on table public.profiles
to authenticated;


drop policy if exists
  "Users can read their own profile"
on public.profiles;


create policy
  "Users can read their own profile"
on public.profiles

for select

to authenticated

using (
  auth.uid() = id
);



-- =========================================================
-- SCHOOLS
-- =========================================================

alter table public.schools
enable row level security;


revoke all
on table public.schools
from anon, authenticated;


grant select
on table public.schools
to anon, authenticated;


grant insert, update, delete
on table public.schools
to authenticated;


drop policy if exists
  "Public schools are viewable"
on public.schools;


create policy
  "Public schools are viewable"
on public.schools

for select

to anon, authenticated

using (
  is_public = true
  and is_active = true
);


drop policy if exists
  "Hosts manage schools"
on public.schools;


create policy
  "Hosts manage schools"
on public.schools

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- TEACHERS
-- =========================================================

alter table public.teachers
enable row level security;


revoke all
on table public.teachers
from anon, authenticated;


grant select, insert, update, delete
on table public.teachers
to authenticated;


drop policy if exists
  "Hosts manage teachers"
on public.teachers;


create policy
  "Hosts manage teachers"
on public.teachers

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- REGISTRATION INVITES
-- =========================================================

alter table public.registration_invites
enable row level security;


revoke all
on table public.registration_invites
from anon, authenticated;


grant select, insert, update, delete
on table public.registration_invites
to authenticated;


drop policy if exists
  "Hosts manage registration invites"
on public.registration_invites;


create policy
  "Hosts manage registration invites"
on public.registration_invites

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- INVITE VALIDATION FUNCTION
-- =========================================================

create or replace function
public.is_valid_registration_invite(
  code text
)

returns boolean

language sql

security definer

set search_path = public

stable

as $$

  select exists (

    select 1

    from public.registration_invites

    where
      invite_code = code

      and is_active = true

      and (
        expires_at is null
        or expires_at > now()
      )

  );

$$;


revoke all
on function public.is_valid_registration_invite(text)
from public;


grant execute
on function public.is_valid_registration_invite(text)
to anon, authenticated;



-- =========================================================
-- REGISTRATION REQUESTS
-- =========================================================

alter table public.registration_requests
enable row level security;


revoke all
on table public.registration_requests
from anon, authenticated;


grant insert
on table public.registration_requests
to anon, authenticated;


grant select, update, delete
on table public.registration_requests
to authenticated;


drop policy if exists
  "Valid invite can submit registration"
on public.registration_requests;


create policy
  "Valid invite can submit registration"
on public.registration_requests

for insert

to anon, authenticated

with check (
  public.is_valid_registration_invite(
    invite_code
  )
);


drop policy if exists
  "Hosts manage registration requests"
on public.registration_requests;


create policy
  "Hosts manage registration requests"
on public.registration_requests

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- PARTICIPANTS
-- =========================================================

alter table public.participants
enable row level security;


revoke all
on table public.participants
from anon, authenticated;


grant select, insert, update, delete
on table public.participants
to authenticated;


drop policy if exists
  "Hosts manage participants"
on public.participants;


create policy
  "Hosts manage participants"
on public.participants

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- EVENTS
-- =========================================================

alter table public.events
enable row level security;


revoke all
on table public.events
from anon, authenticated;


grant select, insert, update, delete
on table public.events
to authenticated;


drop policy if exists
  "Hosts manage events"
on public.events;


create policy
  "Hosts manage events"
on public.events

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- EVENT PARTICIPANTS
-- =========================================================

alter table public.event_participants
enable row level security;


revoke all
on table public.event_participants
from anon, authenticated;


grant select, insert, update, delete
on table public.event_participants
to authenticated;


drop policy if exists
  "Hosts manage event participants"
on public.event_participants;


create policy
  "Hosts manage event participants"
on public.event_participants

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- ROUNDS
-- =========================================================

alter table public.rounds
enable row level security;


revoke all
on table public.rounds
from anon, authenticated;


grant select, insert, update, delete
on table public.rounds
to authenticated;


drop policy if exists
  "Hosts manage rounds"
on public.rounds;


create policy
  "Hosts manage rounds"
on public.rounds

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- ROOMS
-- =========================================================

alter table public.rooms
enable row level security;


revoke all
on table public.rooms
from anon, authenticated;


grant select, insert, update, delete
on table public.rooms
to authenticated;


drop policy if exists
  "Hosts manage rooms"
on public.rooms;


create policy
  "Hosts manage rooms"
on public.rooms

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);



-- =========================================================
-- ROOM ASSIGNMENTS
-- =========================================================

alter table public.room_assignments
enable row level security;


revoke all
on table public.room_assignments
from anon, authenticated;


grant select, insert, update, delete
on table public.room_assignments
to authenticated;


drop policy if exists
  "Hosts manage room assignments"
on public.room_assignments;


create policy
  "Hosts manage room assignments"
on public.room_assignments

for all

to authenticated

using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
)

with check (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role = 'host'
  )
);
-- =========================================================
-- RPC
-- APPROVE REGISTRATION REQUEST
-- =========================================================

create or replace function
public.approve_registration_request(
  p_request_id uuid
)

returns jsonb

language plpgsql

security definer

set search_path = public

as $$

declare

  v_request
    public.registration_requests%rowtype;

  v_school_id
    uuid;

  v_teacher_id
    uuid;

  v_student
    jsonb;

  v_participant_count
    integer := 0;

begin

  -- -------------------------------------------------------
  -- Host check
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.profiles

    where
      id = auth.uid()

      and role = 'host'

  ) then

    raise exception
      'Host access required';

  end if;



  -- -------------------------------------------------------
  -- Load request
  -- -------------------------------------------------------

  select *

  into v_request

  from public.registration_requests

  where
    id = p_request_id

  for update;


  if not found then

    raise exception
      'Registration request not found';

  end if;


  if
    v_request.status <> 'pending'
  then

    raise exception
      'Registration request has already been processed';

  end if;



  -- -------------------------------------------------------
  -- School
  -- -------------------------------------------------------

  v_school_id =
    v_request.school_id;


  if
    v_school_id is null
  then

    if
      nullif(
        trim(
          coalesce(
            v_request.new_school_name,
            ''
          )
        ),
        ''
      )
      is null
    then

      raise exception
        'New school name is required';

    end if;


    if
      nullif(
        trim(
          coalesce(
            v_request.new_school_country,
            ''
          )
        ),
        ''
      )
      is null
    then

      raise exception
        'New school country is required';

    end if;


    insert into public.schools (

      name,

      country_name,

      city,

      languages,

      is_public,

      is_active

    )

    values (

      trim(
        v_request.new_school_name
      ),

      trim(
        v_request.new_school_country
      ),

      nullif(
        trim(
          coalesce(
            v_request.new_school_city,
            ''
          )
        ),
        ''
      ),

      '{}',

      true,

      true

    )

    returning id

    into v_school_id;

  end if;



  -- -------------------------------------------------------
  -- Teacher
  -- -------------------------------------------------------

  insert into public.teachers (

    school_id,

    display_name,

    email,

    languages,

    can_facilitate,

    facilitator_topics,

    is_main_coordinator

  )

  values (

    v_school_id,

    v_request.teacher_name,

    v_request.teacher_email,

    coalesce(
      v_request.teacher_languages,
      '{}'
    ),

    coalesce(
      v_request.can_facilitate,
      false
    ),

    coalesce(
      v_request.facilitator_topics,
      '{}'
    ),

    true

  )

  returning id

  into v_teacher_id;



  -- -------------------------------------------------------
  -- Participants
  -- -------------------------------------------------------

  for v_student in

    select value

    from jsonb_array_elements(

      coalesce(
        v_request.students,
        '[]'::jsonb
      )

    )

  loop

    if
      nullif(
        trim(
          coalesce(
            v_student ->> 'name',
            ''
          )
        ),
        ''
      )
      is not null
    then

      insert into public.participants (

        school_id,

        teacher_id,

        registration_request_id,

        display_name,

        grade,

        is_active

      )

      values (

        v_school_id,

        v_teacher_id,

        v_request.id,

        trim(
          v_student ->> 'name'
        ),

        nullif(
          trim(
            coalesce(
              v_student ->> 'grade',
              ''
            )
          ),
          ''
        ),

        true

      );


      v_participant_count =
        v_participant_count + 1;

    end if;

  end loop;



  -- -------------------------------------------------------
  -- Complete request
  -- -------------------------------------------------------

  update public.registration_requests

  set
    status = 'approved',

    processed_at = now(),

    processed_by = auth.uid()

  where
    id = p_request_id;



  -- -------------------------------------------------------
  -- Result
  -- -------------------------------------------------------

  return jsonb_build_object(

    'request_id',
    p_request_id,

    'school_id',
    v_school_id,

    'teacher_id',
    v_teacher_id,

    'participant_count',
    v_participant_count

  );

end;

$$;


revoke all
on function
public.approve_registration_request(
  uuid
)
from public;


grant execute
on function
public.approve_registration_request(
  uuid
)
to authenticated;



-- =========================================================
-- RPC
-- REJECT REGISTRATION REQUEST
-- =========================================================

create or replace function
public.reject_registration_request(
  p_request_id uuid
)

returns uuid

language plpgsql

security definer

set search_path = public

as $$

declare

  v_request_id
    uuid;

begin

  -- -------------------------------------------------------
  -- Host check
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.profiles

    where
      id = auth.uid()

      and role = 'host'

  ) then

    raise exception
      'Host access required';

  end if;



  -- -------------------------------------------------------
  -- Reject pending request
  -- -------------------------------------------------------

  update public.registration_requests

  set

    status = 'rejected',

    processed_at = now(),

    processed_by = auth.uid()

  where

    id = p_request_id

    and status = 'pending'

  returning id

  into v_request_id;


  if not found then

    raise exception
      'Pending registration request not found';

  end if;


  return v_request_id;

end;

$$;


revoke all
on function
public.reject_registration_request(
  uuid
)
from public;


grant execute
on function
public.reject_registration_request(
  uuid
)
to authenticated;



-- =========================================================
-- RPC
-- REPLACE EVENT PARTICIPANTS
-- =========================================================

create or replace function
public.replace_event_participants(

  p_event_id uuid,

  p_participant_ids uuid[]

)

returns integer

language plpgsql

security definer

set search_path = public

as $$

declare

  v_count
    integer;

begin

  -- -------------------------------------------------------
  -- Host check
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.profiles

    where
      id = auth.uid()

      and role = 'host'

  ) then

    raise exception
      'Host access required';

  end if;



  -- -------------------------------------------------------
  -- Event check
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.events

    where
      id = p_event_id

  ) then

    raise exception
      'Event not found';

  end if;



  -- -------------------------------------------------------
  -- Remove current assignments
  -- -------------------------------------------------------

  delete from public.event_participants

  where
    event_id = p_event_id;



  -- -------------------------------------------------------
  -- Insert selected participants
  -- -------------------------------------------------------

  if (

    p_participant_ids
      is not null

    and

    array_length(
      p_participant_ids,
      1
    )
      is not null

  ) then

    insert into public.event_participants (

      event_id,

      participant_id,

      role

    )

    select

      p_event_id,

      participant_id,

      'participant'

    from unnest(
      p_participant_ids
    )
    as participant_id;

  end if;



  -- -------------------------------------------------------
  -- Return selected count
  -- -------------------------------------------------------

  select count(*)

  into v_count

  from public.event_participants

  where
    event_id = p_event_id;


  return v_count;

end;

$$;


revoke all
on function
public.replace_event_participants(
  uuid,
  uuid[]
)
from public;


grant execute
on function
public.replace_event_participants(
  uuid,
  uuid[]
)
to authenticated;
-- =========================================================
-- RPC
-- SAVE ROOM PLAN
-- =========================================================

create or replace function
public.save_room_plan(

  p_event_id uuid,

  p_round_number integer,

  p_round_name text,

  p_participants_per_room integer,

  p_rooms jsonb

)

returns uuid

language plpgsql

security definer

set search_path = public

as $$

declare

  v_round_id uuid;

  v_room jsonb;

  v_room_id uuid;

  v_participant jsonb;

  v_participant_id uuid;

begin

  -- -------------------------------------------------------
  -- Host check
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.profiles

    where
      id = auth.uid()

      and role = 'host'

  ) then

    raise exception
      'Host access required';

  end if;



  -- -------------------------------------------------------
  -- Basic validation
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.events

    where
      id = p_event_id

  ) then

    raise exception
      'Event not found';

  end if;


  if
    p_round_number < 1
  then

    raise exception
      'Round number must be 1 or greater';

  end if;


  if
    p_participants_per_room < 1
  then

    raise exception
      'Participants per room must be 1 or greater';

  end if;



  -- -------------------------------------------------------
  -- Create or update Round
  -- -------------------------------------------------------

  insert into public.rounds (

    event_id,

    round_number,

    name,

    participants_per_room,

    assignment_mode

  )

  values (

    p_event_id,

    p_round_number,

    coalesce(
      nullif(
        trim(p_round_name),
        ''
      ),
      'Round ' || p_round_number
    ),

    p_participants_per_room,

    'smart'

  )

  on conflict (
    event_id,
    round_number
  )

  do update set

    name =
      excluded.name,

    participants_per_room =
      excluded.participants_per_room,

    assignment_mode =
      excluded.assignment_mode

  returning id

  into v_round_id;



  -- -------------------------------------------------------
  -- Remove existing Rooms
  --
  -- room_assignments are automatically deleted
  -- by ON DELETE CASCADE.
  -- -------------------------------------------------------

  delete from public.rooms

  where
    round_id = v_round_id;



  -- -------------------------------------------------------
  -- Create Rooms
  -- -------------------------------------------------------

  for v_room in

    select value

    from jsonb_array_elements(

      coalesce(
        p_rooms,
        '[]'::jsonb
      )

    )

  loop

    -- -----------------------------------------------------
    -- Create Room
    -- -----------------------------------------------------

    insert into public.rooms (

      round_id,

      room_number,

      name,

      facilitator_teacher_id

    )

    values (

      v_round_id,

      (
        v_room
          ->> 'room_number'
      )::integer,

      coalesce(
        nullif(
          trim(
            v_room
              ->> 'name'
          ),
          ''
        ),
        'Room ' ||
        (
          v_room
            ->> 'room_number'
        )
      ),

      nullif(
        v_room
          ->> 'facilitator_id',
        ''
      )::uuid

    )

    returning id

    into v_room_id;



    -- -----------------------------------------------------
    -- Participants in Room
    -- -----------------------------------------------------

    for v_participant in

      select value

      from jsonb_array_elements(

        coalesce(
          v_room
            -> 'participants',
          '[]'::jsonb
        )

      )

    loop

      v_participant_id =
        nullif(
          v_participant
            ->> 'participant_id',
          ''
        )::uuid;


      if
        v_participant_id
        is null
      then

        continue;

      end if;



      -- ---------------------------------------------------
      -- Security / consistency:
      -- participant must belong to this Event.
      -- ---------------------------------------------------

      if not exists (

        select 1

        from public.event_participants

        where
          event_id =
            p_event_id

          and participant_id =
            v_participant_id

      ) then

        raise exception
          'Participant % is not registered for this event',
          v_participant_id;

      end if;



      insert into public.room_assignments (

        round_id,

        room_id,

        participant_id,

        role

      )

      values (

        v_round_id,

        v_room_id,

        v_participant_id,

        'participant'

      );

    end loop;

  end loop;



  -- -------------------------------------------------------
  -- Return Round ID
  -- -------------------------------------------------------

  return v_round_id;

end;

$$;


revoke all
on function
public.save_room_plan(
  uuid,
  integer,
  text,
  integer,
  jsonb
)
from public;


grant execute
on function
public.save_room_plan(
  uuid,
  integer,
  text,
  integer,
  jsonb
)
to authenticated;



-- =========================================================
-- RPC
-- GET EVENT ROUND OVERVIEW
-- =========================================================

create or replace function
public.get_event_round_overview(
  p_event_id uuid
)

returns jsonb

language plpgsql

security definer

set search_path = public

stable

as $$

declare

  v_result jsonb;

begin

  -- -------------------------------------------------------
  -- Host check
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.profiles

    where
      id = auth.uid()

      and role = 'host'

  ) then

    raise exception
      'Host access required';

  end if;



  -- -------------------------------------------------------
  -- Event check
  -- -------------------------------------------------------

  if not exists (

    select 1

    from public.events

    where
      id = p_event_id

  ) then

    raise exception
      'Event not found';

  end if;



  -- -------------------------------------------------------
  -- Build Overview JSON
  -- -------------------------------------------------------

  select

    coalesce(

      jsonb_agg(

        jsonb_build_object(

          'round_id',
            r.id,

          'round_number',
            r.round_number,

          'round_name',
            r.name,

          'participants_per_room',
            r.participants_per_room,

          'assignment_mode',
            r.assignment_mode,

          'rooms',

            coalesce(

              (

                select

                  jsonb_agg(

                    jsonb_build_object(

                      'room_id',
                        rm.id,

                      'room_number',
                        rm.room_number,

                      'room_name',
                        rm.name,

                      'facilitator',

                        case

                          when t.id
                            is null

                          then null

                          else

                            jsonb_build_object(

                              'id',
                                t.id,

                              'name',
                                t.display_name,

                              'school',
                                ts.name,

                              'country',
                                ts.country_name,

                              'country_code',
                                ts.country_code

                            )

                        end,

                      'participants',

                        coalesce(

                          (

                            select

                              jsonb_agg(

                                jsonb_build_object(

                                  'id',
                                    p.id,

                                  'name',
                                    p.display_name,

                                  'grade',
                                    p.grade,

                                  'school',
                                    ps.name,

                                  'country',
                                    ps.country_name,

                                  'country_code',
                                    ps.country_code

                                )

                                order by
                                  p.display_name,
                                  p.id

                              )

                            from
                              public.room_assignments ra

                            join
                              public.participants p

                              on p.id =
                                ra.participant_id

                            left join
                              public.schools ps

                              on ps.id =
                                p.school_id

                            where
                              ra.room_id =
                                rm.id

                          ),

                          '[]'::jsonb

                        )

                    )

                    order by
                      rm.room_number

                  )

                from
                  public.rooms rm

                left join
                  public.teachers t

                  on t.id =
                    rm.facilitator_teacher_id

                left join
                  public.schools ts

                  on ts.id =
                    t.school_id

                where
                  rm.round_id =
                    r.id

              ),

              '[]'::jsonb

            )

        )

        order by
          r.round_number

      ),

      '[]'::jsonb

    )

  into v_result

  from
    public.rounds r

  where
    r.event_id =
      p_event_id;



  return v_result;

end;

$$;


revoke all
on function
public.get_event_round_overview(
  uuid
)
from public;


grant execute
on function
public.get_event_round_overview(
  uuid
)
to authenticated;