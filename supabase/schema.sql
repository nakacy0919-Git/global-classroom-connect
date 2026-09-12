-- =============================================
-- Global Classroom Connect
-- Database Schema Ver.1
-- =============================================


-- =============================================
-- SCHOOLS
-- =============================================

create table if not exists public.schools (

  id uuid primary key
    default gen_random_uuid(),

  name text not null,

  country_code text,

  country_name text,

  city text,

  timezone text,

  languages text[]
    default '{}',

  introduction text,

  website_url text,

  logo_url text,

  created_at timestamptz
    default now()

);


-- =============================================
-- TEACHERS
-- =============================================

create table if not exists public.teachers (

  id uuid primary key
    default gen_random_uuid(),

  user_id uuid
    references auth.users(id)
    on delete set null,

  school_id uuid
    references public.schools(id)
    on delete cascade,

  display_name text not null,

  email text,

  languages text[]
    default '{}',

  can_facilitate boolean
    default false,

  created_at timestamptz
    default now()

);


-- =============================================
-- EVENTS
-- =============================================

create table if not exists public.events (

  id uuid primary key
    default gen_random_uuid(),

  title text not null,

  event_type text not null,

  host_school_id uuid
    references public.schools(id)
    on delete set null,

  starts_at timestamptz,

  duration_minutes integer
    default 50,

  meeting_platform text
    default 'Zoom',

  meeting_url text,

  status text
    default 'draft',

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    default now()

);


-- =============================================
-- PARTICIPANTS
-- =============================================

create table if not exists public.participants (

  id uuid primary key
    default gen_random_uuid(),

  school_id uuid
    references public.schools(id)
    on delete cascade,

  display_name text not null,

  grade text,

  language_level text,

  created_at timestamptz
    default now()

);


-- =============================================
-- EVENT PARTICIPANTS
-- =============================================

create table if not exists public.event_participants (

  id uuid primary key
    default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  participant_id uuid not null
    references public.participants(id)
    on delete cascade,

  participant_role text
    default 'guest',

  created_at timestamptz
    default now()

);


-- =============================================
-- ROUNDS
-- =============================================

create table if not exists public.rounds (

  id uuid primary key
    default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  round_number integer not null,

  title text,

  assignment_mode text
    default 'international_mix',

  starts_at timestamptz,

  duration_minutes integer,

  created_at timestamptz
    default now()

);


-- =============================================
-- ROOMS
-- =============================================

create table if not exists public.rooms (

  id uuid primary key
    default gen_random_uuid(),

  round_id uuid not null
    references public.rounds(id)
    on delete cascade,

  room_name text not null,

  activity_name text,

  capacity integer
    default 6,

  facilitator_teacher_id uuid
    references public.teachers(id)
    on delete set null,

  meeting_url text,

  created_at timestamptz
    default now()

);


-- =============================================
-- ROOM ASSIGNMENTS
-- =============================================

create table if not exists public.room_assignments (

  id uuid primary key
    default gen_random_uuid(),

  room_id uuid not null
    references public.rooms(id)
    on delete cascade,

  event_participant_id uuid not null
    references public.event_participants(id)
    on delete cascade,

  assignment_role text
    default 'guest',

  created_at timestamptz
    default now()

);