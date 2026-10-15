import { loadConfig } from '../Backend/src/config.js';
import { createSupabaseClient } from '../Backend/src/supabase.js';
let config;
try { config=loadConfig(); } catch(error) { console.error('Configuration:',error.message);process.exit(1); }
console.log('Configuration loaded; secret values are not printed.');
const client=createSupabaseClient(config);
try {
 const settings=await client.request('/auth/v1/settings');
 console.log('Supabase Auth reachable. Email provider enabled:',Boolean(settings.external?.email));
 await client.rpc(undefined,'GET','/services');
 console.log('Database API and qline_api migration reachable.');
 console.log('Registration/booking released:',config.legalReady);
} catch(error) {
 console.error('Connection check failed:',error.code||'SERVER');
 console.error('Check network access, the project key and applied migrations. No successful connection is claimed.');
 process.exitCode=1;
}
