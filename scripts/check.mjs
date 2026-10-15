import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
let count=0;
async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const f=resolve(path,e.name);if(e.isDirectory())await walk(f);else if(/\.(m?js)$/.test(f)){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status)throw new Error(r.stderr);count++;}}}
for(const dir of ['Frontend','Backend/src','Backend/test','Backend/integration','Frontend/test','shared','scripts'])await walk(resolve(root,dir));
const entry=await readFile(resolve(root,'Frontend/index.html'),'utf8');
for(const marker of ['lang="ru"','name="viewport"','id="dialog"','aria-live="polite"'])if(!entry.includes(marker))throw new Error('Missing '+marker);
console.log(`Syntax passed: ${count} JS modules. HTML entry checks passed.`);
