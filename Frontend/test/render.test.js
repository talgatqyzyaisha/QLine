// Render and interaction-contract smoke tests use isolated HTTP fixtures, never runtime fallback data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { clinics, services as taxonomy, demoSlots, localDate } from '../../Backend/test/fixtures/catalog.js';
import { initialState, demoOperation } from '../../Backend/test/fixtures/domain-fixture.js';
const root = new URL('../../', import.meta.url);
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '/shared/domain.js') return { url: new URL('shared/domain.js', root).href, shortCircuit: true };
  return next(specifier, context);
} });
const memory = () => { const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))}; };
globalThis.localStorage = memory();
globalThis.window = { Q_CONFIG: {mode:'supabase',registrationEnabled:true,legalApproved:true,smsEnabled:false,storageOrigin:'https://test.supabase.co'} };
globalThis.document = { documentElement: {lang:'ru'} };
globalThis.location = new URL('https://qline.test/');
const state=initialState(clinics,taxonomy);
for(const c of clinics)for(const service of c.services)state.slots.push(...demoSlots(c,localDate(1),service));
let user=null;
globalThis.fetch=async(url,options={})=>{
 const parsed=new URL(url,'https://qline.test');
 const path=parsed.pathname.replace(/^\/api/,'');
 try{const data=demoOperation(state,user,options.method||'GET',path,options.body?JSON.parse(options.body):{},Object.fromEntries(parsed.searchParams));return new Response(JSON.stringify(data),{status:200});}
 catch(error){return new Response(JSON.stringify({code:error.code}),{status:error.status||500});}
};
const {api}=await import('../js/api.js');
const {services}=await import('../js/data.js');services.push(...taxonomy);
const {setLang}=await import('../js/i18n.js');
const {home,catalog,detail}=await import('../js/public.js');
const {booking}=await import('../js/booking.js');
const {login,profile,appointments}=await import('../js/account.js');
const {forgotPassword,resetPassword,phoneLogin}=await import('../js/auth.js');
const {dashboard,admin}=await import('../js/dashboard.js');
const ctx={get user(){return user;},go(){},render(){},async refreshUser(){return user;}};
const setRole=role=>{user={id:'fixture-user',name:'Synthetic',phone:'+77000000000',role,clinic_id:['owner','administrator','dentist'].includes(role)?'c1':null,dentist_id:role==='dentist'?'d1':null};};
function checkHtml(html){
 assert.ok(html.length>50);assert.ok(!html.includes('undefined'));assert.ok(!html.includes('[object Object]'));
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const label of html.matchAll(/\bfor="([^"]+)"/g))assert.ok(ids.includes(label[1]));
 for(const form of html.matchAll(/<form\b([^>]*)>/g))assert.match(form[1],/novalidate/);
 assert.ok(!/data-role=|auth\/demo|Демонстрационн|Тестовый вход/.test(html));
}
test('public and real auth forms render in RU/KZ; catalogue filters alter results',async()=>{
 for(const language of ['ru','kz']){
  setLang(language);
  for(const page of [await home(ctx),await detail(ctx,'lumina-dental'),await booking(ctx,'lumina-dental'),await login(ctx),await login(ctx,true),await forgotPassword(ctx),await resetPassword(ctx),await phoneLogin(ctx)])checkHtml(page.html);
  location.search='?city=astana';assert.ok(!(await catalog(ctx)).html.includes('class="clinic-card"'));
  location.search='?service=implant';const result=await catalog(ctx);assert.ok(result.html.includes('Forma Dental'));assert.ok(!result.html.includes('Lumina Dental'));location.search='';
 }
});
test('patient, clinic and platform views retain roles and labelled responsive tables',async()=>{
 setLang('ru');setRole('patient');
 await api('/appointments',{method:'POST',body:{slot_id:state.slots.find(s=>s.clinic_id==='c1').id,name:'Synthetic',phone:'+77000000000',comment:'',consent:true,idempotency_key:crypto.randomUUID()}});
 for(const [role,fns]of [['patient',[profile,appointments]],['owner',[dashboard]],['dentist',[dashboard]],['platform_admin',[admin]]]){
  setRole(role);for(const fn of fns)checkHtml((await fn(ctx)).html);
  if(role==='owner')for(const tab of ['schedule','appointments','doctors','services','profile','analytics','notifications']){location.search='?tab='+tab;const page=await dashboard(ctx);checkHtml(page.html);if(tab==='appointments'){assert.match(page.html,/class="cell-label"/);assert.match(page.html,/data-status="confirmed"/);}}
  if(role==='platform_admin')for(const tab of ['categories','complaints','users','audit']){location.search='?tab='+tab;checkHtml((await admin(ctx)).html);}
  location.search='';
 }
 user=null;
});
test('filters precede results and calendar layout rejects untrusted view attributes',async()=>{
 location.search='';const page=await catalog(ctx);assert.ok(page.html.indexOf('catalog-mobile-tools')<page.html.indexOf('id="filters"'));
 assert.match(page.html,/aria-controls="filters" aria-expanded="false"/);
 setRole('owner');for(const view of ['day','week','month']){location.search='?tab=schedule&view='+view;assert.ok((await dashboard(ctx)).html.includes('data-calendar-view="'+view+'"'));}
 location.search='?tab=schedule&view=%22%3E%3Cscript%3E';const invalid=await dashboard(ctx);assert.match(invalid.html,/data-calendar-view="week"/);assert.ok(!invalid.html.includes('<script>'));location.search='';user=null;
});
