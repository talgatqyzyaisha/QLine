-- Test-only substitute for the managed auth schema. Never apply to Supabase itself.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(
 id uuid primary key,
 email text,
 phone text,
 raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
grant usage on schema public,auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
