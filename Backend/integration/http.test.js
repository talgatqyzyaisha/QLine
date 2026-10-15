// Runs after npm install: real Express HTTP with a mocked Supabase boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { AppError } from '../../shared/domain.js';
const jwt='header.'+Buffer.from(JSON.stringify({session_id:'verified-session'})).toString('base64url')+'.signature';
const session={access_token:jwt,refresh_token:'test-only-refresh',expires_in:3600,user:{id:'verified-user',email:'synthetic@example.com'}};
const config={production:true,origin:'https://qline.test',url:'https://test.supabase.co',key:'sb_publishable_public',sessionSecret:'random-test-secret-at-least-32-characters',legalReady:true,consentVersion:'test-review',smsEnabled:false,trustProxy:false};
// Browsers replace a cookie when the response sets its name again (clear, then set).
const cookies=response=>[...new Map(response.headers.getSetCookie().map(s=>{
 const pair=s.split(';')[0];return [pair.slice(0,pair.indexOf('=')),pair];
})).values()].join('; ');
async function withServer(run,overrides={}){
 const calls=[];
 const client={request:async(path,options={})=>{calls.push({path,...options});if(path==='/auth/v1/user'&&(!options.method||options.method==='GET')){if(options.token!==jwt)throw new AppError('UNAUTHORIZED',401);return session.user;}if(path.startsWith('/auth/v1/logout'))return {};if(path==='/auth/v1/user'&&options.method==='PUT')return session.user;return session;},rpc:async(token,method,path)=>{calls.push({token,method,path});if(path==='/services')return [];if(path==='/me')return token?{id:'verified-user',role:'patient',name:'Synthetic'}:null;if(!token)throw new AppError('UNAUTHORIZED',401);return [];}};
 const app=createApp({config:{...config,...overrides},client});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(path,body,jar,origin=config.origin)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...(jar?{Cookie:jar}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 try{await run({request,calls,client});}finally{await new Promise(resolve=>server.close(resolve));}
}

test('cross-origin signup is rejected before provider call; demo endpoint does not exist',()=>withServer(async({request,calls})=>{
 assert.equal((await request('/api/auth/signup',{email:'test@example.com'},null,'https://evil.test')).status,403);assert.equal(calls.length,0);
 assert.equal((await request('/api/auth/demo',{role:'platform_admin'})).status,404);
}));
test('login sets secure HttpOnly session; protected requests use verified identity',()=>withServer(async({request,calls})=>{
 const response=await request('/api/auth/login',{email:'synthetic@example.com',password:'long password phrase'});assert.equal(response.status,200);
 const values=response.headers.getSetCookie().join(';');assert.match(values,/HttpOnly/);assert.match(values,/Secure/);assert.match(values,/__Host-ql_access/);
 assert.ok(!JSON.stringify(await response.json()).includes(jwt));
 const me=await request('/api/me',undefined,cookies(response));assert.equal((await me.json()).email,'synthetic@example.com');assert.ok(calls.some(c=>c.path==='/auth/v1/user'&&c.token===jwt));
}));
test('ordinary login cannot change password without a fresh recovery proof',()=>withServer(async({request})=>{
 const login=await request('/api/auth/login',{email:'synthetic@example.com',password:'long password phrase'});
 const result=await request('/api/auth/password',{password:'new long password phrase',password_confirm:'new long password phrase'},cookies(login));assert.equal(result.status,400);assert.equal((await result.json()).code,'AUTH_LINK_INVALID');
}));
test('recovery confirmation permits one password change and clears sessions',()=>withServer(async({request,calls})=>{
 const confirmation=await request('/api/auth/confirm',{type:'recovery',token_hash:'a'.repeat(64)});assert.equal(confirmation.status,200);
 const result=await request('/api/auth/password',{password:'new long password phrase',password_confirm:'new long password phrase'},cookies(confirmation));assert.equal(result.status,200);assert.equal((await result.json()).updated,true);
 assert.ok(calls.some(c=>c.path==='/auth/v1/user'&&c.method==='PUT'));assert.ok(calls.some(c=>c.path==='/auth/v1/logout?scope=global'));assert.match(result.headers.getSetCookie().join(';'),/Expires=Thu, 01 Jan 1970/);
}));
test('readiness failure cannot be disguised as an empty catalogue',()=>withServer(async({request,client})=>{
 client.rpc=async()=>{throw new AppError('SETUP_REQUIRED',503);};assert.equal((await request('/api/health')).status,200);const response=await request('/api/ready');assert.equal(response.status,503);assert.equal((await response.json()).code,'SETUP_REQUIRED');
}));
test('registration stays unavailable without approved release configuration',()=>withServer(async({request})=>{
 const result=await request('/api/auth/signup',{name:'Synthetic',email:'synthetic@example.com',password:'long password phrase',password_confirm:'long password phrase',consent:true});assert.equal(result.status,503);assert.equal((await result.json()).code,'LEGAL_PENDING');
},{legalReady:false}));
