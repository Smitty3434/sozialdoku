-- Fix Supabase warning:
-- Security Definer View public.v_dokumentation_chronologisch
--
-- The existing view definition is preserved. This changes only the view
-- execution mode so queries run with the permissions and RLS context of the
-- calling user.

alter view public.v_dokumentation_chronologisch
  set (security_invoker = true);

-- Optional verification after running the migration:
--
-- select
--   n.nspname as schema_name,
--   c.relname as view_name,
--   coalesce(c.reloptions::text, '{}') as reloptions
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relname = 'v_dokumentation_chronologisch';
--
-- Check RLS on likely underlying tables used by the chronological
-- documentation view:
--
-- select
--   n.nspname as schema_name,
--   c.relname as table_name,
--   c.relrowsecurity as rls_enabled,
--   c.relforcerowsecurity as rls_forced
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relkind = 'r'
--   and c.relname in ('dokumentationen', 'klienten', 'nutzer')
-- order by c.relname;
