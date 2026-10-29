import { get } from 'svelte/store';
import {clearSceneMedia} from './sceneLibrary';
import { tick } from 'svelte';
import { DBState, selectedCharID, alertStore } from '../ts/stores.svelte';
import { createBlankChar, changeChar } from '../ts/characters';
import { getDatabase, setPreset, setDatabase, type Chat, type character, type Database } from '../ts/storage/database.svelte';
import { prebuiltPresets } from '../ts/process/templates/templates';
import { sendChat, doingChat } from '../ts/process/index.svelte';
import { requestChatData } from '../ts/process/request/request';
import { checkCharOrder, downloadFile, forageStorage, requiresFullEncoderReload,withPausedDatabaseWrites } from '../ts/globalApi.svelte';
import { saveKV } from '../ts/storage/saveKV';
import { LLMFormat, LLMTokenizer, LLMFlags } from '../ts/model/modellist';
import { processScriptFull } from '../ts/process/scripts';
import { companion, updateData, notify } from './state.svelte';
import { changeLanguage } from '../lang';
import { clearDerivedSaveCaches,clearAllOriginStores } from './storagePrivacy';
import { addEmotion, removeConversationSources, type Emotion, type Source, emotions,visibleReply } from './domain';
import {activeFacts} from './companionship';

export const chatState = $state({ busy: false, analyzing: false, error: '', gatewayReady: false, gatewayModel: '', failedMessageId: '', lastSaved: '' });
let controller: AbortController;
export function currentCharacter() { return DBState.db.characters[get(selectedCharID)]; }
export function currentChat(): Chat | undefined { const char = currentCharacter(); return char?.chats[char.chatPage]; }
function blankChat(name='新的心事'): Chat { return { id:crypto.randomUUID(),name,message:[],note:'',localLore:[],fmIndex:-1,lastDate:Date.now() }; }
export async function prepareCompanion() {
  if (!DBState.db.didFirstSetup) {
    DBState.db = setPreset(DBState.db, prebuiltPresets.OAI2);
    DBState.db.mainPrompt = '你是一个温柔、真诚的中文情感陪伴助手。倾听用户，承接上下文，避免机械建议清单。不虚构经历，不作医疗诊断。';
    DBState.db.jailbreakToggle = false;
    DBState.db.promptTemplate = [
      {type:'plain',type2:'main',role:'system',text:DBState.db.mainPrompt},
      {type:'description'},{type:'persona'},{type:'lorebook'},{type:'memory'},
      {type:'chat',rangeStart:0,rangeEnd:'end'},{type:'authornote',defaultText:''},{type:'postEverything'},
    ];
    DBState.db.language = 'cn'; changeLanguage('cn'); DBState.db.username = '你'; DBState.db.didFirstSetup = true;
  }
  if (!DBState.db.characters.length) {
    const char = createBlankChar(); char.name = '小屿';
    char.desc = '你是心屿智伴的小屿，使用自然中文温柔陪伴用户。先理解再回应，不把临时情绪当成稳定人格。';
    char.firstMessage = '你好，我是小屿。今天有什么想和我分享的吗？';
    char.chats = [blankChat('和小屿的第一段对话')];
    DBState.db.characters.push(char); checkCharOrder();
  }
  await tick();
  if (get(selectedCharID) < 0) await selectCharacter(0);
  await refreshGateway();
  if(chatState.gatewayReady&&companion.data.preferences.gatewaySetupVersion!==1){await connectGateway(false);updateData(data=>data.preferences.gatewaySetupVersion=1);}
}
export async function selectCharacter(index: number) {
  if (chatState.busy || get(doingChat)) return;
  await changeChar(index);
  const chat = currentChat(); if (chat) { chat.id ??= crypto.randomUUID(); chat.fmIndex ??= -1; }
  chatState.error = ''; syncPersonalLore();
}
export function newConversation() {
  if (chatState.busy) return;
  const char = currentCharacter(); if (!char) throw new Error('请先选择角色。');
  char.chats.unshift(blankChat()); char.chatPage = 0; chatState.error = ''; chatState.failedMessageId = '';
}
export async function selectConversation(index: number) {
  if (chatState.busy) return;
  const char = currentCharacter(); char.chatPage = index; currentChat().id ??= crypto.randomUUID(); currentChat().fmIndex ??= -1;
  chatState.error = ''; chatState.failedMessageId = '';
}
export async function deleteConversation(index: number) {
  if (chatState.busy) throw new Error('请先停止当前回复。');
  if (forageStorage.isAccount) throw new Error('云同步已开启，请先管理云端副本，再删除来源对话。');
  const char = currentCharacter(); const chat = char?.chats[index]; if (!chat) return;
  await pruneBackups(()=>{
    updateData(data=>removeConversationSources(data,char.chaId,chat.id));
    char.chats.splice(index,1); if (!char.chats.length) char.chats.push(blankChat());
    char.chatPage = Math.min(char.chatPage,char.chats.length-1);
    syncPersonalLore();
  });
  notify('对话及其关联记录已删除，本机历史备份已清理。');
}
export function sourceOf(messageId?: string): Source {
  return { characterId:currentCharacter().chaId,conversationId:currentChat().id,messageId };
}
export function syncPersonalLore() {
  for (const char of DBState.db.characters) {
    char.globalLore = (char.globalLore ?? []).filter(item=>!item.id?.startsWith('xinyu-'));
    if (companion.data.preferences.memoryEnabled) for (const memory of companion.data.memories) {
      if (memory.source?.characterId && memory.source.characterId !== char.chaId) continue;
      char.globalLore.push({ id:'xinyu-memory-'+memory.id,key:'',secondkey:'',comment:'用户同意保存的心屿记忆',content:memory.text,mode:'constant',alwaysActive:true,selective:false,insertorder:100 });
    }
    if (companion.data.preferences.profileEnabled) {
      const facts = activeFacts(companion.data,char.chaId);
      if (facts.length) char.globalLore.push({ id:'xinyu-profile',key:'',secondkey:'',comment:'用户确认的偏好',content:facts.map(f=>`${f.label}：${f.value}`).join('\n'),mode:'constant',alwaysActive:true,selective:false,insertorder:90 });
    }
  }
}
export async function sendMessage(text: string, retry=false) {
  if (chatState.busy || get(doingChat)) return;
  if (companion.locked) throw new Error('请先解锁。');
  const char = currentCharacter(); const chat = currentChat();
  if (!char || !chat) throw new Error('请先选择会话。');
  if (!retry && (!text.trim() || text.length>12000)) throw new Error('请输入 1–12000 字的消息。');
  chatState.busy = true; chatState.error = ''; controller = new AbortController();
  try {
    if (!retry) {
      const input = await processScriptFull(char,text.trim(),'editinput');
      const message = { role:'user' as const,data:input.data,time:Date.now(),chatId:crypto.randomUUID() };
      chat.message.push(message); chatState.failedMessageId = message.chatId;
      if (chat.name === '新的心事') chat.name = text.trim().slice(0,22);
    } else {
      const target = chat.message.findIndex(m=>m.chatId===chatState.failedMessageId);
      if (target < 0 || chat.message[target].role !== 'user' || chat.message.slice(target+1).some(m=>m.role==='user')) throw new Error('这条消息已不在末尾，请发送新消息。');
      chat.message.splice(target+1);
    }
    chat.lastDate = Date.now(); chat.fmIndex ??= -1; syncPersonalLore();
    const before = chat.message.length;
    const sent = await sendChat(-1,{ signal:controller.signal });
    if (!sent || currentChat().message.length <= before) {
      const alert = get(alertStore); alertStore.set({type:'none',msg:''});
      throw new Error(controller.signal.aborted ? '已停止回复。你可以重试这条消息。' : (alert.msg && alert.msg !== 'n' ? alert.msg : '模型没有返回回复，请检查模型配置后重试。'));
    }
    chatState.failedMessageId = '';
    if (companion.data.preferences.analysisEnabled) void analyzeChat();
  } catch(error) { chatState.error = String(error).replace(/^Error: /,''); }
  finally { chatState.busy = false; doingChat.set(false); if(currentChat())currentChat().isStreaming=false; }
}
export function stopMessage() { controller?.abort(); }
export async function analyzeChat() {
  const chat = currentChat();
  const latestUser = chat?.message.filter(m=>m.role==='user').at(-1);
  if (!companion.data.preferences.analysisEnabled || chatState.analyzing || !latestUser) return;
  chatState.analyzing = true;
  const capturedSource = sourceOf(latestUser.chatId);
  const snapshot = chat.message.slice(-8).map(m=>({role:m.role==='user'?'user':'assistant',content:(m.role==='char'?visibleReply(m.data):m.data).slice(0,2000)}));
  try {
    const response = await requestChatData({ bias:{},maxTokens:500,temperature:0,useStreaming:false,noMultiGen:true,tools:[],
      formated:[{role:'system',content:`只输出 JSON：{"emotion_label":"英文情绪标签","profile":[{"label":"兴趣或交流偏好","value":"有明确证据的短语"}]}。情绪只从 ${Object.keys(emotions).join(',')} 中选一个，针对最新用户消息。画像至多3项，没有证据则[]。禁止诊断。`},...snapshot] as never },'model');
    if (response.type !== 'success') throw new Error('模型未返回可解析的分析。');
    const parsed = JSON.parse(response.result.replace(/^```(?:json)?\s*|\s*```$/g,''));
    if (!parsed || !Object.hasOwn(emotions,parsed.emotion_label)) throw new Error('模型返回的情绪标签不合法。');
    // 用户可能在请求进行中撤回授权，落盘前再次检查。
    if (!companion.data.preferences.analysisEnabled || companion.locked) return;
    const sourceChat = DBState.db.characters.find(c=>c.chaId===capturedSource.characterId)?.chats.find(c=>c.id===capturedSource.conversationId);
    if (!sourceChat || !sourceChat.message.some(m=>m.chatId===capturedSource.messageId)) return;
    updateData(data=>{
      addEmotion(data,parsed.emotion_label as Emotion,'来自对话分析，可手动更正',capturedSource,'model');
      if (data.preferences.profileEnabled && Array.isArray(parsed.profile)) for (const fact of parsed.profile.slice(0,3)) {
        if (typeof fact.label==='string' && typeof fact.value==='string' && !data.facts.some(f=>f.value===fact.value)) data.facts.push({id:crypto.randomUUID(),label:fact.label.slice(0,40),value:fact.value.slice(0,200),origin:'model_inferred',confirmed:false,at:Date.now(),source:capturedSource});
      }
    });
  } catch { notify('对话已保留；本次情绪分析未完成，可稍后重试。'); }
  finally { chatState.analyzing = false; }
}
export async function refreshGateway() {
  try { const response = await fetch('/xinyu-api/health'); if(!response.ok) throw new Error(); const data = await response.json(); chatState.gatewayReady = data.configured===true; chatState.gatewayModel = data.model ?? ''; }
  catch { chatState.gatewayReady = false; }
}
export async function connectGateway(showNotice=true) {
  await refreshGateway(); if (!chatState.gatewayReady) throw new Error('本机网关未配置密钥，请按运行说明设置服务端环境变量。');
  const id = 'xcustom:::xinyu-local';
  DBState.db.customModels = DBState.db.customModels.filter(m=>m.id!==id);
  DBState.db.customModels.push({ id,internalId:chatState.gatewayModel,url:location.origin+'/xinyu-api/chat/completions',format:LLMFormat.OpenAICompatible,tokenizer:LLMTokenizer.Unknown,key:'',name:'心屿 · '+chatState.gatewayModel,params:'',flags:[LLMFlags.hasFullSystemPrompt,LLMFlags.hasStreaming] });
  DBState.db.aiModel = id; if(showNotice)notify('已切换到本机网关，密钥只保留在服务端。');
}
export async function pruneBackups(action:()=>void=()=>{}) {
  if (forageStorage.isAccount) throw new Error('云同步已开启，请先在账号同步服务中关闭同步并管理云端备份，不能只删除本地副本。');
  await withPausedDatabaseWrites(async()=>{
    const keys = await forageStorage.keys();
    await Promise.all(keys.filter(k=>k.startsWith('database/dbbackup-')).map(k=>forageStorage.removeItem(k)));
    await clearDerivedSaveCaches();
    action(); requiresFullEncoderReload.state = true;
  });
}
export async function exportPersonalData() {
  if (companion.locked) throw new Error('请先解锁。');
  const conversations = DBState.db.characters.map(char=>({id:char.chaId,name:char.name,chats:char.chats.map(chat=>({id:chat.id,name:chat.name,messages:chat.message.map(m=>({id:m.chatId,role:m.role,text:m.role==='char'?visibleReply(m.data):m.data,at:m.time}))}))}));
  const data = structuredClone($state.snapshot(companion.data)); delete data.lock;
  await downloadFile(`心屿智伴-个人记录-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:1,exportedAt:new Date().toISOString(),data,conversations},null,2));
}
export async function clearAllLocalData() {
  if (forageStorage.isAccount) throw new Error('请先关闭云同步，再清除本机数据。云端副本需在对应服务中删除。');
  stopMessage();
  await withPausedDatabaseWrites(async()=>{
    await clearSceneMedia();
    setDatabase({} as Database); saveKV.load({}); requiresFullEncoderReload.state = true;
    for (const key of await forageStorage.keys()) await forageStorage.removeItem(key);
    await clearAllOriginStores();
    localStorage.clear(); sessionStorage.clear();
    await fetch('/xinyu-api/logout',{method:'POST'}).catch(()=>{});
    history.replaceState(null,'',location.pathname + location.search + '#/');
    location.reload();
  });
}
