import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService, recoveryProof, verifyRecovery, safeReturn } from '../src/auth.js';
import { createSupabaseClient } from '../src/supabase.js';
import { loadConfig } from '../src/config.js';
import { AppError } from '../../shared/domain.js';
const config={origin:'https://qline.test',legalReady:true,consentVersion:'reviewed-test-v1',smsEnabled:false};
const valid={name:' Synthetic ',email:' Person@Example.com ',password:'long unique passphrase',password_confirm:'long unique passphrase',consent:true};
const mock=()=>{const calls=[];return {calls,request:async(path,options)=>{calls.push({path,...options});return {confirmationRequired:true};}};};
const jwt=session=>'header.'+Buffer.from(JSON.stringify({session_id:session})).toString('base64url')+'.signature';

test('registration validates fields and passes no caller-supplied role to Supabase',async()=>{
 const client=mock(),auth=createAuthService(client,config);await auth.signUp({...valid,role:'platform_admin',platform_admin:true});
 assert.equal(client.calls[0].body.email,'person@example.com');assert.equal(client.calls[0].body.data.name,'Synthetic');assert.equal(client.calls[0].body.data.consent_version,config.consentVersion);assert.ok(!('role'in client.calls[0].body.data));
 for(const override of [{consent:false},{name:''},{email:'bad'},{password:'short'},{password_confirm:'different'}])await assert.rejects(auth.signUp({...valid,...override}),e=>e.code==='INVALID');
 assert.equal(client.calls.length,1);
});
test('unapproved legal configuration cannot silently collect signup data',async()=>{
 const client=mock();await assert.rejects(createAuthService(client,{...config,legalReady:false}).signUp(valid),e=>e.code==='LEGAL_PENDING');assert.equal(client.calls.length,0);
});
test('password login is generic for invalid input; external return redirects are rejected',async()=>{
 const client=mock(),auth=createAuthService(client,config);await assert.rejects(auth.signIn({email:'bad',password:''}),e=>e.code==='INVALID_CREDENTIALS');
 assert.equal(client.calls.length,0);await auth.signIn({email:'USER@EXAMPLE.COM',password:'existing password'});assert.equal(client.calls[0].path,'/auth/v1/token?grant_type=password');
 for(const url of ['https://evil.test','//evil.test','/\\evil.test','/\npath',null])assert.equal(safeReturn(url),'/my-appointments');assert.equal(safeReturn('/book/clinic?service=consult'),'/book/clinic?service=consult');
});
test('recovery proof is signed, short-lived and bound to verified user/session',()=>{
 const secret='a-secure-test-secret-with-more-than-32-characters';const token=jwt('session-one');const proof=recoveryProof(secret,'user-one',token,1000);
 assert.equal(verifyRecovery(secret,proof,'user-one',token,2000),true);assert.equal(verifyRecovery(secret,proof+'x','user-one',token,2000),false);
 assert.equal(verifyRecovery(secret,proof,'user-two',token,2000),false);assert.equal(verifyRecovery(secret,proof,'user-one',jwt('session-two'),2000),false);assert.equal(verifyRecovery(secret,proof,'user-one',token,601001),false);
});
test('email confirmation only accepts supported one-time verification types',async()=>{
 const client=mock(),auth=createAuthService(client,config);await auth.verify({token_hash:'a'.repeat(64),type:'recovery'});assert.equal(client.calls[0].body.type,'recovery');
 await assert.rejects(auth.verify({token_hash:'a'.repeat(64),type:'invite'}),e=>e.code==='AUTH_LINK_INVALID');await assert.rejects(auth.verify({token_hash:'bad',type:'email'}),e=>e.code==='AUTH_LINK_INVALID');
});
test('disabled SMS does not pretend to send OTP or create phone accounts',async()=>{
 const client=mock();await assert.rejects(createAuthService(client,config).sendPhoneCode({phone:'+77000000000'}),e=>e.code==='SMS_DISABLED');assert.equal(client.calls.length,0);
 await createAuthService(client,{...config,smsEnabled:true}).sendPhoneCode({phone:'87000000000'});assert.equal(client.calls[0].body.create_user,false);
});
test('concurrent refresh calls share one request within a Node instance',async()=>{
 let count=0;const auth=createAuthService({request:async()=>{count++;return {access_token:'renewed'};}},config);
 const [a,b]=await Promise.all([auth.refresh('sensitive-refresh-token'),auth.refresh('sensitive-refresh-token')]);assert.equal(count,1);assert.equal(a.access_token,b.access_token);
});
test('publishable API key is not used as a JWT; authenticated requests carry user JWT',async()=>{
 const calls=[];const client=createSupabaseClient({url:'https://project.supabase.co',key:'sb_publishable_public',fetchImpl:async(url,options)=>{calls.push({url,...options});return new Response('{}');}});
 await client.rpc(undefined,'GET','/services');assert.equal(calls[0].headers.apikey,'sb_publishable_public');assert.ok(!('Authorization'in calls[0].headers));
 await client.rpc('real-user-jwt','GET','/appointments');assert.equal(calls[1].headers.Authorization,'Bearer real-user-jwt');
});
test('provider errors never expose password, internal SQL or provider messages',async()=>{
 const client=createSupabaseClient({url:'https://project.supabase.co',key:'public',fetchImpl:async()=>new Response(JSON.stringify({msg:'secret internal message',error_code:'invalid_credentials'}),{status:400})});
 await assert.rejects(client.request('/auth/v1/token?grant_type=password',{method:'POST',body:{password:'private'}}),e=>e instanceof AppError&&e.code==='INVALID_CREDENTIALS'&&!e.message.includes('secret'));
});
test('missing schema is reported as setup-required, not empty fictitious results',async()=>{
 const client=createSupabaseClient({url:'https://project.supabase.co',key:'public',fetchImpl:async()=>new Response(JSON.stringify({code:'PGRST202'}),{status:404})});
 await assert.rejects(client.rpc(undefined,'GET','/clinics'),e=>e.code==='SETUP_REQUIRED');
});
test('legacy demo mode and insecure production configuration fail closed',()=>{
 const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',APP_ORIGIN:'https://qline.test',SESSION_SECRET:'a'.repeat(64),NODE_ENV:'production'};
 assert.throws(()=>loadConfig({...env,DATA_MODE:'demo'}));assert.throws(()=>loadConfig({...env,APP_ORIGIN:'http://qline.test'}));assert.throws(()=>loadConfig({...env,SESSION_SECRET:'short'}));
 const result=loadConfig(env);assert.equal(result.legalReady,false);assert.equal(result.key,'public');
});
