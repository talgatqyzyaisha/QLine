-- Apply to a fresh Supabase project. No fictional clinics/patients are seeded here.
create extension if not exists btree_gist;
create type public.appointment_status as enum ('pending','confirmed','cancelled','completed','no_show');
create table public.users(id uuid primary key references auth.users(id) on delete cascade,name text not null default '' check(length(name)<=100),phone text,platform_admin boolean not null default false,blocked boolean not null default false,created_at timestamptz not null default now());
create table public.clinics(id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null check(length(name) between 1 and 100),city text not null check(city in ('almaty','astana')),district text not null default 'bostandyk',address_ru text not null,address_kz text not null,description_ru text not null default '',description_kz text not null default '',phone text,hours text not null default '09:00–18:00',approved boolean not null default false,image text not null default 'clinic-1.png',created_at timestamptz not null default now());
create table public.clinic_members(user_id uuid references public.users(id),clinic_id uuid references public.clinics(id),role text not null check(role in ('owner','administrator','dentist')),dentist_id uuid,primary key(user_id,clinic_id));
create table public.dentists(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id),name_ru text not null check(length(name_ru) between 1 and 100),name_kz text not null check(length(name_kz) between 1 and 100),specialty text not null default 'consult',unique(id,clinic_id));
alter table public.clinic_members add constraint member_dentist_fk foreign key(dentist_id,clinic_id) references public.dentists(id,clinic_id);
create table public.services(id text primary key,ru text not null,kz text not null,icon text not null default 'tooth',price integer not null default 0 check(price>=0),duration integer not null default 30 check(duration between 15 and 240));
create table public.clinic_services(clinic_id uuid references public.clinics(id),service_id text references public.services(id),price integer not null check(price>=0),duration integer not null check(duration between 15 and 240),primary key(clinic_id,service_id));
create table public.dentist_services(dentist_id uuid references public.dentists(id),service_id text references public.services(id),primary key(dentist_id,service_id));
create table public.working_hours(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id),dentist_id uuid not null,weekday integer not null check(weekday between 0 and 6),starts_at time not null,ends_at time not null,unique(dentist_id,weekday),foreign key(dentist_id,clinic_id) references public.dentists(id,clinic_id),check(starts_at<ends_at));
create table public.blocked_slots(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id),dentist_id uuid not null,starts_at timestamptz not null,ends_at timestamptz not null,foreign key(dentist_id,clinic_id) references public.dentists(id,clinic_id),check(starts_at<ends_at));
create table public.availability_slots(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id),dentist_id uuid not null,service_id text not null,starts_at timestamptz not null,ends_at timestamptz not null,open boolean not null default true,foreign key(dentist_id,clinic_id) references public.dentists(id,clinic_id),foreign key(clinic_id,service_id) references public.clinic_services(clinic_id,service_id),check(ends_at>starts_at and ends_at<=starts_at+interval '4 hours'),unique(id,clinic_id,dentist_id,service_id),exclude using gist(dentist_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(open));
create table public.appointments(id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.users(id),clinic_id uuid not null references public.clinics(id),dentist_id uuid not null,service_id text not null,slot_id uuid not null,starts_at timestamptz not null,ends_at timestamptz not null,status public.appointment_status not null default 'pending',name text not null check(length(name) between 1 and 100),phone text not null check(phone ~ '^\+7[0-9]{10}$'),comment text not null default '' check(length(comment)<=500),consent_version text not null,consent_at timestamptz not null default now(),idempotency_key uuid not null,reschedule_requested boolean not null default false,created_at timestamptz not null default now(),foreign key(slot_id,clinic_id,dentist_id,service_id) references public.availability_slots(id,clinic_id,dentist_id,service_id),check(ends_at>starts_at),unique(patient_id,idempotency_key),exclude using gist(dentist_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('pending','confirmed')));
create table public.appointment_status_history(id bigint generated always as identity primary key,appointment_id uuid not null references public.appointments(id),from_status public.appointment_status,to_status public.appointment_status not null,actor_id uuid references public.users(id),at timestamptz not null default now());
create table public.reviews(id uuid primary key default gen_random_uuid(),appointment_id uuid unique not null references public.appointments(id),patient_id uuid not null references public.users(id),clinic_id uuid not null references public.clinics(id),rating integer not null check(rating between 1 and 5),text text not null,verified boolean not null default false,created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id),appointment_id uuid references public.appointments(id),kind text not null,status text not null default 'queued',created_at timestamptz not null default now());
create table public.audit_logs(id bigint generated always as identity primary key,actor_id uuid references public.users(id),action text not null,target text not null,at timestamptz not null default now());
create table public.notification_settings(clinic_id uuid primary key references public.clinics(id),bookings boolean not null default true,cancellations boolean not null default true);
create table public.complaints(id uuid primary key default gen_random_uuid(),user_id uuid references public.users(id),clinic_id uuid references public.clinics(id),text text not null,status text not null default 'new',created_at timestamptz not null default now());
create table public.runtime_settings(id boolean primary key default true check(id),legal_approved boolean not null default false,consent_version text);
insert into public.runtime_settings(id) values(true);
create index clinic_city_district_idx on public.clinics(city,district) where approved;
create index appointment_patient_time_idx on public.appointments(patient_id,starts_at);
create index appointment_clinic_time_idx on public.appointments(clinic_id,starts_at);
create index slots_clinic_service_time_idx on public.availability_slots(clinic_id,service_id,starts_at) where open;
create index members_clinic_idx on public.clinic_members(clinic_id);
create index audit_time_idx on public.audit_logs(at desc);
create index history_appointment_idx on public.appointment_status_history(appointment_id,at);
create index blocked_dentist_idx on public.blocked_slots(dentist_id,starts_at);
-- Fixed-search-path helpers avoid recursive membership policies.
create function public.q_active() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.users where id=auth.uid() and not blocked)$$;
create function public.q_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.users where id=auth.uid() and platform_admin and not blocked)$$;
create function public.q_member(cid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.q_active() and exists(select 1 from public.clinic_members where clinic_id=cid and user_id=auth.uid())$$;
create function public.q_manager(cid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.q_active() and exists(select 1 from public.clinic_members where clinic_id=cid and user_id=auth.uid() and role in ('owner','administrator'))$$;
create function public.q_dentist(cid uuid,did uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.q_active() and exists(select 1 from public.clinic_members where clinic_id=cid and user_id=auth.uid() and dentist_id=did and role='dentist')$$;
create function public.q_new_user() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin insert into public.users(id,phone) values(new.id,new.phone);return new;end$$;
create trigger auth_profile after insert on auth.users for each row execute function public.q_new_user();
create function public.q_audit(action_text text,target_text text) returns void language sql security definer set search_path=public,pg_temp as $$insert into public.audit_logs(actor_id,action,target) values(auth.uid(),action_text,target_text)$$;
create function public.q_appointment_history() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
 if TG_OP='INSERT' then insert into public.appointment_status_history(appointment_id,to_status,actor_id) values(new.id,new.status,auth.uid());
 elsif old.status is distinct from new.status then insert into public.appointment_status_history(appointment_id,from_status,to_status,actor_id) values(new.id,old.status,new.status,auth.uid());end if;
 if TG_OP='INSERT' or old.status is distinct from new.status then insert into public.notifications(user_id,appointment_id,kind) values(new.patient_id,new.id,'appointment.'||new.status);end if;return new;end$$;
create trigger appointment_history after insert or update on public.appointments for each row execute function public.q_appointment_history();
-- All writes are via audited transactional RPC. RLS also protects direct SELECT.
do $$declare t text;begin foreach t in array array['users','clinics','clinic_members','dentists','services','clinic_services','dentist_services','working_hours','blocked_slots','availability_slots','appointments','appointment_status_history','reviews','notifications','audit_logs','notification_settings','complaints','runtime_settings'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);end loop;end$$;
grant select on public.users,public.clinics,public.clinic_members,public.dentists,public.services,public.clinic_services,public.dentist_services,public.working_hours,public.blocked_slots,public.availability_slots,public.appointments,public.appointment_status_history,public.reviews,public.notifications,public.audit_logs,public.notification_settings,public.complaints to authenticated;
grant select on public.clinics,public.dentists,public.services,public.clinic_services,public.reviews to anon;
create policy user_own on public.users for select using(public.q_active() and (id=auth.uid() or public.q_admin()));
create policy clinics_visible on public.clinics for select using(approved or public.q_member(id) or public.q_admin());
create policy members_own on public.clinic_members for select using(user_id=auth.uid() and public.q_active());
create policy dentists_visible on public.dentists for select using(exists(select 1 from public.clinics c where c.id=clinic_id and (c.approved or public.q_member(c.id) or public.q_admin())));
create policy services_public on public.services for select using(true);
create policy clinic_services_visible on public.clinic_services for select using(exists(select 1 from public.clinics c where c.id=clinic_id and (c.approved or public.q_member(c.id) or public.q_admin())));
create policy dentist_services_visible on public.dentist_services for select using(exists(select 1 from public.dentists d join public.clinics c on d.clinic_id=c.id where d.id=dentist_id and (c.approved or public.q_member(c.id))));
create policy hours_staff on public.working_hours for select using(public.q_member(clinic_id));
create policy blocks_staff on public.blocked_slots for select using(public.q_member(clinic_id));
create policy slots_staff on public.availability_slots for select using(public.q_manager(clinic_id) or public.q_dentist(clinic_id,dentist_id));
create policy appointments_own on public.appointments for select using(public.q_active() and (patient_id=auth.uid() or public.q_manager(clinic_id) or public.q_dentist(clinic_id,dentist_id)));
create policy history_own on public.appointment_status_history for select using(exists(select 1 from public.appointments a where a.id=appointment_id));
create policy reviews_verified on public.reviews for select using(verified and exists(select 1 from public.clinics c where c.id=clinic_id and c.approved));
create policy notifications_own on public.notifications for select using(public.q_active() and user_id=auth.uid());
create policy audit_admin on public.audit_logs for select using(public.q_admin());
create policy notification_settings_staff on public.notification_settings for select using(public.q_manager(clinic_id));
create policy complaints_admin on public.complaints for select using(public.q_admin());
-- No policy permits public access to runtime_settings.
create function public.q_hours_open(did uuid,a timestamptz,b timestamptz) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select not exists(select 1 from public.working_hours where dentist_id=did) or (
 (a at time zone 'Asia/Almaty')::date=(b at time zone 'Asia/Almaty')::date and exists(
 select 1 from public.working_hours where dentist_id=did and weekday=extract(dow from a at time zone 'Asia/Almaty') and starts_at<=(a at time zone 'Asia/Almaty')::time and ends_at>=(b at time zone 'Asia/Almaty')::time))
$$;
create function public.q_catalog(cid uuid default null) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'city',c.city,'district',c.district,'addressRu',c.address_ru,'addressKz',c.address_kz,'descriptionRu',c.description_ru,'descriptionKz',c.description_kz,'image',c.image,'hours',c.hours,'approved',c.approved,'price',(select price from public.clinic_services where clinic_id=c.id and service_id='consult'),'services',coalesce((select jsonb_agg(service_id order by service_id) from public.clinic_services where clinic_id=c.id),'[]'::jsonb),'serviceDetails',coalesce((select jsonb_object_agg(service_id,jsonb_build_object('price',price,'duration',duration)) from public.clinic_services where clinic_id=c.id),'{}'::jsonb),'doctors',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'nameRu',d.name_ru,'nameKz',d.name_kz,'specialty',d.specialty,'services',coalesce((select jsonb_agg(service_id) from public.dentist_services where dentist_id=d.id),'[]'::jsonb),'initials',left(d.name_ru,1))) from public.dentists d where d.clinic_id=c.id),'[]'::jsonb)) order by c.name),'[]'::jsonb) from public.clinics c where (cid is null or c.id=cid) and (c.approved or public.q_member(c.id) or public.q_admin() or exists(select 1 from public.appointments x where x.clinic_id=c.id and x.patient_id=auth.uid() and public.q_active()))
$$;
-- Public GETs return only public catalog/availability; writes derive identity from auth.uid().
create function public.qline_api(q_method text,q_path text,q_body jsonb default '{}'::jsonb,q_query jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();cid uuid;did uuid;sid uuid;aid uuid;mem public.clinic_members;sl public.availability_slots;a public.appointments;existing public.appointments;c public.clinics;result jsonb;newstatus public.appointment_status;v_consent text;v_start timestamptz;v_end timestamptz;v_name text;v_phone text;v_comment text;v_role text;v_id uuid;
begin
 if u is not null and not public.q_active() then raise exception 'FORBIDDEN';end if;
 if q_method='GET' and q_path='/me' then
  if u is null then return 'null'::jsonb;end if;
  select * into mem from public.clinic_members where user_id=u order by clinic_id limit 1;
  return (select jsonb_build_object('id',id,'name',name,'phone',phone,'role',case when platform_admin then 'platform_admin' else coalesce(mem.role,'patient') end,'clinic_id',mem.clinic_id,'dentist_id',mem.dentist_id) from public.users where id=u);
 end if;
 if q_method='GET' and q_path='/services' then return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.services x);end if;
 if q_method='GET' and q_path='/clinics' then return (select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(public.q_catalog()) x where (x->>'approved')::boolean);end if;
 if q_method='GET' and q_path like '/clinics/%' then select id into cid from public.clinics where slug=split_part(q_path,'/',3) and approved;if cid is null then raise exception 'NOT_FOUND';end if;return public.q_catalog(cid)->0;end if;
 if q_method='GET' and q_path='/slots' then
  return (select coalesce(jsonb_agg(to_jsonb(s) order by s.starts_at),'[]') from public.availability_slots s join public.clinics c on c.id=s.clinic_id where c.approved and s.clinic_id=(q_query->>'clinic')::uuid and s.open and public.q_hours_open(s.dentist_id,s.starts_at,s.ends_at) and s.starts_at>now() and exists(select 1 from public.dentist_services ds where ds.dentist_id=s.dentist_id and ds.service_id=s.service_id) and (s.starts_at at time zone 'Asia/Almaty')::date=(q_query->>'date')::date and (coalesce(q_query->>'service','')='' or s.service_id=q_query->>'service') and (coalesce(q_query->>'dentist','')='' or s.dentist_id=nullif(q_query->>'dentist','')::uuid) and not exists(select 1 from public.appointments x where x.dentist_id=s.dentist_id and x.status in ('pending','confirmed') and tstzrange(x.starts_at,x.ends_at,'[)')&&tstzrange(s.starts_at,s.ends_at,'[)')) and not exists(select 1 from public.blocked_slots b where b.dentist_id=s.dentist_id and tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(s.starts_at,s.ends_at,'[)')));
 end if;
 if u is null then raise exception 'UNAUTHORIZED';end if;
 if q_method='GET' and q_path='/appointments' then return (select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('clinic_snapshot',public.q_catalog(x.clinic_id)->0) order by starts_at),'[]') from public.appointments x where patient_id=u);end if;
 if q_method='PATCH' and q_path='/profile' then
  v_name:=trim(q_body->>'name');v_phone:='+'||regexp_replace(q_body->>'phone','\D','','g');if v_name is null or length(v_name) not between 1 and 100 or v_phone is null or v_phone!~'^\+7[0-9]{10}$' then raise exception 'INVALID';end if;
  update public.users set name=v_name,phone=v_phone where id=u;return public.qline_api('GET','/me');
 end if;
 if q_method='POST' and q_path='/appointments' then
  select consent_version into v_consent from public.runtime_settings where id and legal_approved;if v_consent is null or v_consent is distinct from q_query->>'consent_version' then raise exception 'INVALID';end if;
  v_name:=trim(q_body->>'name');v_phone:='+'||regexp_replace(q_body->>'phone','\D','','g');v_comment:=coalesce(q_body->>'comment','');
  if v_name is null or length(v_name) not between 1 and 100 or v_phone is null or v_phone is null or v_phone!~'^\+7[0-9]{10}$' or length(v_comment)>500 or coalesce((q_body->>'consent')::boolean,false)=false then raise exception 'INVALID';end if;
  -- Serialize retries per patient/key before looking up existing application.
  perform pg_advisory_xact_lock(hashtextextended(u::text||':'||(q_body->>'idempotency_key'),0));
  select * into existing from public.appointments where patient_id=u and idempotency_key=(q_body->>'idempotency_key')::uuid;
  if found then if existing.slot_id<>(q_body->>'slot_id')::uuid or existing.name<>v_name or existing.phone<>v_phone or existing.comment<>v_comment then raise exception 'INVALID';end if;return to_jsonb(existing);end if;
  select * into sl from public.availability_slots where id=(q_body->>'slot_id')::uuid for update;if not found then raise exception 'CONFLICT';end if;
  perform pg_advisory_xact_lock(hashtextextended(sl.dentist_id::text,0));
  if not public.q_hours_open(sl.dentist_id,sl.starts_at,sl.ends_at) or not exists(select 1 from public.dentist_services ds where ds.dentist_id=sl.dentist_id and ds.service_id=sl.service_id) or not sl.open or sl.starts_at<=now() or not exists(select 1 from public.clinics where id=sl.clinic_id and approved) or exists(select 1 from public.blocked_slots b where b.dentist_id=sl.dentist_id and tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(sl.starts_at,sl.ends_at,'[)')) then raise exception 'CONFLICT';end if;
  insert into public.appointments(patient_id,clinic_id,dentist_id,service_id,slot_id,starts_at,ends_at,name,phone,comment,consent_version,idempotency_key) values(u,sl.clinic_id,sl.dentist_id,sl.service_id,sl.id,sl.starts_at,sl.ends_at,v_name,v_phone,v_comment,v_consent,(q_body->>'idempotency_key')::uuid) returning * into a;
  perform public.q_audit('appointment.created',a.id::text);return to_jsonb(a);
 end if;
 if q_method='PATCH' and q_path like '/appointments/%' then
  select * into a from public.appointments where id=split_part(q_path,'/',3)::uuid for update;if not found then raise exception 'NOT_FOUND';end if;
  if q_body ? 'reschedule_request' then
   if a.patient_id<>u or a.status not in ('pending','confirmed') or a.starts_at<=now() then raise exception 'FORBIDDEN';end if;
   update public.appointments set reschedule_requested=true where id=a.id returning * into a;perform public.q_audit('appointment.reschedule_requested',a.id::text);return to_jsonb(a);
  end if;
  if q_body ? 'slot_id' then
   if not public.q_manager(a.clinic_id) or a.status not in ('pending','confirmed') then raise exception 'FORBIDDEN';end if;
   select * into sl from public.availability_slots where id=(q_body->>'slot_id')::uuid for update;
   if not found or not public.q_hours_open(sl.dentist_id,sl.starts_at,sl.ends_at) or sl.clinic_id<>a.clinic_id or sl.service_id<>a.service_id or not sl.open or sl.starts_at<=now() then raise exception 'CONFLICT';end if;
   perform pg_advisory_xact_lock(hashtextextended(sl.dentist_id::text,0));
   if exists(select 1 from public.blocked_slots b where b.dentist_id=sl.dentist_id and tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(sl.starts_at,sl.ends_at,'[)')) then raise exception 'CONFLICT';end if;
   update public.appointments set slot_id=sl.id,dentist_id=sl.dentist_id,starts_at=sl.starts_at,ends_at=sl.ends_at,reschedule_requested=false where id=a.id returning * into a;perform public.q_audit('appointment.rescheduled',a.id::text);return to_jsonb(a);
  end if;
  newstatus:=(q_body->>'status')::public.appointment_status;
  if not public.q_manager(a.clinic_id) and not(a.patient_id=u and newstatus='cancelled' and a.starts_at>now()) and not(public.q_dentist(a.clinic_id,a.dentist_id) and newstatus in ('completed','no_show')) then raise exception 'FORBIDDEN';end if;
  if not((a.status='pending' and newstatus in ('confirmed','cancelled')) or(a.status='confirmed' and newstatus in ('cancelled','completed','no_show'))) or(newstatus in ('completed','no_show') and a.starts_at>now()) then raise exception 'INVALID';end if;
  update public.appointments set status=newstatus where id=a.id returning * into a;perform public.q_audit('appointment.'||newstatus,a.id::text);return to_jsonb(a);
 end if;
 if q_method='POST' and q_path='/clinic-register' then
  if not exists(select 1 from public.runtime_settings where id and legal_approved) or coalesce((q_body->>'consent')::boolean,false)=false then raise exception 'INVALID';end if;
  if trim(coalesce(q_body->>'name',''))='' or trim(coalesce(q_body->>'address',''))='' or q_body->>'phone' is null or ('+'||regexp_replace(q_body->>'phone','\D','','g'))!~'^\+7[0-9]{10}$' then raise exception 'INVALID';end if;
  insert into public.clinics(slug,name,city,address_ru,address_kz,phone) values('clinic-'||gen_random_uuid(),q_body->>'name',q_body->>'city',q_body->>'address',q_body->>'address','+'||regexp_replace(q_body->>'phone','\D','','g')) returning * into c;
  insert into public.clinic_members(user_id,clinic_id,role) values(u,c.id,'owner');perform public.q_audit('clinic.registered',c.id::text);return public.q_catalog(c.id)->0;
 end if;
 select * into mem from public.clinic_members where user_id=u order by clinic_id limit 1;cid:=mem.clinic_id;
 if q_path='/clinic' and q_method='GET' then
  if cid is null or not public.q_member(cid) then raise exception 'FORBIDDEN';end if;
  return jsonb_build_object('clinic',public.q_catalog(cid)->0,'appointments',coalesce((select jsonb_agg(to_jsonb(x) order by starts_at) from public.appointments x where clinic_id=cid and (mem.role<>'dentist' or dentist_id=mem.dentist_id)),'[]'::jsonb),'slots',coalesce((select jsonb_agg(to_jsonb(s) order by starts_at) from public.availability_slots s where clinic_id=cid and starts_at>now()-interval '31 days' and starts_at<now()+interval '366 days' and(mem.role<>'dentist' or dentist_id=mem.dentist_id)),'[]'::jsonb),'workingHours',coalesce((select jsonb_agg(to_jsonb(h)) from public.working_hours h where clinic_id=cid),'[]'::jsonb),'blocked',coalesce((select jsonb_agg(to_jsonb(b)) from public.blocked_slots b where clinic_id=cid),'[]'::jsonb),'notifications',coalesce((select to_jsonb(n) from public.notification_settings n where clinic_id=cid),'{}'::jsonb));
 end if;
 if q_path like '/clinic/%' then
  if cid is null or not public.q_manager(cid) then raise exception 'FORBIDDEN';end if;
  if q_path='/clinic/profile' and q_method='PATCH' then
   update public.clinics set name=coalesce(q_body->>'name',name),address_ru=coalesce(q_body->>'addressRu',address_ru),address_kz=coalesce(q_body->>'addressKz',address_kz),description_ru=coalesce(q_body->>'descriptionRu',description_ru),description_kz=coalesce(q_body->>'descriptionKz',description_kz),hours=coalesce(q_body->>'hours',hours) where id=cid;perform public.q_audit('clinic.updated',cid::text);return public.q_catalog(cid)->0;
  end if;
  if q_path='/clinic/dentists' and q_method='POST' then
   insert into public.dentists(clinic_id,name_ru,name_kz,specialty) values(cid,q_body->>'nameRu',q_body->>'nameKz',q_body->>'specialty') returning id into did;
   insert into public.dentist_services(dentist_id,service_id) select did,service_id from public.clinic_services where clinic_id=cid and service_id in (q_body->>'specialty','consult');perform public.q_audit('dentist.created',did::text);return jsonb_build_object('id',did);
  end if;
  if q_path='/clinic/services' and q_method='POST' then
   insert into public.clinic_services(clinic_id,service_id,price,duration) values(cid,q_body->>'service_id',(q_body->>'price')::integer,(q_body->>'duration')::integer) on conflict(clinic_id,service_id) do update set price=excluded.price,duration=excluded.duration;
   delete from public.dentist_services where service_id=q_body->>'service_id' and dentist_id in(select id from public.dentists where clinic_id=cid);
   insert into public.dentist_services(dentist_id,service_id) select id,q_body->>'service_id' from public.dentists where clinic_id=cid and id::text in(select jsonb_array_elements_text(coalesce(q_body->'dentist_ids','[]'::jsonb))) on conflict do nothing;perform public.q_audit('service.updated',q_body->>'service_id');return public.q_catalog(cid)->0;
  end if;
  if q_path='/clinic/slots' and q_method='POST' then
   did:=(q_body->>'dentist_id')::uuid;v_start:=(q_body->>'starts_at')::timestamptz;v_end:=(q_body->>'ends_at')::timestamptz;
   if not public.q_hours_open(did,v_start,v_end) or v_start<=now() or not exists(select 1 from public.dentists where id=did and clinic_id=cid) or not exists(select 1 from public.dentist_services where dentist_id=did and service_id=q_body->>'service_id') or not exists(select 1 from public.clinic_services where clinic_id=cid and service_id=q_body->>'service_id' and v_end=v_start+duration*interval '1 minute') then raise exception 'INVALID';end if;
   perform pg_advisory_xact_lock(hashtextextended(did::text,0));
   if exists(select 1 from public.blocked_slots b where b.dentist_id=did and tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(v_start,v_end,'[)')) or exists(select 1 from public.appointments x where x.dentist_id=did and x.status in ('pending','confirmed') and tstzrange(x.starts_at,x.ends_at,'[)')&&tstzrange(v_start,v_end,'[)')) then raise exception 'CONFLICT';end if;
   insert into public.availability_slots(clinic_id,dentist_id,service_id,starts_at,ends_at) values(cid,did,q_body->>'service_id',v_start,v_end) returning * into sl;perform public.q_audit('slot.opened',sl.id::text);return to_jsonb(sl);
  end if;
  if q_path like '/clinic/slots/%' and q_method='PATCH' then
   select * into sl from public.availability_slots where id=split_part(q_path,'/',4)::uuid and clinic_id=cid for update;if not found then raise exception 'NOT_FOUND';end if;
   perform pg_advisory_xact_lock(hashtextextended(sl.dentist_id::text,0));if exists(select 1 from public.appointments where slot_id=sl.id and status in ('pending','confirmed')) then raise exception 'CONFLICT';end if;
   if coalesce((q_body->>'open')::boolean,false) and exists(select 1 from public.blocked_slots b where b.dentist_id=sl.dentist_id and tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(sl.starts_at,sl.ends_at,'[)')) then raise exception 'CONFLICT';end if;
   update public.availability_slots set open=coalesce((q_body->>'open')::boolean,false) where id=sl.id returning * into sl;perform public.q_audit('slot.updated',sl.id::text);return to_jsonb(sl);
  end if;
  if q_path='/clinic/working-hours' and q_method='POST' then
   did:=(q_body->>'dentist_id')::uuid;if not exists(select 1 from public.dentists where id=did and clinic_id=cid) then raise exception 'FORBIDDEN';end if;
   perform pg_advisory_xact_lock(hashtextextended(did::text,0));
   insert into public.working_hours(clinic_id,dentist_id,weekday,starts_at,ends_at) values(cid,did,(q_body->>'weekday')::integer,(q_body->>'start')::time,(q_body->>'end')::time) on conflict(dentist_id,weekday) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at;if exists(select 1 from public.appointments x where x.dentist_id=did and x.status in ('pending','confirmed') and x.starts_at>now() and not public.q_hours_open(did,x.starts_at,x.ends_at)) then raise exception 'CONFLICT';end if;perform public.q_audit('working_hours.updated',did::text);return '{}'::jsonb;
  end if;
  if q_path='/clinic/blocked' and q_method='POST' then
   did:=(q_body->>'dentist_id')::uuid;v_start:=(q_body->>'starts_at')::timestamptz;v_end:=(q_body->>'ends_at')::timestamptz;if not exists(select 1 from public.dentists where id=did and clinic_id=cid) then raise exception 'FORBIDDEN';end if;
   perform pg_advisory_xact_lock(hashtextextended(did::text,0));if exists(select 1 from public.appointments x where x.dentist_id=did and x.status in ('pending','confirmed') and tstzrange(x.starts_at,x.ends_at,'[)')&&tstzrange(v_start,v_end,'[)')) then raise exception 'CONFLICT';end if;
   insert into public.blocked_slots(clinic_id,dentist_id,starts_at,ends_at) values(cid,did,v_start,v_end) returning id into sid;perform public.q_audit('blocked_slot.created',sid::text);return jsonb_build_object('id',sid);
  end if;
  if q_path='/clinic/notifications' and q_method='PATCH' then
   insert into public.notification_settings(clinic_id,bookings,cancellations) values(cid,coalesce((q_body->>'bookings')::boolean,false),coalesce((q_body->>'cancellations')::boolean,false)) on conflict(clinic_id) do update set bookings=excluded.bookings,cancellations=excluded.cancellations;perform public.q_audit('notifications.settings_updated',cid::text);return '{}'::jsonb;
  end if;
 end if;
 if q_path like '/admin%' then
  if not public.q_admin() then raise exception 'FORBIDDEN';end if;
  if q_path='/admin' and q_method='GET' then return jsonb_build_object('clinics',public.q_catalog(),'services',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.services x),'users',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'blocked',blocked)),'[]') from public.users),'audit',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select * from public.audit_logs order by at desc limit 100)x),'complaints',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.complaints x),'appointments',(select count(*) from public.appointments));end if;
  if q_path like '/admin/clinics/%' and q_method='PATCH' then cid:=split_part(q_path,'/',4)::uuid;update public.clinics set approved=coalesce((q_body->>'approved')::boolean,false) where id=cid;if not found then raise exception 'NOT_FOUND';end if;perform public.q_audit('clinic.moderated',cid::text);return public.q_catalog(cid)->0;end if;
  if q_path='/admin/categories' and q_method='POST' then if trim(coalesce(q_body->>'ru',''))='' or trim(coalesce(q_body->>'kz',''))='' then raise exception 'INVALID';end if;insert into public.services(id,ru,kz) values(gen_random_uuid()::text,q_body->>'ru',q_body->>'kz');perform public.q_audit('category.created',q_body->>'ru');return '{}'::jsonb;end if;
  if q_path like '/admin/users/%' and q_method='PATCH' then v_id:=split_part(q_path,'/',4)::uuid;if v_id=u then raise exception 'INVALID';end if;update public.users set blocked=coalesce((q_body->>'blocked')::boolean,false) where id=v_id;if not found then raise exception 'NOT_FOUND';end if;perform public.q_audit('user.access_changed',v_id::text);return '{}'::jsonb;end if;
  if q_path like '/admin/complaints/%' and q_method='PATCH' then aid:=split_part(q_path,'/',4)::uuid;update public.complaints set status='resolved' where id=aid;perform public.q_audit('complaint.resolved',aid::text);return '{}'::jsonb;end if;
 end if;
 raise exception 'NOT_FOUND';
