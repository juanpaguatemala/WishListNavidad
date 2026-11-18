-- =====================================================================
-- Mi Navidad Mágica — esquema inicial, RLS y políticas
-- =====================================================================
-- Principios:
--  * Cada padre/madre pertenece a un hogar (household). El hogar se
--    deriva SIEMPRE de auth.uid() en el servidor (ensure_household),
--    nunca de un ID enviado por el cliente.
--  * Datos visibles para niños (children/journeys/wishes) separados de
--    datos privados de padres (parent_wish_status).
--  * El token de aventura NUNCA se guarda en claro: solo su SHA-256 (hex).
--  * Los niños no tienen sesión de Supabase: su acceso pasa por rutas
--    server-side de Next.js que resuelven el hash del token.
--  * El rol anon no tiene ningún privilegio sobre las tablas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.parent_memberships (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index parent_memberships_user_idx on public.parent_memberships (user_id);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 40),
  adventure_token_hash text not null unique
    check (adventure_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index children_household_idx on public.children (household_id);

-- Un recorrido por niño. Se agregan preferred_name (el nombre/apodo que
-- escribe el niño, sin pisar la etiqueta del padre), current_step (para
-- retomar la aventura) y timestamps.
create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children (id) on delete cascade,
  preferred_name text check (preferred_name is null or char_length(preferred_name) between 1 and 40),
  favorite_christmas_aspect text check (
    favorite_christmas_aspect is null
    or favorite_christmas_aspect in ('familia', 'decorar', 'compartir', 'comida', 'regalos', 'tradiciones')
  ),
  special_memory text check (special_memory is null or char_length(special_memory) <= 500),
  tree_design jsonb not null default '[]'::jsonb check (
    jsonb_typeof(tree_design) = 'array' and jsonb_array_length(tree_design) <= 80
  ),
  current_step smallint not null default 0 check (current_step between 0 and 6),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  url text check (url is null or (char_length(url) <= 500 and url ~* '^https?://')),
  image_url text check (image_url is null or (char_length(image_url) <= 500 and image_url ~* '^https?://')),
  priority smallint not null default 2 check (priority between 1 and 3),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wishes_child_position_idx on public.wishes (child_id, position);

-- Datos privados de padres. Nunca se consultan desde rutas infantiles.
create table public.parent_wish_status (
  wish_id uuid primary key references public.wishes (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  purchase_status text not null default 'pendiente'
    check (purchase_status in ('pendiente', 'en_proceso', 'comprado', 'descartado')),
  private_note text check (private_note is null or char_length(private_note) <= 500),
  updated_at timestamptz not null default now()
);
create index parent_wish_status_household_idx on public.parent_wish_status (household_id);

-- ---------------------------------------------------------------------
-- Triggers utilitarios
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger children_updated_at before update on public.children
  for each row execute function public.set_updated_at();
create trigger journeys_updated_at before update on public.journeys
  for each row execute function public.set_updated_at();
create trigger wishes_updated_at before update on public.wishes
  for each row execute function public.set_updated_at();
create trigger parent_wish_status_updated_at before update on public.parent_wish_status
  for each row execute function public.set_updated_at();

-- Cada niño nace con su recorrido vacío.
create or replace function public.create_journey_for_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.journeys (child_id) values (new.id);
  return new;
end;
$$;

create trigger children_create_journey after insert on public.children
  for each row execute function public.create_journey_for_child();

-- El household_id de parent_wish_status se toma SIEMPRE del deseo,
-- ignorando el valor que mande el cliente.
create or replace function public.parent_wish_status_set_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  select c.household_id into hid
  from public.wishes w
  join public.children c on c.id = w.child_id
  where w.id = new.wish_id;

  if hid is null then
    raise exception 'wish not found' using errcode = '23503';
  end if;

  new.household_id := hid;
  return new;
end;
$$;

create trigger parent_wish_status_household before insert or update on public.parent_wish_status
  for each row execute function public.parent_wish_status_set_household();

-- ---------------------------------------------------------------------
-- Funciones de autorización
-- ---------------------------------------------------------------------
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_memberships m
    where m.household_id = hid
      and m.user_id = (select auth.uid())
  );
$$;

-- Devuelve el hogar del usuario autenticado; lo crea si no existe.
create or replace function public.ensure_household()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Evita crear dos hogares si llegan dos peticiones simultáneas.
  perform pg_advisory_xact_lock(hashtext('household:' || uid::text));

  select m.household_id into hid
  from public.parent_memberships m
  where m.user_id = uid
  order by m.created_at
  limit 1;

  if hid is null then
    insert into public.households default values returning id into hid;
    insert into public.parent_memberships (household_id, user_id, role)
    values (hid, uid, 'owner');
  end if;

  return hid;
end;
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.ensure_household() from public;
revoke all on function public.create_journey_for_child() from public;
revoke all on function public.parent_wish_status_set_household() from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.ensure_household() to authenticated;

-- ---------------------------------------------------------------------
-- Privilegios (mínimo privilegio, además de RLS)
-- ---------------------------------------------------------------------
revoke all on public.households, public.parent_memberships, public.children,
  public.journeys, public.wishes, public.parent_wish_status
  from anon, authenticated;

grant select on public.households to authenticated;
grant select on public.parent_memberships to authenticated;

-- Los padres no pueden leer el hash del token ni mover un niño de hogar.
grant select (id, household_id, display_name, created_at, updated_at) on public.children to authenticated;
grant insert (household_id, display_name, adventure_token_hash) on public.children to authenticated;
grant update (display_name, adventure_token_hash) on public.children to authenticated;
grant delete on public.children to authenticated;

-- Los padres leen recorridos y deseos; la escritura infantil pasa por el servidor.
grant select on public.journeys to authenticated;
grant select on public.wishes to authenticated;

grant select, insert, update, delete on public.parent_wish_status to authenticated;

-- service_role (solo servidor) para las rutas infantiles.
grant all on public.households, public.parent_memberships, public.children,
  public.journeys, public.wishes, public.parent_wish_status
  to service_role;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.parent_memberships enable row level security;
alter table public.children enable row level security;
alter table public.journeys enable row level security;
alter table public.wishes enable row level security;
alter table public.parent_wish_status enable row level security;

create policy households_select on public.households
  for select to authenticated
  using ((select public.is_household_member(id)));

create policy memberships_select_own on public.parent_memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy children_select on public.children
  for select to authenticated
  using ((select public.is_household_member(household_id)));

create policy children_insert on public.children
  for insert to authenticated
  with check ((select public.is_household_member(household_id)));

create policy children_update on public.children
  for update to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));

create policy children_delete on public.children
  for delete to authenticated
  using ((select public.is_household_member(household_id)));

create policy journeys_select on public.journeys
  for select to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = journeys.child_id
      and public.is_household_member(c.household_id)
  ));

create policy wishes_select on public.wishes
  for select to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = wishes.child_id
      and public.is_household_member(c.household_id)
  ));

create policy pws_select on public.parent_wish_status
  for select to authenticated
  using ((select public.is_household_member(household_id)));

create policy pws_insert on public.parent_wish_status
  for insert to authenticated
  with check ((select public.is_household_member(household_id)));

create policy pws_update on public.parent_wish_status
  for update to authenticated
  using ((select public.is_household_member(household_id)))
  with check ((select public.is_household_member(household_id)));

create policy pws_delete on public.parent_wish_status
  for delete to authenticated
  using ((select public.is_household_member(household_id)));
