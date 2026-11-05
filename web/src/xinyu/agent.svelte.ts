import {companion,updateData} from './state.svelte';
import {addMemory,type Memory,type Source} from './domain';
import {relevantMemories} from './memoryRetrieval.mjs';
import {withPausedDatabaseWrites} from '../ts/globalApi.svelte';
import {saveKV} from '../ts/storage/saveKV';
import {activeFacts} from './companionship';

export interface AgentItem {
 id:string;kind:'goal'|'reminder'|'focus';title:string;status:string;due_at:number|null;goal_id:string|null;
 details:{steps?:string[];minutes?:number;startedAt?:number;legacyId?:string;completedAt?:number};created_at:number;updated_at:number;
}
export interface AgentAction {
 id:string;run_id:string|null;tool:string;args:{title?:string;text?:string;category?:Memory['category'];steps?:string[];focusMinutes?:number;remindAt?:string;at?:string;minutes?:number;operation?:string;id?:string;status?:string;memoryId?:string};
 status:string;result:string;created_at:number;character_id?:string;conversation_id?:string;message_id?:string;
}
interface Snapshot {items:AgentItem[];actions:AgentAction[];imported:boolean;serverTime:number}
export const agentState=$state({available:false,loaded:false,ready:false,busy:false,phase:'',error:'',updating:'',items:[] as AgentItem[],actions:[] as AgentAction[],events:[] as {name?:string;summary:string;phase?:string}[],memoryIds:[] as string[],tokens:0,runId:'',source:{characterId:'',conversationId:''},serverTime:0});
let connecting:Promise<void>|undefined,policyQueue:Promise<void>=Promise.resolve(),sentPolicy='',runController:AbortController;
const usedKey='xinyu.agent.used';
const isUsed=()=>agentState.available||localStorage.getItem(usedKey)==='1';
const message=(error:unknown)=>String(error).replace(/^Error: /,'');
function applySnapshot(value:Snapshot){
 if(!value||!Array.isArray(value.items)||!Array.isArray(value.actions))throw new Error('后台任务状态无法读取。');
 if(value.serverTime<agentState.serverTime)return;
 agentState.items=value.items;agentState.actions=value.actions;agentState.serverTime=value.serverTime;agentState.loaded=true;agentState.ready=true;agentState.error='';
 const legacy=new Map(value.items.filter(i=>i.kind==='goal'&&i.details.legacyId).map(i=>[i.details.legacyId,i]));
 if(!companion.locked&&!companion.error&&companion.data.goals.some(g=>{const i=legacy.get(g.id);return i&&(g.text!==i.title||g.status!==i.status||g.completedAt!==(i.status==='completed'?(i.details.completedAt||i.updated_at):undefined));}))updateData(data=>{
  for(const goal of data.goals){const item=legacy.get(goal.id);if(item){goal.text=item.title;goal.status=item.status as typeof goal.status;goal.completedAt=item.status==='completed'?(item.details.completedAt||item.updated_at):undefined;}}
 });
}
async function persistConfirmedMemory(action:AgentAction){
 let saved:Promise<void>=Promise.resolve();
 await withPausedDatabaseWrites(()=>{
  const exists=companion.data.memories.some(m=>m.id===action.id);
  if(exists&&!saveKV.hasDirty())return;
  let cancel:()=>void;
  saved=new Promise<void>((resolve,reject)=>{
   const finish=(error?:Error)=>{clearTimeout(timer);window.removeEventListener('xinyu:save',listener);error?reject(error):resolve();};
   const listener=(event:CustomEvent<{ok:boolean}>)=>finish(event.detail.ok?undefined:new Error('本机存档未写入，候选仍保留，请修复存储后再确认。'));
   const timer=setTimeout(()=>finish(new Error('本机存档仍未完成，候选已保留，请稍后再确认。')),10000);
   window.addEventListener('xinyu:save',listener);cancel=()=>{clearTimeout(timer);window.removeEventListener('xinyu:save',listener);resolve();};
  });
  try{if(!exists)updateData(data=>{
   addMemory(data,action.args.text||'',action.args.category||'interest',true,action.character_id&&action.conversation_id?{characterId:action.character_id,conversationId:action.conversation_id,messageId:action.message_id}:undefined);
   data.memories[0].id=action.id;
  });}catch(error){cancel();throw error;}
 });
 await saved;
}
async function response(path:string,init:RequestInit={}){
 const perform=()=>fetch('/xinyu-api/agent'+path,{credentials:'same-origin',...init,headers:{...(init.body?{'Content-Type':'application/json'}:{}),...init.headers}});
 let res=await perform();
 if(res.status===401){const health=await fetch('/xinyu-api/health',{credentials:'same-origin',signal:init.signal});if(health.ok)res=await perform();}
 if(!res.ok){let error='本机后台暂时无法连接。';try{const body=await res.json();error=body.error?.message||body.error||error;}catch{/* keep the connection error */}throw new Error(error);}
 return res;
}
async function json(path:string,method='GET',body?:unknown){return (await response(path,{method,...(body===undefined?{}:{body:JSON.stringify(body)})})).json();}
export function setAgentAvailable(available:boolean){
 agentState.available=available;if(!available){agentState.ready=false;return;}
 void connectAgent().catch(error=>{agentState.ready=false;agentState.error=message(error);});
}
export async function syncAgentPrivacy(){
 if(!agentState.available||companion.locked)return;
 const wanted=String(companion.data.preferences.memoryEnabled)+':'+String(companion.data.preferences.profileEnabled);
 if(sentPolicy&&sentPolicy!==wanted)runController?.abort();
 policyQueue=policyQueue.catch(()=>{}).then(async()=>{
  const memoryEnabled=companion.data.preferences.memoryEnabled,profileEnabled=companion.data.preferences.profileEnabled,key=String(memoryEnabled)+':'+String(profileEnabled);
  if(sentPolicy===key)return;
  await json('/privacy','POST',{memoryEnabled,profileEnabled});sentPolicy=key;
 });
 return policyQueue;
}
export function connectAgent(){
 if(connecting)return connecting;
 connecting=(async()=>{
  let value:Snapshot=await json('/state');
  if(!value.imported)value=await json('/import-goals','POST',{goals:companion.data.goals.map(g=>({id:g.id,text:g.text,at:g.at,completedAt:g.completedAt,status:g.status}))});
  await syncAgentPrivacy();applySnapshot(value);localStorage.setItem(usedKey,'1');
 })().finally(()=>connecting=undefined);
 return connecting;
}
export async function refreshAgent(){
 if(!agentState.available||companion.locked||agentState.updating)return;
 try{await connectAgent();}catch(error){agentState.ready=false;agentState.error=message(error);}
}
export function startAgentPolling(){
 const stop=()=>runController?.abort();
 const focus=()=>{if(!document.hidden)void refreshAgent();};
 const timer=setInterval(()=>{if(!document.hidden&&!companion.locked)void refreshAgent();},5000);
 window.addEventListener('focus',focus);window.addEventListener('xinyu:before-lock',stop);
 return()=>{clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('xinyu:before-lock',stop);stop();};
}
export async function runAgentTurn(messages:{role:'user'|'assistant';content:string}[],source:Source,signal:AbortSignal){
 await connectAgent();await syncAgentPrivacy();
 agentState.source={characterId:source.characterId,conversationId:source.conversationId};
 runController=new AbortController();const combined=AbortSignal.any([signal,runController.signal]);
 agentState.busy=true;agentState.phase='小屿正在认真听…';agentState.events=[];agentState.memoryIds=[];let answer='',done=false;
 const allowed=companion.data.preferences.memoryEnabled?companion.data.memories.filter(m=>m.consented&&(!m.source?.characterId||m.source.characterId===source.characterId)):[];
 const preferred=relevantMemories(allowed,messages.at(-1)?.content||'',50,50000);
 // shortcut: at most 500 local candidates per turn; prioritize relevant older records before recent ones.
 const pool=[...new Map([...preferred,...allowed].map(m=>[m.id,m])).values()].slice(0,500);
 const facts=companion.data.preferences.profileEnabled?activeFacts(companion.data,source.characterId).slice(0,20).map(f=>({label:f.label,value:f.value})):[];
 const event=(value:any)=>{
  if(combined.aborted)return;
  if(value.type==='status')agentState.phase=String(value.label||'正在整理…');
  else if(value.type==='memory'){agentState.memoryIds=[...new Set([...agentState.memoryIds,...(value.ids||[])])];agentState.events.push({summary:String(value.summary),phase:'read'});}
  else if(value.type==='tool'){agentState.events.push({name:value.name,summary:String(value.summary),phase:value.phase});if(value.snapshot)applySnapshot(value.snapshot);}
  else if(value.type==='answer')answer=String(value.text||'');
  else if(value.type==='done'){done=true;agentState.runId=value.runId;agentState.tokens=value.tokens||0;if(value.snapshot)applySnapshot(value.snapshot);}
  else if(value.type==='error')throw new Error(String(value.message||'这次处理未完成。'));
 };
 try{
  const res=await response('/runs',{method:'POST',signal:combined,body:JSON.stringify({turnId:source.messageId,source,messages,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,context:{memoryEnabled:companion.data.preferences.memoryEnabled,profileEnabled:companion.data.preferences.profileEnabled,memories:pool,facts}})});
  const reader=res.body?.getReader();if(!reader)throw new Error('后台没有返回可读取的回复。');
  const decoder=new TextDecoder();let buffer='';
  try{while(true){const next=await reader.read();buffer+=decoder.decode(next.value||new Uint8Array(),{stream:!next.done});if(buffer.length>1024*1024)throw new Error('后台回复过长，已停止读取。');let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);if(line.trim())event(JSON.parse(line));}if(next.done)break;}if(buffer.trim())event(JSON.parse(buffer));}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  if(combined.aborted)throw new Error('已停止回复。已有安排可在卡片中继续处理。');
  if(!done||!answer.trim())throw new Error('回复传输未完成，请重试；已有安排不会自动执行。');
  return answer;
 }catch(error){if(combined.aborted)throw new Error('已停止回复或授权已变化。已有安排可在卡片中处理。');throw error;}
 finally{agentState.busy=false;agentState.phase='';}
}
export async function confirmAgentAction(action:AgentAction,overrides?:{at?:string;remindAt?:string}){
 if(companion.locked)throw new Error('请先解锁应用。');
 if(agentState.updating)throw new Error('请等待当前操作完成。');agentState.updating=action.id;
 try{
  let localMemorySaved=false;
  if(action.tool==='remember_preference'){
   await syncAgentPrivacy();
   if(!companion.data.preferences.memoryEnabled)throw new Error('请先开启长期记忆。');
   await persistConfirmedMemory(action);
   localMemorySaved=true;
  }
  const result=await json('/actions/'+encodeURIComponent(action.id)+'/confirm','POST',{overrides,localMemorySaved});applySnapshot(result.snapshot);
 }finally{agentState.updating='';}
}
export async function rejectAgentAction(id:string){
 if(companion.locked)throw new Error('请先解锁应用。');
 agentState.updating=id;try{applySnapshot(await json('/actions/'+encodeURIComponent(id)+'/reject','POST',{}));}finally{agentState.updating='';}
}
const pendingCommands=new Map<string,string>();
export async function agentManual(tool:string,args:Record<string,unknown>){
 if(companion.locked)throw new Error('请先解锁应用。');
 if(agentState.updating)throw new Error('请等待当前操作完成。');
 const key=tool+':'+JSON.stringify(args),commandId=pendingCommands.get(key)||crypto.randomUUID();pendingCommands.set(key,commandId);agentState.updating=commandId;
 try{const value=await json('/manual','POST',{commandId,tool,args});applySnapshot(value.snapshot);pendingCommands.delete(key);return value;}
 finally{agentState.updating='';}
}
export async function deleteAgentItem(id:string){if(companion.locked)throw new Error('请先解锁应用。');agentState.updating=id;try{applySnapshot(await json('/items/'+encodeURIComponent(id),'DELETE'));}finally{agentState.updating='';}}
export function invalidateAgentContext(){runController?.abort();}
export async function forgetAgentMemory(id:string){if(isUsed()){runController?.abort();await json('/memories/'+encodeURIComponent(id),'DELETE');}}
export async function forgetAgentConversation(source:Source){if(isUsed())applySnapshot(await json('/forget-conversation','POST',source));}
export async function clearAgentData(){
 if(!isUsed())return;runController?.abort();agentState.updating='clear';
 try{await connecting?.catch(()=>{});await policyQueue.catch(()=>{});await json('/data','DELETE');agentState.items=[];agentState.actions=[];agentState.loaded=false;agentState.serverTime=0;sentPolicy='';localStorage.removeItem(usedKey);pendingCommands.clear();}
 finally{agentState.updating='';}
}
export function localDateInput(value:string|number){
 const d=new Date(value),pad=(n:number)=>String(n).padStart(2,'0');if(!Number.isFinite(d.getTime()))return '';
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}
export const actionLabels:Record<string,string>={remember_preference:'珍藏一条记忆',create_goal:'一个小目标',update_goal:'调整小目标',manage_focus:'专注计时',manage_reminder:'提醒安排'};
export const itemStatus:Record<string,string>={active:'进行中',completed:'已完成',cancelled:'已取消',scheduled:'等待提醒',running:'计时中',due:'已到时间',done:'已完成'};
