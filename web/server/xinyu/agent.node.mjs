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
  const x=validateTurn(input()),run=s.run('one',x.turnId,x.source);await runAgent({store:s,space:'one',run,input:x,requestModel,signal:new AbortController().signal,emit:e=>events.push(e)});
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
