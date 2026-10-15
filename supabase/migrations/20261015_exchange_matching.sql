-- Global Classroom Connect - host-managed availability and shortlist only.
-- No existing tables or rows are modified.
create table if not exists public.exchange_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  timezone text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  student_count integer not null check (student_count between 1 and 500),
  room_count integer not null default 1 check (room_count between 1 and 100),
  age_band text not null check (age_band in ('Primary','Lower Secondary','Upper Secondary','University','Mixed')),
  topic text not null default '' check (char_length(topic)<=120),
  notes text not null default '' check (char_length(notes)<=500),
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exchange_availability_window_valid check (
    ends_at > starts_at and ends_at <= starts_at + interval '6 hours'
  )
);
create index if not exists exchange_availability_start_idx on public.exchange_availability(starts_at);
create index if not exists exchange_availability_teacher_idx on public.exchange_availability(teacher_id);
alter table public.exchange_availability enable row level security;

create table if not exists public.exchange_shortlists (
  id uuid primary key default gen_random_uuid(),
  offer_a uuid not null references public.exchange_availability(id) on delete cascade,
  offer_b uuid not null references public.exchange_availability(id) on delete cascade,
  overlap_start timestamptz not null,
  overlap_end timestamptz not null,
  score integer not null check (score between 0 and 100),
  status text not null default 'shortlisted' check (status in ('shortlisted')),
  created_at timestamptz not null default now(),
  constraint exchange_shortlists_pair_order check (offer_a < offer_b),
  constraint exchange_shortlists_pair_unique unique(offer_a,offer_b),
  constraint exchange_shortlists_time_valid check(overlap_end>overlap_start)
);
alter table public.exchange_shortlists enable row level security;

-- Only authenticated hosts may view and manage teacher availability.
-- Not accessible to anonymous visitors or unapproved teacher registrations.
drop policy if exists "GCC hosts manage exchange availability" on public.exchange_availability;
create policy "GCC hosts manage exchange availability" on public.exchange_availability
 for all to authenticated
 using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'))
 with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'));
drop policy if exists "GCC hosts manage shortlists" on public.exchange_shortlists;
create policy "GCC hosts manage shortlists" on public.exchange_shortlists
 for all to authenticated
 using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'))
 with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'));

grant select,insert,update,delete on public.exchange_availability to authenticated;
grant select,insert,update,delete on public.exchange_shortlists to authenticated;
