-- Registration consent is stored by the database, not trusted as mutable user metadata.
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  purpose text not null check(purpose in ('account','booking')),
  version text not null,
  accepted_at timestamptz not null default now()
);
create index user_consents_user_idx on public.user_consents(user_id,accepted_at);
alter table public.user_consents enable row level security;
revoke all on public.user_consents from public,anon,authenticated;
grant select on public.user_consents to authenticated;
create policy consents_own on public.user_consents for select using(public.q_active() and user_id=auth.uid());

-- Backfill existing identities without inventing historical consent.
insert into public.users(id,name,phone)
select id,left(trim(coalesce(raw_user_meta_data->>'name','')),100),phone from auth.users
on conflict(id) do nothing;

create or replace function public.q_new_user() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare approved_version text;
begin
  select consent_version into approved_version from public.runtime_settings where id and legal_approved;
  if approved_version is null
    or coalesce(new.raw_user_meta_data->>'consent','false') <> 'true'
    or new.raw_user_meta_data->>'consent_version' is distinct from approved_version
  then raise exception 'QLINE_CONSENT_REQUIRED';end if;
  insert into public.users(id,name,phone)
  values(new.id,left(trim(coalesce(new.raw_user_meta_data->>'name','')),100),new.phone);
  insert into public.user_consents(user_id,purpose,version) values(new.id,'account',approved_version);
  return new;
end$$;
revoke all on function public.q_new_user() from public,anon,authenticated;

-- Review collection is not enabled: do not expose patient/appointment UUIDs through direct reads.
revoke select on public.reviews from anon,authenticated;

-- These were editor suggestions, not verified partner prices or photographs.
update public.services set price=0;
alter table public.services alter column price set default 0;
alter table public.clinics alter column image set default '';
update public.clinics set image='' where image in ('clinic-1.png','clinic-2.png','clinic-3.png');
