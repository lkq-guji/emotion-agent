import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

export class AgentError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
function text(value,name,max=120){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new AgentError(name+'需要填写 1–'+max+' 字。');return value.trim();}
function identifier(value){return text(value,'记录编号',128);}
function minutes(value){if(!Number.isInteger(value)||value<1||value>180)throw new AgentError('专注时间请选择 1–180 分钟。');return value;}
function at(value,now){
  const parts=typeof value==='string'&&value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/);
  if(!parts)throw new AgentError('提醒时间需要包含具体时刻和时区，请先确定时间。');
  const [year,month,day,hour,minute,second]=parts.slice(1,7).map(v=>Number(v||0));
  if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59)throw new AgentError('提醒日期或时刻不存在，请重新选择。');
  const time=Date.parse(value);if(!Number.isFinite(time)||time<=now||time>now+366*86400000)throw new AgentError('提醒时间需在未来一年内；时间已过可以先改期。');return time;
}
export function validateAction(tool,input,now=Date.now()){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AgentError('操作参数应为对象。');
  const x=input;
  if(tool==='remember_preference'){
    const category=x.category||'interest';if(!['daily','interest','goal','important'].includes(category))throw new AgentError('记忆分类不正确。');
    return {text:text(x.text,'记忆内容',2000),category};
  }
  if(tool==='create_goal'){
    const steps=x.steps??[];if(!Array.isArray(steps)||steps.length>5)throw new AgentError('计划最多包含五个小步骤。');
    return {title:text(x.title,'目标'),steps:steps.map(s=>text(s,'步骤')), ...(x.focusMinutes!=null?{focusMinutes:minutes(x.focusMinutes)}:{}),...(x.remindAt?{remindAt:new Date(at(x.remindAt,now)).toISOString()}:{})};
  }
  if(tool==='update_goal'){
    if(x.status!==undefined&&!['active','completed','cancelled'].includes(x.status))throw new AgentError('目标状态不正确。');
    if(!x.status&&!x.title)throw new AgentError('请指定目标的新名称或状态。');
    return {id:identifier(x.id),...(x.status?{status:x.status}:{}),...(x.title?{title:text(x.title,'目标')}: {})};
  }
  if(tool==='manage_focus'){
    if(!['start','complete','cancel'].includes(x.operation))throw new AgentError('计时操作不正确。');
    return x.operation==='start'?{operation:'start',title:text(x.title,'专注内容'),minutes:minutes(x.minutes),...(x.goalId?{goalId:identifier(x.goalId)}:{})}:{operation:x.operation,id:identifier(x.id)};
  }
  if(tool==='manage_reminder'){
    if(!['create','reschedule','complete','cancel'].includes(x.operation))throw new AgentError('提醒操作不正确。');
    if(x.operation==='create')return {operation:'create',title:text(x.title,'提醒内容'),at:new Date(at(x.at,now)).toISOString(),...(x.goalId?{goalId:identifier(x.goalId)}:{})};
    return {operation:x.operation,id:identifier(x.id),...(x.operation==='reschedule'?{at:new Date(at(x.at,now)).toISOString()}: {})};
  }
  throw new AgentError('这个操作不在小屿的工具范围内。');
}
const digest=value=>createHash('sha256').update(value).digest('hex');
const parse=row=>row?{...row,args:row.args?JSON.parse(row.args):undefined,details:row.details?JSON.parse(row.details):undefined}:null;
export function createAgentStore(filename,now=Date.now){
  if(filename!==':memory:')mkdirSync(dirname(resolve(filename)),{recursive:true});
  const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  if(filename!==':memory:')db.exec('PRAGMA journal_mode=WAL;');
  db.exec([
    'CREATE TABLE IF NOT EXISTS spaces(id TEXT PRIMARY KEY, memory_enabled INTEGER NOT NULL DEFAULT 0, profile_enabled INTEGER NOT NULL DEFAULT 0, policy_version INTEGER NOT NULL DEFAULT 0, imported INTEGER NOT NULL DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, turn_id TEXT NOT NULL, character_id TEXT NOT NULL, conversation_id TEXT NOT NULL, status TEXT NOT NULL, answer TEXT NOT NULL DEFAULT \'\', tokens INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(space,turn_id))',
    'CREATE TABLE IF NOT EXISTS actions(id TEXT PRIMARY KEY, space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, run_id TEXT REFERENCES runs(id) ON DELETE CASCADE, tool TEXT NOT NULL, args TEXT NOT NULL, status TEXT NOT NULL, result TEXT NOT NULL DEFAULT \'\', created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, kind TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, details TEXT NOT NULL DEFAULT \'{}\', due_at INTEGER, goal_id TEXT REFERENCES items(id) ON DELETE CASCADE, source_run TEXT REFERENCES runs(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS items_due ON items(status,due_at)',
    'CREATE INDEX IF NOT EXISTS items_space ON items(space,kind,status)',
    'CREATE INDEX IF NOT EXISTS actions_space ON actions(space,status)',
    'CREATE INDEX IF NOT EXISTS runs_source ON runs(space,character_id,conversation_id)',
    'UPDATE runs SET status=\'interrupted\' WHERE status=\'running\''
  ].join(';'));
  function transaction(action){db.exec('BEGIN IMMEDIATE');try{const result=action();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
  function space(id){db.prepare('INSERT OR IGNORE INTO spaces(id) VALUES(?)').run(id);return db.prepare('SELECT * FROM spaces WHERE id=?').get(id);}
  function policy(id){const s=space(id);return {memoryEnabled:!!s.memory_enabled,profileEnabled:!!s.profile_enabled,version:s.policy_version};}
  function setPolicy(id,input){
    if(typeof input?.memoryEnabled!=='boolean'||typeof input?.profileEnabled!=='boolean')throw new AgentError('授权设置格式不正确。');
    const before=policy(id),changed=before.memoryEnabled!==input.memoryEnabled||before.profileEnabled!==input.profileEnabled;
    if(changed)transaction(()=>{
      db.prepare('UPDATE spaces SET memory_enabled=?,profile_enabled=?,policy_version=policy_version+1 WHERE id=?').run(Number(input.memoryEnabled),Number(input.profileEnabled),id);
      if(!input.memoryEnabled)db.prepare('UPDATE actions SET status=\'rejected\',args=\'{}\',result=\'记忆授权已关闭\' WHERE space=? AND tool=\'remember_preference\' AND status=\'pending\'').run(id);
    });
    return {...policy(id),changed};
  }
  function tick(){
    const time=now();
    db.prepare('UPDATE items SET status=\'due\',updated_at=? WHERE kind IN (\'reminder\',\'focus\') AND status IN (\'scheduled\',\'running\') AND due_at<=?').run(time,time);
    db.prepare('UPDATE actions SET status=\'expired\',args=\'{}\',result=\'确认已过期，请重新安排\' WHERE status=\'pending\' AND expires_at<=?').run(time);
  }
  function snapshot(id){
    space(id);tick();
    // shortcut: first version returns 200 recent items; add pagination when personal task history grows.
    return {items:db.prepare('SELECT * FROM items WHERE space=? ORDER BY CASE WHEN status=\'due\' THEN 0 WHEN status IN (\'active\',\'scheduled\',\'running\') THEN 1 ELSE 2 END,created_at DESC,id LIMIT 200').all(id).map(parse),
      actions:db.prepare('SELECT actions.*,runs.character_id,runs.conversation_id,runs.turn_id AS message_id FROM actions LEFT JOIN runs ON actions.run_id=runs.id WHERE actions.space=? ORDER BY CASE WHEN actions.status=\'pending\' THEN 0 ELSE 1 END,actions.created_at DESC,actions.id LIMIT 80').all(id).map(parse),
      imported:!!space(id).imported,serverTime:now()};
  }
  function importGoals(id,goals){
    if(!Array.isArray(goals)||goals.length>1000)throw new AgentError('旧目标数据格式不正确。');
    if(space(id).imported)return snapshot(id);
    const valid=goals.map(g=>{if(g.status!==undefined&&!['active','completed','cancelled'].includes(g.status))throw new AgentError('旧目标状态不正确。');return {id:identifier(g.id),title:text(g.text,'旧目标'),at:Number.isFinite(g.at)?g.at:now(),completedAt:Number.isFinite(g.completedAt)?g.completedAt:undefined,status:g.status};});
    transaction(()=>{for(const g of valid)db.prepare('INSERT OR IGNORE INTO items(id,space,kind,title,status,details,created_at,updated_at) VALUES(?,?,\'goal\',?,?,?, ?,?)').run(digest(id+':legacy:'+g.id),id,g.title,g.status||(g.completedAt?'completed':'active'),JSON.stringify({steps:[],legacyId:g.id,...(g.completedAt?{completedAt:g.completedAt}:{})}),g.at,g.completedAt||g.at);db.prepare('UPDATE spaces SET imported=1 WHERE id=?').run(id);});
    return snapshot(id);
  }
  function run(id,turnId,source){
    space(id);let row=db.prepare('SELECT * FROM runs WHERE space=? AND turn_id=?').get(id,turnId);
    if(row?.status==='running')throw new AgentError('这条消息正在处理中，请等待或停止。',409);
    if(row&&(row.character_id!==source.characterId||row.conversation_id!==source.conversationId))throw new AgentError('消息来源不一致。',409);
    if(!row){const time=now();db.prepare('INSERT INTO runs(id,space,turn_id,character_id,conversation_id,status,created_at,updated_at) VALUES(?,?,?,?,?,\'running\',?,?)').run(randomUUID(),id,turnId,source.characterId,source.conversationId,time,time);row=db.prepare('SELECT * FROM runs WHERE space=? AND turn_id=?').get(id,turnId);}
    else if(row.status!=='completed')db.prepare('UPDATE runs SET status=\'running\',updated_at=? WHERE id=?').run(now(),row.id);
    return row;
  }
  function finishRun(id,status,answer='',tokens=0){db.prepare('UPDATE runs SET status=?,answer=?,tokens=?,updated_at=? WHERE id=?').run(status,answer,tokens,now(),id);}
  function getAction(id,scope){
    const row=parse(db.prepare('SELECT * FROM actions WHERE id=? AND space=?').get(id,scope));if(!row)throw new AgentError('这项操作已不存在。',404);return row;
  }
  function propose(scope,runId,tool,input,commandId){
    space(scope);
    const args=validateAction(tool,input,now());
    if(tool==='remember_preference'&&!policy(scope).memoryEnabled)throw new AgentError('请先开启长期记忆，保存时仍需逐条确认。');
    const id=commandId?digest(scope+':manual:'+commandId):digest(scope+':'+runId+':'+tool+':'+JSON.stringify(args));
    const existing=db.prepare('SELECT * FROM actions WHERE id=? AND space=?').get(id,scope);if(existing)return parse(existing);
    if(db.prepare('SELECT COUNT(*) n FROM actions WHERE space=? AND status=\'pending\'').get(scope).n>=40)throw new AgentError('待确认安排较多，请先处理已有卡片。',429);
    db.prepare('INSERT INTO actions(id,space,run_id,tool,args,status,created_at,expires_at) VALUES(?,?,?,?,?,\'pending\',?,?)').run(id,scope,runId,tool,JSON.stringify(args),now(),now()+86400000);
    return getAction(id,scope);
  }
  function item(scope,id,kind){
    const row=parse(db.prepare('SELECT * FROM items WHERE id=? AND space=?').get(id,scope));
    if(!row||row.kind!==kind)throw new AgentError('这项'+(kind==='goal'?'目标':kind==='focus'?'计时':'提醒')+'已不存在。',404);return row;
  }
  function addItem(scope,kind,title,status,details,due,goalId,runId,entityId=randomUUID()){
    if(goalId){const g=item(scope,goalId,'goal');if(g.status!=='active')throw new AgentError('这个目标已结束，请先恢复目标。');}
    db.prepare('INSERT INTO items(id,space,kind,title,status,details,due_at,goal_id,source_run,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(entityId,scope,kind,title,status,JSON.stringify(details),due??null,goalId??null,runId??null,now(),now());return entityId;
  }
  function startFocus(scope,args,runId,goalId){
    if(db.prepare('SELECT id FROM items WHERE space=? AND kind=\'focus\' AND status=\'running\'').get(scope))throw new AgentError('已有专注计时在进行，请先结束或取消。',409);
    return addItem(scope,'focus',args.title,'running',{minutes:args.minutes,startedAt:now()},now()+args.minutes*60000,goalId||args.goalId,runId);
  }
  function confirm(scope,id,{overrides,localMemorySaved}={}){
    tick();const old=getAction(id,scope);if(old.status==='executed')return {action:old,snapshot:snapshot(scope)};
    if(old.status!=='pending')throw new AgentError('这项操作已经结束，请重新安排。',409);
    if(overrides&&Object.keys(overrides).some(k=>!['remindAt','at'].includes(k)))throw new AgentError('只能在确认时调整提醒时间。');
    const args=validateAction(old.tool,{...old.args,...overrides},now());
    if(old.tool==='remember_preference'&&(!policy(scope).memoryEnabled||localMemorySaved!==true))throw new AgentError('请先在本机确认保存这条记忆。');
    transaction(()=>{
      if(old.tool==='create_goal'){
        const goalId=addItem(scope,'goal',args.title,'active',{steps:args.steps},null,null,old.run_id);
        if(args.remindAt)addItem(scope,'reminder',args.title,'scheduled',{},Date.parse(args.remindAt),goalId,old.run_id);
        if(args.focusMinutes)startFocus(scope,{title:args.title,minutes:args.focusMinutes},old.run_id,goalId);
      }else if(old.tool==='update_goal'){
        const current=item(scope,args.id,'goal'),details={...current.details};
        if(args.status==='completed')details.completedAt=current.status==='completed'?(details.completedAt||current.updated_at):now();
        else if(args.status)delete details.completedAt;
        db.prepare('UPDATE items SET title=COALESCE(?,title),status=COALESCE(?,status),details=?,updated_at=? WHERE id=? AND space=?').run(args.title??null,args.status??null,JSON.stringify(details),now(),args.id,scope);
        if(['completed','cancelled'].includes(args.status))db.prepare('UPDATE items SET status=\'cancelled\',updated_at=? WHERE space=? AND goal_id=? AND status IN (\'scheduled\',\'running\',\'due\')').run(now(),scope,args.id);
      }else if(old.tool==='manage_focus'){
        if(args.operation==='start')startFocus(scope,args,old.run_id);
        else {const f=item(scope,args.id,'focus');if(!['running','due'].includes(f.status))throw new AgentError('这段计时已经结束。',409);db.prepare('UPDATE items SET status=?,updated_at=? WHERE id=?').run(args.operation==='complete'?'done':'cancelled',now(),f.id);}
      }else if(old.tool==='manage_reminder'){
        if(args.operation==='create')addItem(scope,'reminder',args.title,'scheduled',{},Date.parse(args.at),args.goalId,old.run_id);
        else {const r=item(scope,args.id,'reminder');db.prepare('UPDATE items SET status=?,due_at=COALESCE(?,due_at),updated_at=? WHERE id=?').run({reschedule:'scheduled',complete:'done',cancel:'cancelled'}[args.operation],args.at?Date.parse(args.at):null,now(),r.id);}
      }
      db.prepare('UPDATE actions SET status=\'executed\',args=\'{}\',result=? WHERE id=?').run(old.tool==='remember_preference'?'已保存到本机记忆':'已执行，任务状态已保存',id);
    });
    return {action:getAction(id,scope),snapshot:snapshot(scope)};
  }
  function reject(scope,id){const a=getAction(id,scope);if(a.status==='executed')throw new AgentError('操作已执行，可以在任务列表修改或取消。',409);if(a.status==='pending')db.prepare('UPDATE actions SET status=\'rejected\',args=\'{}\',result=\'你已取消这项安排\' WHERE id=?').run(id);return snapshot(scope);}
  function manual(scope,commandId,tool,args){
    if(tool==='remember_preference')throw new AgentError('记忆应在浏览器逐条确认。');
    const existing=db.prepare('SELECT * FROM actions WHERE id=? AND space=?').get(digest(scope+':manual:'+commandId),scope);
    if(existing){if(existing.tool!==tool)throw new AgentError('这个操作编号已用于其他安排。',409);return confirm(scope,existing.id);}
    // A manual form click is the user's explicit action; model-created proposals never call this route.
    const a=propose(scope,null,tool,args,commandId);return confirm(scope,a.id);
  }
  function removeItem(scope,id){
    const row=db.prepare('SELECT * FROM items WHERE space=? AND id=?').get(scope,id);if(!row)return snapshot(scope);
    db.prepare('DELETE FROM items WHERE space=? AND id=?').run(scope,id);return snapshot(scope);
  }
  function removeConversation(scope,source){db.prepare('DELETE FROM runs WHERE space=? AND character_id=? AND conversation_id=?').run(scope,source.characterId,source.conversationId);return snapshot(scope);}
  function forgetMemory(scope,id){db.prepare('DELETE FROM actions WHERE space=? AND id=? AND tool=\'remember_preference\'').run(scope,id);}
  function clear(scope){db.prepare('DELETE FROM spaces WHERE id=?').run(scope);}
  return {space,policy,setPolicy,tick,snapshot,importGoals,run,finishRun,propose,confirm,reject,manual,removeItem,removeConversation,forgetMemory,clear,getAction,close:()=>db.close()};
}
