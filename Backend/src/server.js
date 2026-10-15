import { createApp } from './app.js';
import { loadConfig } from './config.js';
const config = loadConfig();
const app = createApp({ config });
const server = app.listen(config.port, '0.0.0.0', () => console.log(`QLine listening on port ${config.port}`));
server.requestTimeout = 30000;
server.headersTimeout = 35000;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
});
