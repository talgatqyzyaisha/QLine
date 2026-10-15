-- Run ONLY in a disposable Supabase project after migration 001. Rolls back fixtures.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f Backend/test/rls.integration.sql
begin;
update public.runtime_settings set legal_approved=true,consent_version='integration-test';
-- Registration cannot bypass consent through direct Auth metadata.
do $$begin
 begin
  insert into auth.users(id,raw_user_meta_data) values('00000000-0000-4000-8000-000000000099','{"consent":false,"consent_version":"integration-test"}');
  raise exception 'Missing consent unexpectedly accepted';
 exception when raise_exception then if sqlerrm<>'QLINE_CONSENT_REQUIRED' then raise;end if;end;
 begin
  insert into auth.users(id,raw_user_meta_data) values('00000000-0000-4000-8000-000000000099','{"consent":true,"consent_version":"outdated"}');
  raise exception 'Outdated consent unexpectedly accepted';
 exception when raise_exception then if sqlerrm<>'QLINE_CONSENT_REQUIRED' then raise;end if;end;
end$$;
insert into auth.users(id,phone,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000001','77000000001','{"consent":true,"consent_version":"integration-test","name":"Synthetic"}'),
('00000000-0000-4000-8000-000000000002','77000000002','{"consent":true,"consent_version":"integration-test","name":"Synthetic"}'),
('00000000-0000-4000-8000-000000000003','77000000003','{"consent":true,"consent_version":"integration-test","name":"Synthetic","role":"platform_admin","platform_admin":true}');
do $$begin
 if exists(select 1 from public.users where platform_admin) then raise exception 'Metadata elevated privileges';end if;
 if (select count(*) from public.user_consents where purpose='account' and version='integration-test')<>3 then raise exception 'Consent evidence missing';end if;
end$$;
insert into public.clinics(id,slug,name,city,address_ru,address_kz,approved) values('10000000-0000-4000-8000-000000000001','rls-fixture','Synthetic clinic','almaty','test','test',true);
insert into public.clinic_members(user_id,clinic_id,role) values('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','owner');
insert into public.dentists(id,clinic_id,name_ru,name_kz) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test','Test');
insert into public.clinic_services(clinic_id,service_id,price,duration) values('10000000-0000-4000-8000-000000000001','consult',5000,30);
insert into public.dentist_services(dentist_id,service_id) values('20000000-0000-4000-8000-000000000001','consult');
insert into public.availability_slots(id,clinic_id,dentist_id,service_id,starts_at,ends_at) values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','consult',now()+interval '1 day',now()+interval '1 day 30 minutes');
update public.runtime_settings set legal_approved=true,consent_version='integration-test';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.qline_api('POST','/appointments','{"slot_id":"30000000-0000-4000-8000-000000000001","idempotency_key":"40000000-0000-4000-8000-000000000001","name":"Synthetic","phone":"+77000000001","consent":true}', '{"consent_version":"integration-test"}');
-- A network retry returns the existing appointment without duplicate side effects.
select public.qline_api('POST','/appointments','{"slot_id":"30000000-0000-4000-8000-000000000001","idempotency_key":"40000000-0000-4000-8000-000000000001","name":"Synthetic","phone":"+77000000001","consent":true}', '{"consent_version":"integration-test"}');
do $$begin if (select count(*) from public.appointments)<>1 then raise exception 'Own record unavailable';end if;end$$;
-- Direct UPDATE is denied even to the patient.
do $$begin begin update public.appointments set status='confirmed';raise exception 'Direct update unexpectedly allowed';exception when insufficient_privilege then null;end;end$$;
-- Second patient sees no personal records and cannot take same slot.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin if (select count(*) from public.appointments)<>0 then raise exception 'RLS exposed another patient';end if;
 begin perform public.qline_api('POST','/appointments','{"slot_id":"30000000-0000-4000-8000-000000000001","idempotency_key":"40000000-0000-4000-8000-000000000002","name":"Synthetic 2","phone":"+77000000002","consent":true}','{"consent_version":"integration-test"}');raise exception 'Second booking unexpectedly succeeded';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 begin perform public.qline_api('GET','/admin');raise exception 'Admin unexpectedly allowed';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
end$$;
-- Owner can read and confirm own clinic booking; status history remains.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$declare a uuid;begin select id into a from public.appointments;if a is null then raise exception 'Owner read failed';end if;perform public.qline_api('PATCH','/appointments/'||a,'{"status":"confirmed"}');if (select count(*) from public.appointment_status_history where appointment_id=a)<>2 then raise exception 'Status history missing';end if;end$$;
reset role;
-- Blocked accounts cannot read or mutate through the definer RPC.
update public.users set blocked=true where id='00000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$begin
 if (select count(*) from public.appointments)<>0 then raise exception 'Blocked user retained record access';end if;
 begin perform public.qline_api('GET','/appointments');raise exception 'Blocked RPC unexpectedly allowed';
 exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
end$$;
reset role;
rollback;
