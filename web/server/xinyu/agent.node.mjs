import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import express from 'express';
import {createAgentStore,validateAction} from './agent-store.mjs';
import {runAgent,validateTurn} from './agent.mjs';
import {createGateway} from './gateway.mjs';

const source={characterId:'xiaoyu',conversationId:'conversation-1'};
const input=(patch={})=>({turnId:'turn-1',source,messages:[{role:'user',content:'帮我安排英语学习'}],timeZone:'Asia/Shanghai',context:{memoryEnabled:true,profileEnabled:false,memories:[{id:'english',text:'我学习英语时，喜欢每次专注25分钟。',consented:true,at:1,category:'interest'},{id:'cat',text:'我的猫叫奶糖。',consented:true,at:2,category:'daily'}],facts:[]},...patch});
const call=(name,args,id=name)=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
const model=message=>({choices:[{message}],usage:{total_tokens:30}});

test('writes wait for confirmation; duplicate confirmation and separate spaces do not duplicate or expose tasks',()=>{
 const s=createAgentStore(':memory:');try{
  const a=s.propose('one',null,'create_goal',{title:'英语学习',steps:['读一篇短文'],focusMinutes:25,remindAt:new Date(Date.now()+3600000).toISOString()},'manual-1');
  assert.equal(s.snapshot('one').items.length,0);assert.throws(()=>s.getAction(a.id,'two'),/不存在/);
  s.confirm('one',a.id);s.confirm('one',a.id);assert.deepEqual(s.snapshot('one').items.map(i=>i.kind).sort(),['focus','goal','reminder']);assert.equal(s.snapshot('two').items.length,0);assert.deepEqual(s.getAction(a.id,'one').args,{});
 }finally{s.close();}
});
test('a compound plan rolls back completely if a focus timer is already running',()=>{
 const s=createAgentStore(':memory:');try{
  s.manual('one','focus','manage_focus',{operation:'start',title:'阅读',minutes:25});
  const a=s.propose('one',null,'create_goal',{title:'不能部分保存',focusMinutes:20,remindAt:new Date(Date.now()+60000).toISOString()},'goal');
  assert.throws(()=>s.confirm('one',a.id),/已有专注/);assert.equal(s.snapshot('one').items.length,1);assert.equal(s.getAction(a.id,'one').status,'pending');
 }finally{s.close();}
});
test('persistent reminders become due after restart; completion cancels associated work; old imports never resurrect',()=>{
 const dir=mkdtempSync(join(tmpdir(),'xinyu-agent-'));const path=join(dir,'state.sqlite3');let time=Date.now(),s=createAgentStore(path,()=>time);
 try{
  s.importGoals('one',[{id:'old',text:'原来的目标',at:time-1000}]);s.removeItem('one',s.snapshot('one').items[0].id);s.importGoals('one',[{id:'old',text:'不应复活',at:time}]);assert.equal(s.snapshot('one').items.length,0);
  s.manual('one','goal','create_goal',{title:'复习',focusMinutes:1,remindAt:new Date(time+30000).toISOString()});
  const goal=s.snapshot('one').items.find(x=>x.kind==='goal');s.close();time+=90000;s=createAgentStore(path,()=>time);
  assert.equal(s.snapshot('one').items.filter(x=>x.status==='due').length,2);
  s.manual('one','complete','update_goal',{id:goal.id,status:'completed'});
  assert.equal(s.snapshot('one').items.filter(x=>x.status==='due').length,0);
  assert.equal(s.snapshot('one').items.find(x=>x.id===goal.id).status,'completed');
 }finally{s.close();assert(resolve(dir).startsWith(resolve(tmpdir())+sep+'xinyu-agent-'));rmSync(dir,{recursive:true,force:true});}
});
test('reminders can be rescheduled, completed and cancelled; manual request IDs remain idempotent after their time passes',()=>{
 let time=Date.now();const s=createAgentStore(':memory:',()=>time);try{
  const args={operation:'create',title:'背单词',at:new Date(time+10000).toISOString()};s.manual('one','reminder','manage_reminder',args);time+=20000;s.manual('one','reminder','manage_reminder',args);
  assert.equal(s.snapshot('one').items.length,1);const id=s.snapshot('one').items[0].id;
  s.manual('one','move','manage_reminder',{operation:'reschedule',id,at:new Date(time+20000).toISOString()});assert.equal(s.snapshot('one').items[0].status,'scheduled');
  s.manual('one','done','manage_reminder',{operation:'complete',id});assert.equal(s.snapshot('one').items[0].status,'done');
  s.manual('one','cancel','manage_reminder',{operation:'cancel',id});assert.equal(s.snapshot('one').items[0].status,'cancelled');
  assert.throws(()=>validateAction('manage_reminder',{operation:'create',title:'无时区',at:'2027-01-01 20:00'},time),/时区/);
 }finally{s.close();}
});
test('remembering needs active permission and local confirmation; revocation redacts pending candidates',()=>{
 const s=createAgentStore(':memory:');try{
  assert.throws(()=>s.propose('one',null,'remember_preference',{text:'喜欢25分钟学习'},'no'),/开启/);
  s.setPolicy('one',{memoryEnabled:true,profileEnabled:false});const a=s.propose('one',null,'remember_preference',{text:'喜欢25分钟学习'},'yes');
  assert.throws(()=>s.confirm('one',a.id),/本机确认/);s.confirm('one',a.id,{localMemorySaved:true});
  assert(!JSON.stringify(s.getAction(a.id,'one').args).includes('喜欢25分钟'));assert.equal(s.getAction(a.id,'one').status,'executed');
  const b=s.propose('one',null,'remember_preference',{text:'尚未同意的内容'},'pending');s.setPolicy('one',{memoryEnabled:false,profileEnabled:false});
  assert.equal(s.getAction(b.id,'one').status,'rejected');assert.deepEqual(s.getAction(b.id,'one').args,{});
  assert.throws(()=>s.confirm('one',b.id,{localMemorySaved:true}),/已经结束/);
 }finally{s.close();}
});
test('legacy status and completion date survive migration and later renaming without reimporting',()=>{
 let time=Date.now();const s=createAgentStore(':memory:',()=>time);try{
  s.importGoals('one',[{id:'finished',text:'已完成的旧目标',at:time-2000,completedAt:time-1000,status:'completed'},{id:'cancelled',text:'已放下的旧目标',at:time-2000,status:'cancelled'}]);
  const done=s.snapshot('one').items.find(i=>i.details.legacyId==='finished');assert.equal(done.status,'completed');assert.equal(s.snapshot('one').items.find(i=>i.details.legacyId==='cancelled').status,'cancelled');
  time+=5000;s.manual('one','rename','update_goal',{id:done.id,title:'改名后的旧目标'});s.manual('one','repeat-done','update_goal',{id:done.id,status:'completed'});assert.equal(s.snapshot('one').items.find(i=>i.id===done.id).details.completedAt,done.details.completedAt);
  s.removeItem('one',done.id);s.importGoals('one',[{id:'finished',text:'不能重新出现',at:time}]);assert(!s.snapshot('one').items.some(i=>i.id===done.id));
 }finally{s.close();}
});
test('old due reminders stay visible when completed history grows; invalid calendar dates cannot silently roll over',()=>{
 let time=Date.UTC(2026,10,5);const s=createAgentStore(':memory:',()=>time);try{
  s.manual('one','old-reminder','manage_reminder',{operation:'create',title:'不应被历史挤走',at:new Date(time+1000).toISOString()});time+=2000;
  for(let i=0;i<205;i++){s.manual('one','goal-'+i,'create_goal',{title:'历史目标'+i});const goal=s.snapshot('one').items.find(x=>x.kind==='goal'&&x.status==='active');s.manual('one','done-'+i,'update_goal',{id:goal.id,status:'completed'});time++;}
  assert.equal(s.snapshot('one').items[0].status,'due');
  assert.throws(()=>validateAction('manage_reminder',{operation:'create',title:'不存在的日期',at:'2027-02-30T20:00:00+08:00'},time),/不存在/);
  assert.throws(()=>validateAction('manage_reminder',{operation:'create',title:'没有具体时间',at:'2027-02-28Z'},time),/具体时刻/);
 }finally{s.close();}
});
test('expired proposals cannot execute and deleting a conversation cascades its related plans',()=>{
 let time=Date.now();const s=createAgentStore(':memory:',()=>time);try{
  const r=s.run('one','turn',source),a=s.propose('one',r.id,'create_goal',{title:'来源目标'});s.confirm('one',a.id);s.finishRun(r.id,'completed','确认后生效');
  const b=s.propose('one',null,'create_goal',{title:'过期目标'},'old');time+=86400001;assert.throws(()=>s.confirm('one',b.id),/已经结束/);
  s.removeConversation('one',source);assert.equal(s.snapshot('one').items.length,0);assert.throws(()=>s.getAction(a.id,'one'),/不存在/);
  s.clear('one');assert.equal(s.snapshot('one').actions.length,0);
 }finally{s.close();}
});
test('the real agent loop reads tools, proposes a plan, receives tool results and caches retries without writing early',async()=>{
 const s=createAgentStore(':memory:');s.setPolicy('one',{memoryEnabled:true,profileEnabled:false});const requests=[],events=[];let n=0;
 const requestModel=async(messages)=>{requests.push(structuredClone(messages));return ++n===1?model({tool_calls:[call('search_memory',{query:'英语学习专注时长'}),call('get_progress',{})]}):n===2?model({tool_calls:[call('create_goal',{title:'英语学习',steps:['复习单词'],focusMinutes:25})]}):model({content:'按你喜欢的25分钟安排好了，确认卡片后才会生效。'});};
 try{
  const x=validateTurn(input());for(const memory of x.context.memories)s.grant('one',memory);const run=s.run('one',x.turnId,x.source);await runAgent({store:s,space:'one',run,input:x,requestModel,signal:new AbortController().signal,emit:e=>events.push(e)});
  assert.equal(n,3);assert(!requests[0][0].content.includes('奶糖'));assert(requests[1].some(m=>m.role==='tool'&&m.content.includes('25分钟')));
  assert.equal(s.snapshot('one').items.length,0);assert.equal(s.snapshot('one').actions.length,1);assert(events.some(e=>e.type==='done'));
  await runAgent({store:s,space:'one',run:s.run('one',x.turnId,x.source),input:x,requestModel:()=>{throw Error('must not call twice');},signal:new AbortController().signal,emit:()=>{}});
  assert.equal(s.snapshot('one').actions.length,1);s.confirm('one',s.snapshot('one').actions[0].id);assert.equal(s.snapshot('one').items.length,2);
 }finally{s.close();}
});
test('closed memory permission excludes all remembered content even if a client submits it',async()=>{
 const s=createAgentStore(':memory:');try{
  const x=input();let prompt;await runAgent({store:s,space:'one',run:s.run('one',x.turnId,x.source),input:x,requestModel:async messages=>{prompt=messages[0].content;return model({content:'我们先从你想做的事开始。'});},signal:new AbortController().signal,emit:()=>{}});
  assert(!prompt.includes('25分钟'));assert(!prompt.includes('奶糖'));
 }finally{s.close();}
});
test('stopping or changing permission during a model request prevents subsequent tool writes',async()=>{
 for(const stop of ['abort','revoke']){
  const s=createAgentStore(':memory:'),controller=new AbortController();s.setPolicy('one',{memoryEnabled:true,profileEnabled:false});const x=input();
  try{await assert.rejects(runAgent({store:s,space:'one',run:s.run('one',x.turnId,x.source),input:x,requestModel:async()=>{if(stop==='abort')controller.abort();else s.setPolicy('one',{memoryEnabled:false,profileEnabled:false});return model({tool_calls:[call('create_goal',{title:'不应出现'})]});},signal:controller.signal,emit:()=>{}}));assert.equal(s.snapshot('one').actions.length,0);}
  finally{s.close();}
 }
});
test('unregistered tools and invalid JSON never execute; a looping model is bounded',async()=>{
 const s=createAgentStore(':memory:'),events=[];let n=0;const x=input();try{
  await assert.rejects(runAgent({store:s,space:'one',run:s.run('one',x.turnId,x.source),input:x,requestModel:async()=>{n++;return model({tool_calls:[call('shell_exec',{command:'echo forbidden'})]});},signal:new AbortController().signal,emit:e=>events.push(e)}),/步骤较多/);
  assert.equal(n,5);assert.equal(s.snapshot('one').items.length,0);assert(events.filter(e=>e.phase==='error').length===5);
  assert.throws(()=>validateTurn(input({messages:[{role:'system',content:'untrusted'}]})),/格式/);
 }finally{s.close();}
});
async function httpFixture(t,key=''){
 let requests=0;const gateway=createGateway({XINYU_AGENT_DB:':memory:',XINYU_API_KEY:key},async()=>{requests++;return new Response(JSON.stringify(model({content:'真实HTTP传输测试'})));});
 const app=express();app.use('/xinyu-api',gateway);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await gateway.locals.closeAgent();server.closeAllConnections();await new Promise(r=>server.close(r));});
 async function client(){
  const jar=new Map();async function request(path,method='GET',body,extra={}){
   const response=await fetch(origin+'/xinyu-api'+path,{method,headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
   for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}return response;
  }await request('/health');await request('/agent/state');return request;
 }return {origin,client,requests:()=>requests};
}
test('HTTP requires a same-origin session; keyless manual tasks work and browser spaces stay isolated',async t=>{
 const f=await httpFixture(t),one=await f.client(),two=await f.client();
 assert.equal((await fetch(f.origin+'/xinyu-api/agent/state')).status,401);
 assert.equal((await one('/agent/manual','POST',{commandId:'csrf',tool:'create_goal',args:{title:'bad'}},{Origin:'http://attacker.example'})).status,403);
 const created=await one('/agent/manual','POST',{commandId:'new',tool:'create_goal',args:{title:'可以无密钥创建'}});assert.equal(created.status,200);
 assert.equal((await (await one('/agent/state')).json()).items.length,1);assert.equal((await (await two('/agent/state')).json()).items.length,0);
 assert.equal((await one('/agent/runs','POST',input())).status,503);assert.equal(f.requests(),0);
 await one('/agent/data','DELETE');assert.equal((await (await one('/agent/state')).json()).items.length,0);
});
test('HTTP agent returns actual provider output and does not expose its server credential',async t=>{
 const f=await httpFixture(t,'test-server-credential'),client=await f.client();const r=await client('/agent/runs','POST',input());assert.equal(r.status,200);
 const events=(await r.text()).trim().split('\n').map(x=>JSON.parse(x));assert(events.some(e=>e.type==='answer'&&e.text==='真实HTTP传输测试'));assert(!JSON.stringify(events).includes('test-server-credential'));
 await client('/agent/runs','POST',input());assert.equal(f.requests(),1);
});
test('another conversation cannot send pending card data during any model step',async()=>{
 const store=createAgentStore(':memory:');
 try{
  store.setPolicy('one',{memoryEnabled:true,profileEnabled:false});
  const original=store.run('one','private',source);
  const action=store.propose('one',original.id,'remember_preference',{text:'private-marker-A'});
  const turn=input({source:{...source,conversationId:'other'}});
  const requests=[];
  await runAgent({store,space:'one',run:store.run('one',turn.turnId,turn.source),input:turn,signal:new AbortController().signal,emit:()=>{},requestModel:async messages=>{
   requests.push(JSON.stringify(messages));
   return requests.length===1?model({tool_calls:[call('get_progress',{})]}):model({content:'完成'});
  }});
  assert.equal(requests.length,2);
  assert.ok(requests.every(payload=>!payload.includes('private-marker-A')));
  assert.equal(store.confirm('one',action.id,{localMemorySaved:true}).action.status,'executed');
 }finally{store.close();}
});
test('knowledge versions, sharing, scope, citations and physical FTS deletion',async()=>{
 const s=createAgentStore(':memory:');try{
  s.space('a');s.space('b');
  const k=s.knowledge,d=await k.put('a','学习.md',Buffer.from('# 星光\n火星观测手册'),false);
  assert.equal(k.search('a','火星',true).length,0);
  const [local]=k.search('a','火星');assert.equal(local.heading,'星光');assert.equal(local.page,1);
  k.share('a',d.id,true);assert.equal(k.search('a','火星',true)[0].id,local.id);
  assert.deepEqual(k.search('b','火星'),[]);assert.throws(()=>k.chunk('b',local.id));
  await assert.rejects(k.put('a','失败.pdf',Buffer.from('bad'),true,d.id));assert.equal(k.chunk('a',local.id).version,1);
  await k.put('a','更新.txt',Buffer.from('候鸟迁徙'),true,d.id);
  assert.throws(()=>k.chunk('a',local.id));assert.deepEqual(k.search('a','火星'),[]);
  assert.equal(k.search('a','候鸟')[0].version,2);k.remove('a',d.id);assert.deepEqual(k.search('a','候鸟'),[]);
 }finally{s.close();}
});
test('grant requires matching content and character; deleting source revokes the grant',()=>{
 const s=createAgentStore(':memory:');try{
  const memory={id:'m',text:'月球',source};s.setPolicy('a',{memoryEnabled:true,profileEnabled:false});s.grant('a',memory);
  assert.equal(s.authorized('a',source.characterId,[memory]).length,1);
  assert.deepEqual(s.authorized('a','other',[memory]),[]);assert.deepEqual(s.authorized('a',source.characterId,[{...memory,text:'changed'}]),[]);
  s.removeConversation('a',source);assert.deepEqual(s.authorized('a',source.characterId,[memory]),[]);
 }finally{s.close();}
});
test('manual idempotency rejects changed payload and trace is private and metadata-only',()=>{
 const s=createAgentStore(':memory:');try{
  s.manual('a','k','create_goal',{title:'private title'});assert.throws(()=>s.manual('a','k','create_goal',{title:'changed'}),e=>e.status===409);
  const r=s.run('a','turn',source);s.record(r.id,'model','completed',20,null);
  assert.equal(s.trace('a',r.id).events[0].tokens,null);assert.throws(()=>s.trace('b',r.id));
  s.removeConversation('a',source);assert.throws(()=>s.trace('a',r.id));
 }finally{s.close();}
});
test('text PDF can be imported and its page citation opened',async()=>{
 const stream='BT /F1 12 Tf 20 80 Td (Lighthouse astronomy) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
 let pdf='%PDF-1.4\n';const offsets=[0];
 objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
 const xref=pdf.length;pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 const s=createAgentStore(':memory:');try{
  s.space('one');await s.knowledge.put('one','field.pdf',Buffer.from(pdf),true);
  const hit=s.knowledge.search('one','astronomy',true)[0];assert.equal(hit.page,1);assert.match(s.knowledge.chunk('one',hit.id).text,/Lighthouse/);
 }finally{s.close();}
});
test('legacy database upgrade requires explicit action and produces an independently readable backup',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const {upgrade}=await import('./migration.mjs');
 const {readdirSync}=await import('node:fs');
 const dir=mkdtempSync(join(tmpdir(),'xinyu-migrate-')),path=join(dir,'old.db');
 try{
  const db=new DatabaseSync(path);db.exec("CREATE TABLE spaces(id TEXT PRIMARY KEY,memory_enabled INTEGER,profile_enabled INTEGER,policy_version INTEGER,imported INTEGER); INSERT INTO spaces VALUES('legacy',1,0,2,1)");
  assert.throws(()=>upgrade(db,path),/停服/);upgrade(db,path,true);upgrade(db,path,true);db.close();
  const backup=join(dir,readdirSync(dir).find(p=>p.includes('pre-agent2'))),copy=new DatabaseSync(backup,{readOnly:true});
  assert.equal(copy.prepare('PRAGMA user_version').get().user_version,0);assert.equal(copy.prepare('SELECT policy_version FROM spaces').get().policy_version,2);copy.close();
  const s=createAgentStore(path);assert.equal(s.policy('legacy').version,2);s.close();
 }finally{assert(resolve(dir).startsWith(resolve(tmpdir())+sep+'xinyu-migrate-'));rmSync(dir,{recursive:true,force:true});}
});
test('sqlite-vec exact scoped distance and deletion work on this platform',async()=>{
 const {DatabaseSync}=await import('node:sqlite'),{getLoadablePath}=await import('sqlite-vec');
 const db=new DatabaseSync(':memory:',{allowExtension:true});try{
  db.loadExtension(getLoadablePath());db.enableLoadExtension(false);
  db.exec("CREATE TABLE vectors(space TEXT,id INTEGER,embedding BLOB,PRIMARY KEY(space,id)); INSERT INTO vectors VALUES('a',1,vec_f32('[0,1]')),('b',2,vec_f32('[0,0]'))");
  const find=db.prepare("SELECT id FROM vectors WHERE space=? ORDER BY vec_distance_L2(embedding,vec_f32('[0,0]')) LIMIT 1");
  assert.equal(find.get('a').id,1);db.exec("DELETE FROM vectors WHERE space='a'");assert.equal(find.get('a'),undefined);assert.equal(find.get('b').id,2);
 }finally{db.close();}
});
test('paired backup restores the browser-space fixture and SQLite to an independent directory',async()=>{
 const {execFileSync}=await import('node:child_process');
 const {readFileSync,writeFileSync,mkdirSync}=await import('node:fs');
 const dir=mkdtempSync(join(tmpdir(),'xinyu-pair-')),database=join(dir,'source.db'),profile=join(dir,'profile'),bundle=join(dir,'bundle'),restored=join(dir,'restored');
 const cli=new URL('./paired-backup.mjs',import.meta.url),{fileURLToPath}=await import('node:url');
 const run=(...args)=>execFileSync(process.execPath,[fileURLToPath(cli),...args],{stdio:'pipe'});
 try{
  const s=createAgentStore(database);s.manual('cookie-space','cmd','create_goal',{title:'旧约定'});s.close();
  mkdirSync(profile);writeFileSync(join(profile,'origin-fixture'),'cookie-space');
  run('backup',database,profile,bundle);run('restore',bundle,restored);
  const copy=createAgentStore(join(restored,'agent.sqlite3'));
  try{assert.equal(copy.snapshot(readFileSync(join(restored,'browser','origin-fixture'),'utf8')).items[0].title,'旧约定');}finally{copy.close();}
  writeFileSync(join(bundle,'browser','origin-fixture'),'changed');
  assert.throws(()=>run('restore',bundle,join(dir,'corrupt')));
 }finally{assert(resolve(dir).startsWith(resolve(tmpdir())+sep+'xinyu-pair-'));rmSync(dir,{recursive:true,force:true});}
});
test('restart resumes durable proposal over HTTP, then racing confirmations create one reminder',async()=>{
 const {createHash}=await import('node:crypto');
 const dir=mkdtempSync(join(tmpdir(),'xinyu-resume-')),path=join(dir,'agent.db'),cookie='a'.repeat(64);
 const space=createHash('sha256').update(cookie).digest('hex'),x=input();let server,gateway,modelCalls=0;
 try{
  const s=createAgentStore(path),run=s.run(space,x.turnId,x.source,x.messages.at(-1).content);
  const proposal=s.propose(space,run.id,'manage_reminder',{operation:'create',title:'喝水',at:new Date(Date.now()+600000).toISOString()});s.close();
  gateway=createGateway({XINYU_AGENT_DB:path,XINYU_API_KEY:'fixture'},async()=>{modelCalls++;throw Error('unexpected model request');});
  const app=express();app.use('/xinyu-api',gateway);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const origin='http://127.0.0.1:'+server.address().port,session=(await fetch(origin+'/xinyu-api/health')).headers.getSetCookie()[0].split(';')[0];
  const post=(path,body)=>fetch(origin+'/xinyu-api/agent'+path,{method:'POST',headers:{Origin:origin,Cookie:session+'; xinyu_agent_space='+cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const resumed=await post('/runs/'+run.id+'/resume',x);assert.equal(resumed.status,200);assert.match(await resumed.text(),/from_proposal|已经生成安排/);
  const replies=await Promise.all([post('/actions/'+proposal.id+'/confirm',{}),post('/actions/'+proposal.id+'/confirm',{})]);
  for(const r of replies){assert.equal(r.status,200);assert.equal((await r.json()).snapshot.items.length,1);}
  assert.equal(modelCalls,0);
  assert.equal((await post('/runs',{...x,messages:[{role:'user',content:'changed'}]})).status,409);
 }finally{await gateway?.locals.closeAgent();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}assert(resolve(dir).startsWith(resolve(tmpdir())+sep+'xinyu-resume-'));rmSync(dir,{recursive:true,force:true});}
});
test('semantic search only reads shared, active and in-space vectors after awaiting embedding',async()=>{
 let onQuery;const encode=async(texts,query)=>{
  if(query)onQuery?.();
  return {model:'fixture',vectors:texts.map(()=>new Float32Array([1,0]))};
 };
 const s=createAgentStore(':memory:',Date.now,encode);
 try{
  s.space('one');s.space('two');
  const k=s.knowledge,d=await k.put('one','语义.txt',Buffer.from('旧标题'),true);
  await k.put('two','别人的.txt',Buffer.from('旧标题'),true);
  assert.equal((await k.retrieve('one','同义词',true))[0].name,'语义.txt');
  onQuery=()=>k.share('one',d.id,false);assert.deepEqual(await k.retrieve('one','同义词',true),[]);
  onQuery=undefined;k.remove('one',d.id);assert.deepEqual(await k.retrieve('one','同义词'),[]);
 }finally{s.close();}
});
