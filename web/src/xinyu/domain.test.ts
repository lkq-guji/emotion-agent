import { describe,it,expect } from 'vitest';
import { freshData,hydrateData,addEmotion,addMemory,removeConversationSources,growthFrom,isLocalGateway,cleanText,visibleReply } from './domain';
import { SaveKVStore } from '../ts/storage/saveKV';
describe('心屿实际数据与授权',()=>{
  it('新账号没有模拟业务数据，授权默认关闭',()=>{const d=freshData();expect(d.emotions).toEqual([]);expect(d.memories).toEqual([]);expect(d.facts).toEqual([]);expect(d.preferences.memoryEnabled).toBe(false);expect(d.preferences.profileEnabled).toBe(false);expect(d.preferences.analysisEnabled).toBe(false);});
  it('记忆同时要求模块授权与逐条同意',()=>{const d=freshData();expect(()=>addMemory(d,'隐私测试','daily',true)).toThrow();d.preferences.memoryEnabled=true;expect(()=>addMemory(d,'隐私测试','daily',false)).toThrow();addMemory(d,'用户同意的内容','daily',true);expect(d.memories).toHaveLength(1);});
  it('禁止非法情绪和未经授权的模型分析记录',()=>{const d=freshData();for(const label of ['fake','__proto__','constructor','toString'])expect(()=>addEmotion(d,label as never)).toThrow();expect(()=>addEmotion(d,'joy','',undefined,'model')).toThrow();addEmotion(d,'joy','手动记录');expect(d.emotions[0].confirmed).toBe(true);});
  it('删除来源只清理对应对话，保留其他记录',()=>{const d=freshData();d.preferences.memoryEnabled=true;const source={characterId:'char-a',conversationId:'chat-a'};addMemory(d,'来自A','daily',true,source);addMemory(d,'来自B','daily',true,{...source,conversationId:'chat-b'});addEmotion(d,'joy','',source);d.facts.push({id:'f',label:'兴趣',value:'阅读',origin:'model_inferred',confirmed:false,at:1,source});removeConversationSources(d,'char-a','chat-a');expect(d.memories.map(m=>m.text)).toEqual(['来自B']);expect(d.emotions).toHaveLength(0);expect(d.facts).toHaveLength(0);});
  it('成长天数按不同日期推导，没有活动就为零',()=>{const d=freshData();expect(growthFrom(d,[]).days).toBe(0);const date=new Date(2026,9,25,12).getTime();expect(growthFrom(d,[date,date+1000,date-86400000]).days).toBe(2);});
  it('扩展块能通过原生 SaveKV 序列化，不改既有命名空间',()=>{const original=new SaveKVStore();original.set('other-plugin','unknown',{preserve:true});const d=freshData();d.preferences.name='测试称呼';original.set('xinyu.companion.v1','data',d);const reloaded=new SaveKVStore();reloaded.load(Object.fromEntries(original.namespaces().map(ns=>[ns,JSON.parse(original.encodeNamespace(ns))])));expect(reloaded.get('other-plugin','unknown')).toEqual({preserve:true});expect(hydrateData(reloaded.get('xinyu.companion.v1','data')).preferences.name).toBe('测试称呼');});
  it('无法识别的数据版本报错而不清空原记录',()=>{const input={version:99,records:['keep']};expect(()=>hydrateData(input)).toThrow();expect(input.records).toEqual(['keep']);});
  it('空白和超长内容不写入',()=>{expect(()=>cleanText('  ')).toThrow();expect(()=>cleanText('12345',4)).toThrow();expect(cleanText(' 你好 ')).toBe('你好');});
  it('展示层隐藏思考与未闭合的流式思考，不修改原字符串',()=>{const raw='<Thoughts>内部文本</Thoughts> 给用户的回复';expect(visibleReply(raw)).toBe('给用户的回复');expect(visibleReply('<think>还没结束')).toBe('');expect(raw).toContain('内部文本');});
});
describe('原 Risu 网络策略的窄范围扩展',()=>{
  const origin='http://127.0.0.1:5178';
  it('仅接受同源的固定网关地址',()=>{expect(isLocalGateway(origin+'/xinyu-api/chat/completions',origin)).toBe(true);for(const url of ['http://127.0.0.1:9999/xinyu-api/chat/completions',origin+'/proxy',origin+'/xinyu-api/chat/completions?url=http://internal','http://attacker.example/xinyu-api/chat/completions','not a url'])expect(isLocalGateway(url,origin)).toBe(false);});
});
