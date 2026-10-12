-- ==============================================================================
-- PASTRIMI I TË DHËNAVE TESTUESE (para nisjes zyrtare)
-- ==============================================================================
-- ⚠️ E PAKTHYESHME. Ekzekutojeni NJË HERË, me dorë, te Supabase → SQL Editor.
--    Ky skedar NUK është pjesë e schema.sql dhe nuk ekzekutohet kurrë automatikisht.
--    Nuk krijon asnjë funksion/RPC: vetëm pronari i databazës mund ta ekzekutojë.
--
-- Fshihen:  expenses, expense_splits (me cascade), settlements
-- Mbeten:   llogaritë (auth.users), profiles, households (kodet e ftesës), fotot e profilit,
--           njoftimet push (user_push_subscriptions, user_expo_push_tokens)
--
-- Borxhet llogariten nga shpenzimet dhe pagesat, prandaj pas pastrimit të gjithë kanë 0.00 €.
-- Triggerët e njoftimeve janë vetëm për INSERT, ndaj fshirja nuk dërgon njoftime.
-- Dashboard-et e hapura rifreskohen vetë (Realtime).

-- 1. Para pastrimit: sa rreshta do të fshihen
select
  (select count(*) from public.expenses)       as expenses,
  (select count(*) from public.expense_splits) as expense_splits,
  (select count(*) from public.settlements)    as settlements;

-- 2. Pastrimi, në një transaksion të vetëm (ose fshihet gjithçka, ose asgjë)
begin;

delete from public.expense_splits;
delete from public.expenses;
delete from public.settlements;

-- Numërimi i id-ve fillon nga 1 për të dhënat e vërteta
alter table public.expenses    alter column id restart with 1;
alter table public.settlements alter column id restart with 1;

commit;

-- 3. Kontrolli: të gjitha duhet të jenë 0, ndërsa profilet dhe banesat mbeten
select
  (select count(*) from public.expenses)       as expenses,
  (select count(*) from public.expense_splits) as expense_splits,
  (select count(*) from public.settlements)    as settlements,
  (select count(*) from public.profiles)       as profiles_mbeten,
  (select count(*) from public.households)     as banesat_mbeten;
