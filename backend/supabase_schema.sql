-- Supabase schema for the MP CM Online grievance portal.
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Uses a service_role key on the backend, so no RLS policies are strictly
-- required; the permissive policies below let the anon key work too if you
-- ever query directly from a client.

create table if not exists public.grievances (
  ticket_id text primary key,
  dept_id text not null default '',
  district text not null default '',
  escalation_level int not null default 1,
  workflow_status text not null default 'open',
  mobile text not null default '',
  citizen_email text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_grievances_dept on public.grievances (dept_id);
create index if not exists idx_grievances_mobile on public.grievances (mobile);
create index if not exists idx_grievances_workflow on public.grievances (workflow_status);
create index if not exists idx_grievances_level on public.grievances (escalation_level);

alter table public.grievances enable row level security;

drop policy if exists "open read" on public.grievances;
create policy "open read" on public.grievances for select using (true);

drop policy if exists "open write" on public.grievances;
create policy "open write" on public.grievances for insert with check (true);

drop policy if exists "open update" on public.grievances;
create policy "open update" on public.grievances for update using (true) with check (true);

-- Evidence image bucket (public read so officers/citizens can open proofs).
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "public read evidence" on storage.objects;
create policy "public read evidence" on storage.objects
for select using (bucket_id = 'evidence');

drop policy if exists "service write evidence" on storage.objects;
create policy "service write evidence" on storage.objects
for insert with check (bucket_id = 'evidence');
