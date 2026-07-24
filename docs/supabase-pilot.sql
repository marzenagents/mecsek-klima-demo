-- Mecsek Klíma pilot állapottábla.
-- A kliens egy munkaterület teljes demóállapotát egy JSONB dokumentumban tárolja.
-- Ez a minimális pilot séma nem helyettesít egy normalizált, auditált éles adatmodellt.

create table if not exists public.mecsek_demo_state (
  workspace_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mecsek_demo_state enable row level security;

-- FONTOS:
-- Éles használat előtt Supabase Auth szükséges, és a hozzáférést hitelesített
-- felhasználóhoz/munkaterülethez kötött RLS-szabállyal kell engedélyezni.
-- Az anon szerepkör számára ne adj általános olvasási vagy írási jogosultságot.

create index if not exists mecsek_demo_state_updated_at_idx
  on public.mecsek_demo_state (updated_at desc);
