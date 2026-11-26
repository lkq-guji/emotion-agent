import express from 'express';
import { fileURLToPath } from 'node:url';
import { createGateway } from './gateway.mjs';
try { process.loadEnvFile(process.env.XINYU_ENV_FILE || '.env.local'); } catch(error) { if(error.code!=='ENOENT') throw error; }
const app = express(); app.disable('x-powered-by');
const gateway=createGateway();app.use('/xinyu-api',gateway);
app.use(express.static(fileURLToPath(new URL('../../dist/',import.meta.url)),{dotfiles:'deny'}));
const port = Number(process.env.PORT || 5178);
const server=app.listen(port,'127.0.0.1',()=>console.log(`心屿智伴：http://127.0.0.1:${port}（仅本机）`));
let stopping=false;
async function stop(){if(stopping)return;stopping=true;server.close();await gateway.locals.closeAgent();server.closeAllConnections();}
process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());
