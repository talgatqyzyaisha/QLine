import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Vanilla frontend and Express need no transpilation. Do not emit a static demo.
execFileSync(process.execPath, [fileURLToPath(new URL('./check.mjs', import.meta.url))], { stdio: 'inherit' });
console.log('Production source checks passed. Start the full Express application with npm start.');
