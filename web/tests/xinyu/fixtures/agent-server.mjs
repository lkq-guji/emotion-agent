// Engineering-only provider fixture. The product server never imports this file.
import {createServer} from 'vite';
import {createGateway} from '../../../server/xinyu/gateway.mjs';
const model=message=>new Response(JSON.stringify({choices:[{message}],usage:{total_tokens:80}}),{headers:{'Content-Type':'application/json'}});
const call=(name,args)=>({id:'fixture-'+name,type:'function',function:{name,arguments:JSON.stringify(args)}});
export async function startAgentFixture(){
 const calls=[];let aborted=0;const previous=process.env.XINYU_AGENT_DB;process.env.XINYU_AGENT_DB=':memory:';
 const gateway=createGateway({XINYU_AGENT_DB:':memory:',XINYU_API_KEY:'engineering-provider-only',XINYU_MODEL:'engineering-tool-fixture'},async(url,options)=>{
  const body=JSON.parse(options.body);calls.push(structuredClone(body));
  const text=body.messages.filter(m=>m.role==='user').at(-1)?.content||'',tools=body.messages.filter(m=>m.role==='tool');
  if(text.includes('[工程失败]'))return new Response('{}',{status:502});
  if(text.includes('[工程等待]'))await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,15000);options.signal.addEventListener('abort',()=>{aborted++;clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));},{once:true});});
  if(text.includes('[工程偏好]'))return tools.length?model({content:'这条学习偏好已经整理为候选，点击卡片确认后才会保存。'}):model({tool_calls:[call('remember_preference',{text:'我学习英语时喜欢每次专注25分钟。',category:'interest'})]});
  if(text.includes('[工程安排]')){
   if(!tools.length)return model({tool_calls:[call('search_memory',{query:'英语学习专注时间'}),call('get_progress',{})]});
   if(!tools.some(t=>t.tool_call_id==='fixture-create_goal')){
    const found=JSON.parse(tools.find(t=>t.tool_call_id==='fixture-search_memory')?.content||'{}'),minutes=found.memories?.some(m=>m.text.includes('25分钟'))?25:15;
    return model({tool_calls:[call('create_goal',{title:'英语学习小目标',steps:['复习十个单词','读一段短文'],focusMinutes:minutes,remindAt:new Date(Date.now()+3600000).toISOString()})]});
   }
   return model({content:'已经整理好学习目标、计时和提醒。它们尚未执行，确认卡片后生效。'});
  }
  if(text.includes('[工程取消]')){
   if(!tools.length)return model({tool_calls:[call('get_progress',{})]});
   if(!tools.some(t=>t.tool_call_id==='fixture-manage_reminder')){
    const state=JSON.parse(tools[0].content),reminder=state.items.find(x=>x.kind==='reminder'&&['scheduled','due'].includes(x.status));
    return reminder?model({tool_calls:[call('manage_reminder',{operation:'cancel',id:reminder.id})]}):model({content:'目前没有需要取消的提醒。'});
   }
   return model({content:'取消操作已放在卡片里，确认后就不再提醒。'});
  }
  return model({content:'[工程回复] 我在这里。'});
 });
 const vite=await createServer({configFile:'vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:5192,strictPort:true},plugins:[{name:'engineering-agent-fixture',enforce:'pre',configureServer(server){server.middlewares.use('/xinyu-api',(req,res)=>gateway(req,res,()=>{res.statusCode=404;res.end();}));}}]});
 await vite.listen();
 return {calls,get aborted(){return aborted;},close:async()=>{await vite.close();await gateway.locals.closeAgent();if(previous===undefined)delete process.env.XINYU_AGENT_DB;else process.env.XINYU_AGENT_DB=previous;}};
}
