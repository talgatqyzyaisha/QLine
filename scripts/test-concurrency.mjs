// Runs only against a disposable CI database with psql credentials in PG* env.
// Two separate connections race on the same slot. No credentials in process argv.
import pg from 'pg';
if (process.env.QLINE_TEST_DATABASE !== 'true') throw new Error('Refusing to write fixtures: set QLINE_TEST_DATABASE=true only for a disposable test database.');
async function sql(text) {
  const client = new pg.Client();
  try {
    await client.connect();
    const result = await client.query(text);
    const last = Array.isArray(result) ? result.at(-1) : result;
    return { code: 0, out: last.rows.map(row => Object.values(row).join('|')).join('\n'), error: '' };
  } catch (error) { return { code: 1, out: '', error: error.message }; }
  finally { await client.end(); }
}
const clinic='71000000-0000-4000-8000-000000000001';
const dentist='72000000-0000-4000-8000-000000000001';
const slot='73000000-0000-4000-8000-000000000001';
const patients=['74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002'];
const fixture=`
update public.runtime_settings set legal_approved=true,consent_version='ci-concurrency';
insert into auth.users(id,phone,raw_user_meta_data) values ${patients.map((id,i)=>`('${id}','7700000000${i+6}','{"name":"Synthetic","consent":true,"consent_version":"ci-concurrency"}')`).join(',')};
insert into public.clinics(id,slug,name,city,address_ru,address_kz,approved) values('${clinic}','ci-concurrency','Synthetic CI clinic','almaty','test','test',true);
insert into public.dentists(id,clinic_id,name_ru,name_kz) values('${dentist}','${clinic}','Synthetic','Synthetic');
insert into public.clinic_services(clinic_id,service_id,price,duration) values('${clinic}','consult',100,30);
insert into public.dentist_services(dentist_id,service_id) values('${dentist}','consult');
insert into public.availability_slots(id,clinic_id,dentist_id,service_id,starts_at,ends_at) values('${slot}','${clinic}','${dentist}','consult',now()+interval '2 days',now()+interval '2 days 30 minutes');`;
const seeded=await sql(fixture);if(seeded.code)throw new Error('Fixture setup failed: '+seeded.error);
const attempts=await Promise.all(patients.map((patient,i)=>sql(`
set role authenticated;
select set_config('request.jwt.claim.sub','${patient}',false);
select public.qline_api('POST','/appointments','{"slot_id":"${slot}","idempotency_key":"75000000-0000-4000-8000-00000000000${i+1}","name":"Synthetic","phone":"+7700000000${i+6}","consent":true}','{"consent_version":"ci-concurrency"}');`)));
const successes=attempts.filter(r=>r.code===0).length;
const conflicts=attempts.filter(r=>r.code!==0&&r.error.includes('CONFLICT')).length;
const count=await sql(`select count(*) from public.appointments where slot_id='${slot}' and status in('pending','confirmed');`);
if(successes!==1||conflicts!==1||count.out.trim()!=='1')throw new Error('Concurrent booking invariant failed');
console.log('PostgreSQL race passed: one committed appointment, one conflict.');
