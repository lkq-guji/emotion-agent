import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createAgentStore} from '../server/xinyu/agent-store.mjs';
import {runAgent} from '../server/xinyu/agent.mjs';

// Synthetic contract cases. Supply --live and a dedicated evaluation key to measure model decisions.
const live=process.argv.includes('--live'),key=process.env.XINYU_EVAL_API_KEY;
if(live&&!key)throw new Error('真实评测需要单独提供 XINYU_EVAL_API_KEY');
const model=process.env.XINYU_EVAL_MODEL||'deepseek-flash';
const samples=[
 ['最近有点累，想聊聊。',null,{}],
 ['帮我设一个叫读书的目标，专注二十五分钟。','create_goal',{title:'读书',focusMinutes:25}],
 ['记住我喜欢雨声。','remember_preference',{text:'我喜欢雨声',category:'interest'}],
 ['安排十分钟专注练字。','manage_focus',{operation:'start',title:'练字',minutes:10}],
 ['帮我在北京时间2030年3月2日上午九点提醒还书。','manage_reminder',{operation:'create',title:'还书',at:'2030-03-02T01:00:00.000Z'}],
 ['查一下我的进度。','get_progress',{}],
 ['你记得我喜欢什么音乐吗？','search_memory',{query:'音乐'}],
 ['说说我的资料里有关灯塔的段落。','search_knowledge',{query:'灯塔'}],
 ['把复习这个目标标记为完成。','update_goal',{status:'completed'}],
 ['晚点提醒我，具体几点我还没定。',null,{}]
];
const clock=()=>Date.parse('2030-03-01T00:00:00Z');
const results=[];
const variants=JSON.parse(readFileSync(new URL('../tests/xinyu/fixtures/agent-eval-variants.json',import.meta.url)));
const cases=Array.from({length:12},(_,k)=>samples.map(([question,tool,args],i)=>[k===0?question:variants[i][k-1],tool,args])).flat();
const limit=live?Number(process.env.XINYU_EVAL_CASE_LIMIT||5):cases.length;
if(!Number.isInteger(limit)||limit<1||limit>cases.length)throw new Error('评测用例上限无效');
let remaining=live?Number(process.env.XINYU_EVAL_REQUEST_LIMIT||20):Infinity;
if(live&&(!Number.isInteger(remaining)||remaining<1||remaining>600))throw new Error('模型请求上限无效');
for(const [question,expected,fields] of cases.slice(0,limit)){
 const store=createAgentStore(':memory:',clock);
 try{
  store.setPolicy('eval',{memoryEnabled:true,profileEnabled:false});
  const goal=store.manual('eval','seed','create_goal',{title:'复习'}).snapshot.items[0];
  const args=expected==='update_goal'?{...fields,id:goal.id}:fields;
  const input={turnId:'eval',source:{characterId:'x',conversationId:'c'},timeZone:'Asia/Shanghai',messages:[{role:'user',content:question}],context:{memories:[],facts:[],memoryEnabled:true,profileEnabled:false}};
  const calls=[];let requestCount=0,tokens=0,known=true;
  const run=store.run('eval','eval',input.source);
  const requestModel=async(messages,tools,signal)=>{
   requestCount++;let response;
   if(live){
    if(remaining--<=0)throw Error('达到本次评测模型调用上限');
    const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal,body:JSON.stringify({model,messages,tools,max_tokens:500,stream:false,thinking:{type:'disabled'}})});
    if(!r.ok)throw new Error('HTTP '+r.status);response=await r.json();
   }else{
    const message=requestCount===1&&expected?{tool_calls:[{id:'case',function:{name:expected,arguments:JSON.stringify(args)}}]}:{content:'工程回执'};
    response={choices:[{message}]};
   }
   if(response.usage?.total_tokens!=null)tokens+=response.usage.total_tokens;else known=false;
   for(const call of response.choices[0]?.message?.tool_calls||[])calls.push({name:call.function.name,args:JSON.parse(call.function.arguments)});
   return response;
  };
  const started=performance.now();let error;
  try{await runAgent({store,space:'eval',run,input,emit:()=>{},signal:AbortSignal.timeout(90000),now:clock,requestModel});}catch(e){error=String(e.message);}
  const selected=calls.filter(c=>c.name!=='get_progress'||expected==='get_progress');
  const toolOK=!error&&(expected?selected.length===1&&selected[0].name===expected:calls.length===0);
  const normalize=v=>typeof v==='string'?v.replace(/[。！\s]/gu,''):v;
  const argOK=toolOK&&Object.entries(args).every(([k,v])=>k==='at'?Date.parse(selected[0]?.args[k])===Date.parse(v):normalize(selected[0]?.args[k])===normalize(v));
  const before=store.snapshot('eval'),writes=before.actions.filter(a=>a.status==='pending');
  assert.equal(before.items.length,1,'工具确认前写入了业务记录');
  for(const action of writes)store.confirm('eval',action.id,{localMemorySaved:true});
  const after=store.snapshot('eval');
  const completed=argOK&&(!expected||['get_progress','search_memory','search_knowledge'].includes(expected)?writes.length===0:
    writes.length===1&&after.actions.find(a=>a.id===writes[0].id)?.status==='executed');
  results.push({question,expected,toolOK,argOK,completed,requestCount,tokens:known?tokens:null,ms:Math.round(performance.now()-started),error});
 }finally{store.close();}
}
console.log(JSON.stringify({mode:live?'provider':'contract',model:live?model:null,n:results.length,tools:results.filter(r=>r.toolOK).length,arguments:results.filter(r=>r.argOK).length,completed:results.filter(r=>r.completed).length,results},null,2));
if(!live&&results.some(r=>!r.completed))process.exitCode=1;
