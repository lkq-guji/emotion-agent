import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';

test('clean checkout starts without private environment and reports missing credentials honestly',async()=>{
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const env={...process.env,PORT:String(port),DEEPSEEK_API_KEY:'',XINYU_API_KEY:'',XINYU_ENV_FILE:'.env.not-present-for-startup-test'},child=spawn(process.execPath,['server/xinyu/start.mjs'],{env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 const origin=`http://127.0.0.1:${port}`;try{
  let response;for(let i=0;i<100;i++){try{response=await fetch(origin+'/xinyu-api/health');break;}catch{if(child.exitCode!==null)throw Error('Server exited: '+output);await new Promise(r=>setTimeout(r,100));}}assert(response,'Server did not start');
  const state=await response.json();assert.equal(state.configured,false);assert.equal(state.localOnly,true);assert(!JSON.stringify(state).includes('API_KEY'));const cookie=response.headers.get('set-cookie').split(';')[0];
  const home=await fetch(origin+'/');assert.equal(home.status,200);assert.match(await home.text(),/心屿智伴/);
  for(const asset of ['/xinyu/generated/room-panorama-v3.png','/xinyu/island/assets.json','/xinyu/audio/neural/PROVENANCE.json'])assert.equal((await fetch(origin+asset)).status,200,asset);
  const missing=await fetch(origin+'/xinyu-api/chat/completions',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'startup fixture'}]})});assert.equal(missing.status,503);assert.match((await missing.json()).error.message,/未配置模型密钥/);
  assert.equal((await fetch(origin+'/.env.local')).status,404);
 }finally{child.kill();if(child.exitCode===null)await once(child,'exit');}
});