exception when exclusion_violation or unique_violation then raise exception 'CONFLICT';when invalid_text_representation or check_violation or not_null_violation or foreign_key_violation or datetime_field_overflow then raise exception 'INVALID';
end$$;
-- PostgreSQL grants EXECUTE to PUBLIC by default. Revoke on every helper,
-- especially q_audit; only expose intended safe reads and the entry RPC.
revoke all on function public.q_active(),public.q_admin(),public.q_member(uuid),public.q_manager(uuid),public.q_dentist(uuid,uuid),public.q_new_user(),public.q_audit(text,text),public.q_appointment_history(),public.q_catalog(uuid),public.q_hours_open(uuid,timestamptz,timestamptz),public.qline_api(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.q_active(),public.q_admin(),public.q_member(uuid),public.q_manager(uuid),public.q_dentist(uuid,uuid) to authenticated,anon;
grant execute on function public.qline_api(text,text,jsonb,jsonb) to anon,authenticated;
-- Approved category taxonomy only. No demo clinics or reviews in production.
insert into public.services(id,ru,kz,icon,price,duration) values
('therapy','Лечение зубов','Тісті емдеу','tooth',18000,60),('cleaning','Профессиональная чистка','Кәсіби тазалау','sparkles',15000,60),('whitening','Отбеливание зубов','Тісті ағарту','sun',65000,90),('ortho','Ортодонтия','Ортодонтия','align',10000,45),('implant','Имплантация','Имплантация','implant',180000,120),('surgery','Удаление зубов','Тісті жұлу','shield',20000,60),('kids','Детская стоматология','Балалар стоматологиясы','smile',12000,45),('consult','Консультация стоматолога','Тіс дәрігерінің кеңесі','chat',5000,30);
comment on column public.services.price is 'Illustrative editor default; public clinic prices must come from clinic_services, not this column.';
