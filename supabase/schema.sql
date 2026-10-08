-- ==============================================================================
-- KALKULIMI - SKEMA E SUPABASE (Multi-user Household Sync)
-- ==============================================================================
-- Ekzekutojeni të gjithë këtë skedar një herë te: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Skedari është idempotent: mund të ekzekutohet sërish pa prishur të dhënat ekzistuese.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELAT
-- ------------------------------------------------------------------------------

-- Banesat (Households) me kod unik ftese, p.sh. "BANESA-4821"
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 80),
  code        text not null unique,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Profili publik i çdo përdoruesi (krijohet automatikisht pas regjistrimit)
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null,
  email         text,
  household_id  uuid references public.households (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists profiles_household_idx on public.profiles (household_id);

-- Shpenzimet (personale ose të përbashkëta)
create table if not exists public.expenses (
  id            bigint generated always as identity primary key,
  household_id  uuid not null references public.households (id) on delete cascade,
  paid_by       uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(trim(title)) between 1 and 120),
  total_amount  numeric(10, 2) not null check (total_amount > 0),
  category      text not null default 'Të tjera',
  is_personal   boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists expenses_household_idx on public.expenses (household_id, created_at desc);

-- Kush e regjistroi shpenzimin (mund të jetë i ndryshëm nga ai që e pagoi)
alter table public.expenses
  add column if not exists created_by uuid references public.profiles (id) on delete set null;
update public.expenses set created_by = paid_by where created_by is null;

-- Data e shpenzimit (p.sh. fatura e shtatorit e regjistruar më 3 tetor). Të vjetrat marrin ditën e regjistrimit.
alter table public.expenses add column if not exists expense_date date;
update public.expenses
  set expense_date = (created_at at time zone 'Europe/Belgrade')::date
  where expense_date is null;
alter table public.expenses alter column expense_date set default current_date;
alter table public.expenses alter column expense_date set not null;
create index if not exists expenses_household_date_idx on public.expenses (household_id, expense_date desc);

-- Mënyra e ndarjes: 'equal' (barabartë), 'exact' (shuma të sakta), 'percent' (përqindje)
alter table public.expenses
  add column if not exists split_mode text not null default 'equal'
  check (split_mode in ('equal', 'exact', 'percent'));

-- Pjesa që i takon secilit anëtar nga një shpenzim i përbashkët
create table if not exists public.expense_splits (
  expense_id   bigint not null references public.expenses (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  amount_owed  numeric(10, 2) not null check (amount_owed >= 0),
  primary key (expense_id, user_id)
);
create index if not exists expense_splits_user_idx on public.expense_splits (user_id);

-- Pagesat e kthimit të borxhit ("Laje Borxhin"): from_user i dha para to_user
create table if not exists public.settlements (
  id            bigint generated always as identity primary key,
  household_id  uuid not null references public.households (id) on delete cascade,
  from_user     uuid not null references public.profiles (id) on delete cascade,
  to_user       uuid not null references public.profiles (id) on delete cascade,
  amount        numeric(10, 2) not null check (amount > 0),
  created_by    uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  check (from_user <> to_user)
);
create index if not exists settlements_household_idx on public.settlements (household_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 2. FUNKSIONE NDIHMËSE
-- ------------------------------------------------------------------------------

-- Kthen banesën e përdoruesit të kyçur (security definer -> shmang rekursionin e RLS te profiles)
create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- Gjeneron një kod unik të formës BANESA-1234 (zgjerohet automatikisht nëse mbushen kodet 4-shifrore)
create or replace function public.generate_household_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
  digits int := 4;
  attempts int := 0;
begin
  loop
    candidate := 'BANESA-' || lpad(floor(random() * power(10, digits))::int::text, digits, '0');
    exit when not exists (select 1 from public.households where code = candidate);
    attempts := attempts + 1;
    if attempts % 20 = 0 then
      digits := digits + 1;
    end if;
  end loop;
  return candidate;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. PROFILI AUTOMATIK PAS REGJISTRIMIT
-- ------------------------------------------------------------------------------
-- Nëse gjatë regjistrimit është dhënë një kod banese i vlefshëm (metadata.household_code),
-- përdoruesi bashkohet automatikisht me atë banesë.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  joined_household uuid;
begin
  select id into joined_household
  from public.households
  where code = upper(trim(coalesce(new.raw_user_meta_data ->> 'household_code', '')));

  insert into public.profiles (id, name, email, household_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    joined_household
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4. RPC: KRIJO / BASHKOHU / LARGOHU NGA BANESA
-- ------------------------------------------------------------------------------
create or replace function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households;
begin
  if auth.uid() is null then
    raise exception 'Nuk jeni të kyçur.';
  end if;

  insert into public.households (name, code, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Banesa Jonë'), public.generate_household_code(), auth.uid())
  returning * into new_household;

  update public.profiles set household_id = new_household.id where id = auth.uid();
  return new_household;
end;
$$;

create or replace function public.join_household(p_code text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.households;
begin
  if auth.uid() is null then
    raise exception 'Nuk jeni të kyçur.';
  end if;

  select * into target from public.households where code = upper(trim(p_code));
  if target.id is null then
    raise exception 'Kodi i banesës nuk ekziston. Kontrollojeni dhe provoni sërish.';
  end if;

  update public.profiles set household_id = target.id where id = auth.uid();
  return target;
end;
$$;

-- Borxhet dypalëshe të përdoruesit të kyçur (e njëjta logjikë si frontend/src/utils/balances.js)
-- net > 0: tjetri më ka borxh mua; net < 0: unë i kam borxh tjetrit
create or replace function public.my_balances()
returns table (other_user uuid, net numeric)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id, public.my_household_id() as hh),
  flows as (
    -- Unë pagova: të tjerët më kanë borxh pjesën e tyre
    select s.user_id as other, s.amount_owed as amt
    from public.expenses e
    join public.expense_splits s on s.expense_id = e.id
    cross join me
    where e.household_id = me.hh and not e.is_personal and e.paid_by = me.id and s.user_id <> me.id
    union all
    -- Dikush tjetër pagoi: unë i kam borxh pjesën time
    select e.paid_by, -s.amount_owed
    from public.expenses e
    join public.expense_splits s on s.expense_id = e.id
    cross join me
    where e.household_id = me.hh and not e.is_personal and e.paid_by <> me.id and s.user_id = me.id
    union all
    select st.to_user, st.amount from public.settlements st cross join me
    where st.household_id = me.hh and st.from_user = me.id
    union all
    select st.from_user, -st.amount from public.settlements st cross join me
    where st.household_id = me.hh and st.to_user = me.id
  )
  select other, sum(amt) from flows group by other having abs(sum(amt)) >= 0.01;
$$;

-- Largimi lejohet vetëm kur të gjitha borxhet janë larë (përndryshe shokët mbeten me borxhe që s'mund t'i lajnë)
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.my_balances()) then
    raise exception 'Nuk mund të largohesh nga banesa pa i larë më parë të gjitha borxhet (bilanci duhet të jetë 0.00 € me secilin shok).';
  end if;
  update public.profiles set household_id = null where id = auth.uid();
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: RUAJ SHPENZIMIN + NDARJET NË NJË TRANSAKSION
-- ------------------------------------------------------------------------------
-- p_id = null -> krijim i ri; p_id = <id> -> përditësim (nga paguesi ose nga ai që e regjistroi)
-- p_member_ids = anëtarët mes të cilëve ndahet (injorohet për shpenzimet personale)
-- p_paid_by    = kush e pagoi (null -> përdoruesi i kyçur); shpenzimet personale paguhen gjithmonë nga vetja
-- p_expense_date = data e shpenzimit (null -> sot gjatë krijimit / pa ndryshim gjatë përditësimit)
-- p_split_mode   = 'equal' | 'exact' | 'percent'
-- p_split_amounts = shumat në euro për secilin nga p_member_ids (në të njëjtin rend), për 'exact' / 'percent'.
--                   Aplikacioni i kthen përqindjet në euro; databaza kontrollon që shuma = totali.

-- Versionet e vjetra hiqen, përndryshe PostgREST nuk di cilin të thërrasë
drop function if exists public.save_expense(bigint, text, numeric, text, boolean, uuid[]);
drop function if exists public.save_expense(bigint, text, numeric, text, boolean, uuid[], uuid);
drop function if exists public.save_expense(bigint, text, numeric, text, boolean, uuid[], uuid, date);

create or replace function public.save_expense(
  p_id bigint,
  p_title text,
  p_total_amount numeric,
  p_category text,
  p_is_personal boolean,
  p_member_ids uuid[],
  p_paid_by uuid default null,
  p_expense_date date default null,
  p_split_mode text default 'equal',
  p_split_amounts numeric[] default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  hh uuid := public.my_household_id();
  saved public.expenses;
  payer uuid := coalesce(p_paid_by, auth.uid());
  mode text := case when coalesce(p_is_personal, false) then 'equal' else coalesce(p_split_mode, 'equal') end;
  members uuid[];
  member_count int;
  base_share numeric(10, 2);
  i int;
begin
  if auth.uid() is null then
    raise exception 'Nuk jeni të kyçur.';
  end if;
  if hh is null then
    raise exception 'Duhet të jeni pjesë e një banese për të shtuar shpenzime.';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Ju lutem vendosni një shumë pozitive në euro.';
  end if;
  if coalesce(p_is_personal, false) and payer <> auth.uid() then
    raise exception 'Shpenzimi individual mund të paguhet vetëm nga ti.';
  end if;
  if not exists (select 1 from public.profiles where id = payer and household_id = hh) then
    raise exception 'Personi që e pagoi nuk është anëtar i banesës.';
  end if;
  if p_expense_date > current_date + 1 then
    raise exception 'Data e shpenzimit nuk mund të jetë në të ardhmen.';
  end if;
  if mode not in ('equal', 'exact', 'percent') then
    raise exception 'Mënyrë e panjohur ndarjeje.';
  end if;

  if p_id is null then
    insert into public.expenses (household_id, paid_by, created_by, title, total_amount, category, is_personal, expense_date, split_mode)
    values (hh, payer, auth.uid(), trim(p_title), round(p_total_amount, 2), coalesce(p_category, 'Të tjera'), coalesce(p_is_personal, false), coalesce(p_expense_date, current_date), mode)
    returning * into saved;
  else
    update public.expenses
    set paid_by = payer,
        title = trim(p_title),
        total_amount = round(p_total_amount, 2),
        category = coalesce(p_category, 'Të tjera'),
        is_personal = coalesce(p_is_personal, false),
        expense_date = coalesce(p_expense_date, expense_date),
        split_mode = mode
    where id = p_id
      and household_id = hh
      and (paid_by = auth.uid() or created_by = auth.uid())
    returning * into saved;

    if saved.id is null then
      raise exception 'Shpenzimi nuk u gjet ose nuk keni të drejtë ta ndryshoni.';
    end if;

    delete from public.expense_splits where expense_id = saved.id;
  end if;

  if not saved.is_personal and mode <> 'equal' then
    -- Ndarje e personalizuar: shumat vijnë nga aplikacioni, databaza i kontrollon
    if coalesce(cardinality(p_member_ids), 0) = 0
       or p_split_amounts is null
       or cardinality(p_split_amounts) <> cardinality(p_member_ids) then
      raise exception 'Shumat e ndarjes nuk përputhen me anëtarët e zgjedhur.';
    end if;
    if (select count(distinct m) from unnest(p_member_ids) m) <> cardinality(p_member_ids) then
      raise exception 'Një anëtar është zgjedhur dy herë në ndarje.';
    end if;
    if exists (
      select 1 from unnest(p_member_ids) m
      where not exists (select 1 from public.profiles p where p.id = m and p.household_id = hh)
    ) then
      raise exception 'Ndarja përfshin dikë që nuk është anëtar i banesës.';
    end if;
    if exists (select 1 from unnest(p_split_amounts) a where a is null or a < 0 or a <> round(a, 2)) then
      raise exception 'Pjesët e ndarjes duhet të jenë shuma pozitive me deri në 2 decimale.';
    end if;
    if (select sum(a) from unnest(p_split_amounts) a) <> saved.total_amount then
      raise exception 'Pjesët e ndarjes (% €) nuk janë të barabarta me totalin (% €).',
        (select sum(a) from unnest(p_split_amounts) a), saved.total_amount;
    end if;

    insert into public.expense_splits (expense_id, user_id, amount_owed)
    select saved.id, m.id, m.amount
    from unnest(p_member_ids, p_split_amounts) as m (id, amount)
    where m.amount > 0;

  elsif not saved.is_personal then
    -- Lejohen vetëm anëtarët e së njëjtës banesë; nëse nuk zgjidhet askush, ndahet me të gjithë
    select array_agg(id order by created_at, id) into members
    from public.profiles
    where household_id = hh
      and (coalesce(cardinality(p_member_ids), 0) = 0 or id = any (p_member_ids));

    member_count := coalesce(cardinality(members), 0);
    if member_count = 0 then
      raise exception 'Zgjidhni të paktën një anëtar për ndarjen.';
    end if;

    base_share := trunc(saved.total_amount / member_count, 2);
    for i in 1 .. member_count loop
      insert into public.expense_splits (expense_id, user_id, amount_owed)
      values (
        saved.id,
        members[i],
        -- I fundit merr centët e mbetur që shuma e ndarjeve të jetë saktësisht totali
        case when i = member_count then saved.total_amount - base_share * (member_count - 1) else base_share end
      );
    end loop;
  end if;

  return saved;
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------
alter table public.households     enable row level security;
alter table public.profiles       enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements    enable row level security;

-- Banesat: shihet vetëm banesa ku bën pjesë
drop policy if exists "households_select_own" on public.households;
create policy "households_select_own" on public.households
  for select to authenticated
  using (id = public.my_household_id());

-- Profilet: veten dhe shokët e banesës
drop policy if exists "profiles_select_household" on public.profiles;
create policy "profiles_select_household" on public.profiles
  for select to authenticated
  using (id = auth.uid() or household_id = public.my_household_id());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Vetëm emri mund të ndryshohet direkt; banesa ndryshohet përmes RPC-ve
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- Shpenzimet: të përbashkëtat i sheh e gjithë banesa, personalet vetëm pronari
drop policy if exists "expenses_select_visible" on public.expenses;
create policy "expenses_select_visible" on public.expenses
  for select to authenticated
  using (
    household_id = public.my_household_id()
    and (is_personal = false or paid_by = auth.uid())
  );

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses
  for delete to authenticated
  using (
    household_id = public.my_household_id()
    and (paid_by = auth.uid() or created_by = auth.uid())
  );
-- INSERT / UPDATE bëhen vetëm përmes save_expense()

-- Ndarjet: të dukshme nëse shpenzimi është i dukshëm
drop policy if exists "splits_select_visible" on public.expense_splits;
create policy "splits_select_visible" on public.expense_splits
  for select to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and e.household_id = public.my_household_id()
        and (e.is_personal = false or e.paid_by = auth.uid())
    )
  );

-- Pagesat e borxhit: i sheh e gjithë banesa
drop policy if exists "settlements_select_household" on public.settlements;
create policy "settlements_select_household" on public.settlements
  for select to authenticated
  using (household_id = public.my_household_id());

-- Mund ta regjistrojë cilado palë (debitori "e pagova" ose kreditori "e mora")
drop policy if exists "settlements_insert_party" on public.settlements;
create policy "settlements_insert_party" on public.settlements
  for insert to authenticated
  with check (
    household_id = public.my_household_id()
    and created_by = auth.uid()
    and (from_user = auth.uid() or to_user = auth.uid())
    and exists (select 1 from public.profiles p where p.id = settlements.from_user and p.household_id = settlements.household_id)
    and exists (select 1 from public.profiles p where p.id = settlements.to_user and p.household_id = settlements.household_id)
  );

drop policy if exists "settlements_delete_creator" on public.settlements;
create policy "settlements_delete_creator" on public.settlements
  for delete to authenticated
  using (created_by = auth.uid());

-- ------------------------------------------------------------------------------
-- 7. TË DREJTAT E RPC-VE
-- ------------------------------------------------------------------------------
revoke execute on function public.create_household(text) from public, anon;
revoke execute on function public.join_household(text) from public, anon;
revoke execute on function public.leave_household() from public, anon;
revoke execute on function public.save_expense(bigint, text, numeric, text, boolean, uuid[], uuid, date, text, numeric[]) from public, anon;
revoke execute on function public.my_balances() from public, anon;
revoke execute on function public.generate_household_code() from public, anon, authenticated;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.save_expense(bigint, text, numeric, text, boolean, uuid[], uuid, date, text, numeric[]) to authenticated;
grant execute on function public.my_balances() to authenticated;

-- ------------------------------------------------------------------------------
-- 8. REALTIME (Dashboard-i rifreskohet automatikisht kur shoku shton diçka)
-- ------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['expenses', 'expense_splits', 'settlements', 'profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------------------------
-- 9. NJOFTIMET PUSH (Web Push)
-- ------------------------------------------------------------------------------
-- Çdo pajisje/shfletues ku përdoruesi ka aktivizuar njoftimet. `endpoint` është unik për pajisje.
create table if not exists public.user_push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.user_push_subscriptions (user_id);

alter table public.user_push_subscriptions enable row level security;

-- Përdoruesi sheh vetëm pajisjet e veta; shkrimi bëhet përmes RPC-ve më poshtë
drop policy if exists "push_subscriptions_select_own" on public.user_push_subscriptions;
create policy "push_subscriptions_select_own" on public.user_push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- Ruan (ose rilidh me përdoruesin aktual) subskriptimin e kësaj pajisjeje.
-- Kush e njeh `endpoint`-in e ka vetë pajisjen, ndaj lejohet ta marrë nga një llogari tjetër në të njëjtin shfletues.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nuk jeni të kyçur.';
  end if;
  if coalesce(p_endpoint, '') !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Subskriptim i pavlefshëm për njoftimet push.';
  end if;

  insert into public.user_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.user_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- Dërgimi: triggerët i çojnë ngjarjet te Edge Function `send-push` (supabase/functions/send-push).
-- Adresa dhe sekreti lexohen nga Vault (shih supabase/README.md). Pa to, triggerët nuk bëjnë asgjë.
create extension if not exists pg_net;

create or replace function public.notify_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  fn_secret text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if fn_url is null or fn_secret is null then
    return null;
  end if;

  -- pg_net e dërgon kërkesën asinkronisht pasi transaksioni të jetë ruajtur
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', fn_secret),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
    )
  );
  return null;
exception when others then
  raise warning 'notify_push: %', sqlerrm;
  return null;
end;
$$;

revoke execute on function public.notify_push() from public, anon, authenticated;

-- Funksion i sigurt vetëm për Edge Function (service_role) për të lexuar sekretet nga Vault
create or replace function public.get_push_secrets()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  res jsonb;
begin
  select jsonb_object_agg(name, decrypted_secret) into res
  from vault.decrypted_secrets
  where name in ('push_webhook_secret', 'vapid_public_key', 'vapid_private_key', 'vapid_subject');
  return coalesce(res, '{}'::jsonb);
end;
$$;

revoke execute on function public.get_push_secrets() from public, anon, authenticated;
grant execute on function public.get_push_secrets() to service_role;


-- Shpenzimet individuale (is_personal) nuk dërgojnë asnjë njoftim (privatësia)
drop trigger if exists push_on_expense_insert on public.expenses;
create trigger push_on_expense_insert
  after insert on public.expenses
  for each row when (not new.is_personal)
  execute function public.notify_push();

drop trigger if exists push_on_settlement_insert on public.settlements;
create trigger push_on_settlement_insert
  after insert on public.settlements
  for each row execute function public.notify_push();

-- Anëtar i ri: regjistrim me kod banese (insert) ose "Bashkohu" pas kyçjes (update)
drop trigger if exists push_on_profile_join_insert on public.profiles;
create trigger push_on_profile_join_insert
  after insert on public.profiles
  for each row when (new.household_id is not null)
  execute function public.notify_push();

drop trigger if exists push_on_profile_join_update on public.profiles;
create trigger push_on_profile_join_update
  after update of household_id on public.profiles
  for each row when (new.household_id is not null and new.household_id is distinct from old.household_id)
  execute function public.notify_push();

-- ------------------------------------------------------------------------------
-- 10. NJOFTIMET PUSH NË APLIKACIONIN MOBIL (Expo Push)
-- ------------------------------------------------------------------------------
-- Tokeni Expo i çdo telefoni ku përdoruesi ka aktivizuar njoftimet (ExponentPushToken[...]).
-- Dërgimi bëhet nga e njëjta Edge Function `send-push`, me të njëjtat triggerë si për web-in.
create table if not exists public.user_expo_push_tokens (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  token       text not null unique,
  platform    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists expo_push_tokens_user_idx on public.user_expo_push_tokens (user_id);

alter table public.user_expo_push_tokens enable row level security;

drop policy if exists "expo_push_tokens_select_own" on public.user_expo_push_tokens;
create policy "expo_push_tokens_select_own" on public.user_expo_push_tokens
  for select to authenticated
  using (user_id = auth.uid());

-- Si te web-i: tokeni i takon telefonit, ndaj rilidhet me llogarinë që kyçet në të
create or replace function public.save_expo_push_token(p_token text, p_platform text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nuk jeni të kyçur.';
  end if;
  if coalesce(p_token, '') !~ '^(Exponent|Expo)PushToken\[.+\]$' then
    raise exception 'Token i pavlefshëm për njoftimet push.';
  end if;

  insert into public.user_expo_push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, left(p_platform, 20))
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.delete_expo_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.user_expo_push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.save_expo_push_token(text, text) from public, anon;
revoke execute on function public.delete_expo_push_token(text) from public, anon;
grant execute on function public.save_expo_push_token(text, text) to authenticated;
grant execute on function public.delete_expo_push_token(text) to authenticated;
