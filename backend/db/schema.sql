-- =====================================================================
-- Esquema Postgres (Supabase) para la Hoja de Personaje D&D 2024.
--
-- Refleja los dos scopes de la especificación (docs/integration-prompt.md
-- §2.2): columnas RELACIONALES para lo que se lista/filtra/comparte y una
-- columna JSONB "sheet" DOCUMENTAL para el payload narrativo/fluido.
--
-- Se apoya en Supabase Auth: auth.users ya existe; aquí solo referenciamos
-- su id (uuid). Row Level Security garantiza que cada quien vea lo suyo.
-- Ejecutar con:  psql "$DATABASE_URL" -f db/schema.sql   (o npm run migrate)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- CATÁLOGOS (contenido de reglas — key estable, no texto libre)
-- Se siembran desde el backend (src/rules-data.js). Sirven de fuente de
-- verdad para validar que un personaje solo referencie conceptos reales.
-- ---------------------------------------------------------------------
create table if not exists rule_spells (
  key         text primary key,
  name        text not null,
  level       int  not null check (level between 0 and 9),
  school      text not null,
  classes     text[] not null default '{}',
  data        jsonb not null default '{}'::jsonb   -- casting_time, range, concentration, summary...
);

create table if not exists rule_items (
  key         text primary key,
  name        text not null,
  category    text not null check (category in ('armor','shield','weapon','gear')),
  data        jsonb not null default '{}'::jsonb   -- armor/weapon/shieldBonus/acBonus...
);

-- ---------------------------------------------------------------------
-- CAMPAÑAS (multi-usuario: un DM agrupa personajes de varios jugadores)
-- ---------------------------------------------------------------------
create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,                 -- el DM (auth.users.id)
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists campaign_members (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id     uuid not null,
  role        text not null default 'player' check (role in ('dm','player')),
  joined_at   timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- ---------------------------------------------------------------------
-- PERSONAJES
--   Columnas relacionales = el "índice" liviano (listar/filtrar sin abrir
--   el payload). Columna sheet (jsonb) = el documento completo de la Parte
--   1.2 de la spec (identity, abilities, inventory, spellsKnown, notas...).
-- ---------------------------------------------------------------------
create table if not exists characters (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null,                 -- dueño (auth.users.id)
  campaign_id  uuid references campaigns(id) on delete set null,
  -- Índice denormalizado (se recalcula desde sheet en cada escritura):
  name         text not null default 'Sin nombre',
  class_key    text,
  species_key  text,
  background_key text,
  level        int not null default 1 check (level between 1 and 20),
  -- Documento completo:
  sheet        jsonb not null default '{}'::jsonb,
  version      int  not null default 1,        -- control de concurrencia (§2.4)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists characters_owner_idx    on characters(owner_id);
create index if not exists characters_campaign_idx on characters(campaign_id);

-- updated_at automático
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists characters_touch on characters;
create trigger characters_touch before update on characters
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
--   El dueño puede todo sobre su personaje. Un miembro de la campaña con
--   rol 'dm' puede LEER (no editar) los personajes de esa campaña.
--   (Bajo Supabase, auth.uid() devuelve el id del usuario del JWT.)
-- ---------------------------------------------------------------------
alter table characters      enable row level security;
alter table campaigns       enable row level security;
alter table campaign_members enable row level security;

drop policy if exists char_owner_all on characters;
create policy char_owner_all on characters
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists char_dm_read on characters;
create policy char_dm_read on characters
  for select using (
    campaign_id in (
      select campaign_id from campaign_members
      where user_id = auth.uid() and role = 'dm'
    )
  );

drop policy if exists camp_member_read on campaigns;
create policy camp_member_read on campaigns
  for select using (
    owner_id = auth.uid()
    or id in (select campaign_id from campaign_members where user_id = auth.uid())
  );

drop policy if exists camp_owner_write on campaigns;
create policy camp_owner_write on campaigns
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists cm_self_read on campaign_members;
create policy cm_self_read on campaign_members
  for select using (
    user_id = auth.uid()
    or campaign_id in (select id from campaigns where owner_id = auth.uid())
  );

-- Los catálogos son de solo lectura pública (contenido de reglas SRD).
alter table rule_spells enable row level security;
alter table rule_items  enable row level security;
drop policy if exists spells_read on rule_spells;
create policy spells_read on rule_spells for select using (true);
drop policy if exists items_read on rule_items;
create policy items_read on rule_items for select using (true);
