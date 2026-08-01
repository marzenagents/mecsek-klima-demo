-- Mecsek Klíma – Pilot-ready v4 Supabase séma
-- Futtasd a Supabase SQL Editorban egy üres vagy külön pilotprojektben.
-- A séma Auth + RLS segítségével cégenként választja szét az adatokat.

create extension if not exists pgcrypto;

create table if not exists public.mecsek_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  public_intake_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mecsek_workspace_members (
  workspace_id uuid not null references public.mecsek_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'member')) default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- A kliens jelenlegi pilotállapota munkaterületenként egy dokumentumban marad.
-- Az új, nyilvános érdeklődők már külön táblába kerülnek, így nem vesznek el
-- párhuzamos ajánlatkérések esetén sem. A következő körben a teljes állapot is
-- tovább normalizálható modulonkénti táblákra.
create table if not exists public.mecsek_demo_state (
  workspace_id uuid primary key references public.mecsek_workspaces(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.mecsek_intake_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mecsek_workspaces(id) on delete cascade,
  lead_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, lead_id)
);

create index if not exists idx_mecsek_members_user
  on public.mecsek_workspace_members (user_id, workspace_id);
create index if not exists idx_mecsek_intake_workspace_created
  on public.mecsek_intake_leads (workspace_id, created_at desc);
create index if not exists idx_mecsek_state_updated
  on public.mecsek_demo_state (updated_at desc);

alter table public.mecsek_workspaces enable row level security;
alter table public.mecsek_workspace_members enable row level security;
alter table public.mecsek_demo_state enable row level security;
alter table public.mecsek_intake_leads enable row level security;

create or replace function public.mecsek_has_workspace_access(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mecsek_workspace_members member
    where member.workspace_id = target_workspace
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.mecsek_is_workspace_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mecsek_workspace_members member
    where member.workspace_id = target_workspace
      and member.user_id = auth.uid()
      and member.role = 'owner'
  );
$$;

revoke all on function public.mecsek_has_workspace_access(uuid) from public;
revoke all on function public.mecsek_is_workspace_owner(uuid) from public;
grant execute on function public.mecsek_has_workspace_access(uuid) to authenticated;
grant execute on function public.mecsek_is_workspace_owner(uuid) to authenticated;

drop policy if exists "workspace members can read workspace" on public.mecsek_workspaces;
create policy "workspace members can read workspace"
  on public.mecsek_workspaces for select to authenticated
  using (public.mecsek_has_workspace_access(id));

drop policy if exists "members can read their team" on public.mecsek_workspace_members;
create policy "members can read their team"
  on public.mecsek_workspace_members for select to authenticated
  using (public.mecsek_has_workspace_access(workspace_id));

drop policy if exists "owners can add members" on public.mecsek_workspace_members;
create policy "owners can add members"
  on public.mecsek_workspace_members for insert to authenticated
  with check (public.mecsek_is_workspace_owner(workspace_id));

drop policy if exists "owners can update members" on public.mecsek_workspace_members;
create policy "owners can update members"
  on public.mecsek_workspace_members for update to authenticated
  using (public.mecsek_is_workspace_owner(workspace_id))
  with check (public.mecsek_is_workspace_owner(workspace_id));

drop policy if exists "owners can remove members" on public.mecsek_workspace_members;
create policy "owners can remove members"
  on public.mecsek_workspace_members for delete to authenticated
  using (public.mecsek_is_workspace_owner(workspace_id));

drop policy if exists "members can read pilot state" on public.mecsek_demo_state;
create policy "members can read pilot state"
  on public.mecsek_demo_state for select to authenticated
  using (public.mecsek_has_workspace_access(workspace_id));

drop policy if exists "members can create pilot state" on public.mecsek_demo_state;
create policy "members can create pilot state"
  on public.mecsek_demo_state for insert to authenticated
  with check (public.mecsek_has_workspace_access(workspace_id));

drop policy if exists "members can update pilot state" on public.mecsek_demo_state;
create policy "members can update pilot state"
  on public.mecsek_demo_state for update to authenticated
  using (public.mecsek_has_workspace_access(workspace_id))
  with check (public.mecsek_has_workspace_access(workspace_id));

drop policy if exists "owners can clear pilot state" on public.mecsek_demo_state;
create policy "owners can clear pilot state"
  on public.mecsek_demo_state for delete to authenticated
  using (public.mecsek_is_workspace_owner(workspace_id));

drop policy if exists "members can read intake leads" on public.mecsek_intake_leads;
create policy "members can read intake leads"
  on public.mecsek_intake_leads for select to authenticated
  using (public.mecsek_has_workspace_access(workspace_id));

drop policy if exists "members can update intake leads" on public.mecsek_intake_leads;
create policy "members can update intake leads"
  on public.mecsek_intake_leads for update to authenticated
  using (public.mecsek_has_workspace_access(workspace_id))
  with check (public.mecsek_has_workspace_access(workspace_id));

drop policy if exists "owners can delete intake leads" on public.mecsek_intake_leads;
create policy "owners can delete intake leads"
  on public.mecsek_intake_leads for delete to authenticated
  using (public.mecsek_is_workspace_owner(workspace_id));

-- A nyilvános űrlap kizárólag ezen az ellenőrzött függvényen keresztül írhat.
-- Közvetlen anon insert jogosultság nincs a táblán.
create or replace function public.mecsek_submit_public_lead(
  p_workspace_id uuid,
  p_payload jsonb,
  p_honeypot text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_lead_id text;
begin
  if coalesce(trim(p_honeypot), '') <> '' then
    raise exception 'A beküldés nem fogadható el.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload) <> 'object'
    or length(trim(coalesce(p_payload->>'name', ''))) < 2
    or length(regexp_replace(coalesce(p_payload->>'phone', ''), '[^0-9]', '', 'g')) < 9
    or length(trim(coalesce(p_payload->>'city', ''))) < 2
    or length(trim(coalesce(p_payload->>'service', ''))) < 2 then
    raise exception 'Hiányos vagy hibás ajánlatkérés.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.mecsek_workspaces
    where id = p_workspace_id and public_intake_enabled = true
  ) then
    raise exception 'Az ajánlatkérés jelenleg nem elérhető.' using errcode = '42501';
  end if;

  generated_lead_id := 'MK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  p_payload := jsonb_set(p_payload, '{id}', to_jsonb(generated_lead_id), true);

  insert into public.mecsek_intake_leads (workspace_id, lead_id, payload)
  values (p_workspace_id, generated_lead_id, p_payload);

  return generated_lead_id;
end;
$$;

revoke all on function public.mecsek_submit_public_lead(uuid, jsonb, text) from public;
grant execute on function public.mecsek_submit_public_lead(uuid, jsonb, text) to anon, authenticated;

grant select on public.mecsek_workspaces to authenticated;
grant select, insert, update, delete on public.mecsek_workspace_members to authenticated;
grant select, insert, update, delete on public.mecsek_demo_state to authenticated;
grant select, update, delete on public.mecsek_intake_leads to authenticated;

-- EGYSZERI PILOT-BEÁLLÍTÁS (a saját értékeiddel futtasd):
-- 1) Hozd létre az első munkaterületet, és másold ki az id értékét.
-- insert into public.mecsek_workspaces (slug, name)
-- values ('mecsek-klima', 'Mecsek Klíma') returning id;
--
-- 2) A tulajdonos első magic-linkes belépése után rendeld hozzá a munkaterülethez.
-- insert into public.mecsek_workspace_members (workspace_id, user_id, email, role)
-- select '<WORKSPACE_UUID>', id, email, 'owner'
-- from auth.users where email = 'tulajdonos@example.hu';
