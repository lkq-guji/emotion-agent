import { test,expect } from '@playwright/test';
const errors=new WeakMap<object,string[]>();
test.beforeEach(async({page})=>{
  const failures:string[]=[];errors.set(page,failures);page.on('pageerror',error=>failures.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('tos4','true'));
  // Vite 热更新会为已加载模块附加时间戳；读取实际模块实例，避免另建空 store。
  await page.addInitScript(()=>Object.defineProperty(window,'__xinyuTestImport',{value:async(path:string)=>{
    const resource=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname===path);
    if(!resource)throw new Error('测试目标模块未加载：'+path);
    return import(resource.name);
  }}));
  await page.route('**/xinyu-api/health',route=>route.fulfill({json:{configured:true,model:'engineering-fixture',localOnly:true}}));
  await page.goto('/');await expect(page.locator('.island-greeting h1')).toBeVisible({timeout:90000});
});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);});
async function go(page:any,path:string){await page.evaluate(path=>location.hash=path,path);await page.waitForTimeout(200);}
async function saveWait(page:any){await page.waitForTimeout(1600);}
async function gateway(page:any){await go(page,'/settings');await page.getByRole('button',{name:'使用本机网关',exact:true}).click();await go(page,'/chat');}
test('九页、浏览器前进后退与已移除工作台路由',async({page})=>{
  for(const [id,title] of [['chat','说给小屿听'],['emotion','照顾每一种情绪'],['memories','我们的记忆星光'],['profile','慢慢认识真实的你'],['growth','一起成长的日子'],['avatar','小屿的模样'],['scenes','挑一个安心的角落'],['settings','我的小岛']]){await go(page,'/'+id);await expect(page.locator('.xy-page-heading h1')).toHaveText(title);}
  await page.goBack();await expect(page.locator('h1').first()).toHaveText('挑一个安心的角落');
  await go(page,'/risu');await expect(page.getByRole('heading',{name:'好像走到小岛的另一边了'})).toBeVisible();await page.getByRole('link',{name:'返回首页',exact:true}).click();await expect(page.locator('.island-greeting h1')).toBeVisible();
});
test('真实 Risu HTTP 请求链路、上下文与持久化（受控工程替身）',async({page})=>{
  let bodies:any[]=[];await page.route('**/xinyu-api/chat/completions',async route=>{bodies.push(route.request().postDataJSON());await route.fulfill({json:{id:'fixture',choices:[{message:{role:'assistant',content:'[工程链路测试] 请求已通过原 RisuAI 处理。'},finish_reason:'stop'}]}});});
  await gateway(page);await page.getByLabel('想对小屿说的话').fill('这是一条工程链路测试消息');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.message-row:not(.from-user)')).toContainText('[工程链路测试]',{timeout:40000});
  expect(bodies[0].messages.some(m=>m.role==='user'&&m.content.includes('工程链路测试消息'))).toBe(true);
  await page.getByLabel('想对小屿说的话').fill('请联系上一句');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.message-row:not(.from-user)')).toHaveCount(2);expect(bodies[1].messages.some(m=>m.role==='assistant'&&m.content.includes('[工程链路测试]'))).toBe(true);
  await saveWait(page);await page.reload();await expect(page.locator('.message-row')).toHaveCount(4);
});
test('请求失败保留用户消息，明确报错，可重试且不复制用户消息',async({page})=>{
  let requestCount=0;await page.route('**/xinyu-api/chat/completions',route=>{requestCount++;return requestCount<4?route.fulfill({status:503,json:{error:{message:'engineering unavailable'}}}):route.fulfill({json:{choices:[{message:{role:'assistant',content:'[工程重试测试] 成功'},finish_reason:'stop'}]}});});
  await gateway(page);await page.getByLabel('想对小屿说的话').fill('失败和重试的工程检查');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.chat-error')).toBeVisible({timeout:40000});await expect(page.locator('.from-user')).toHaveCount(1);
  await page.unroute('**/xinyu-api/chat/completions');await page.route('**/xinyu-api/chat/completions',route=>route.fulfill({json:{choices:[{message:{role:'assistant',content:'[工程重试测试] 成功'},finish_reason:'stop'}]}}));
  await page.getByRole('button',{name:'重试这条消息'}).click();await expect(page.locator('.message-row:not(.from-user)')).toContainText('成功');await expect(page.locator('.from-user')).toHaveCount(1);
});
test('记忆默认关闭、逐条授权、编辑删除与刷新恢复',async({page})=>{
  await go(page,'/memories');await page.getByLabel('记忆内容',{exact:true}).fill('这是一段用户主动保存的测试记忆');await expect(page.getByRole('button',{name:'保存记忆',exact:true})).toBeDisabled();await page.getByRole('button',{name:'了解并开启',exact:true}).click();await page.getByRole('button',{name:'确认开启',exact:true}).click();await expect(page.locator('.xy-dialog')).toHaveCount(0);await page.getByLabel('我同意保存这条记忆').check();await page.getByRole('button',{name:'保存记忆',exact:true}).click();await expect(page.locator('.memory-timeline')).toContainText('主动保存');await saveWait(page);await page.reload();await expect(page.locator('.memory-timeline')).toContainText('用户主动保存的测试记忆');await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('记忆内容',{exact:true}).fill('编辑后的记忆');await page.getByRole('button',{name:'保存记忆',exact:true}).click();await expect(page.locator('.memory-timeline')).toContainText('编辑后的记忆');await page.getByRole('button',{name:'删除',exact:true}).click();await page.getByRole('button',{name:'确认删除',exact:true}).click();await expect(page.locator('.memory-timeline')).toHaveCount(0);
});
test('情绪记录更正、画像和成长目标来自实际操作',async({page})=>{
  await go(page,'/emotion');await page.getByLabel('我的心情',{exact:true}).selectOption('anxiety');await page.getByLabel('想说的话 可选').fill('测试记录');await page.getByRole('button',{name:'保存心情',exact:true}).click();await expect(page.locator('.record-list')).toContainText('焦虑');await page.getByLabel('更正这条情绪').selectOption('relaxed');await expect(page.locator('.record-list')).toContainText('平静');
  await go(page,'/profile');await page.getByLabel('我的偏好',{exact:true}).fill('我希望先被倾听');await page.getByRole('button',{name:'添加偏好'}).click();await expect(page.locator('.fact-list')).toContainText('我希望先被倾听');
  await go(page,'/growth');await page.getByLabel('新的小目标',{exact:true}).fill('测试散步十分钟');await page.getByRole('button',{name:'种下目标'}).click();await page.locator('.goal-list input').check();await expect(page.locator('.growth-stats>div').nth(2)).toContainText('1');await saveWait(page);await page.reload();await expect(page.locator('.goal-list input')).toBeChecked();
});
test('场景、形象、减少动态持久化，Canvas 有可键盘访问的反馈',async({page})=>{
  await go(page,'/chat');await page.getByRole('button',{name:'摸摸猫咪',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'喵'})).toBeVisible();await go(page,'/scenes');await page.getByRole('button',{name:'预览星空小屋',exact:true}).click();await page.getByRole('button',{name:'应用这个场景',exact:true}).click();await go(page,'/avatar');await page.getByRole('button',{name:'樱粉小屿',exact:true}).click();await page.getByRole('button',{name:'保存形象',exact:true}).click();await go(page,'/settings');await page.getByRole('switch',{name:'减少动态效果',exact:true}).click();await saveWait(page);await page.reload();await expect(page.getByRole('switch',{name:'减少动态效果',exact:true})).toHaveAttribute('aria-checked','true');await go(page,'/chat');await expect(page.locator('.pixel-room')).toHaveAttribute('data-scene','star_room');
});
test('应用锁保护所有路由，密码失败不会解锁',async({page})=>{
  await go(page,'/settings');await page.getByLabel('设置应用密码（6–12 位数字）').fill('123456');await page.getByLabel('再次输入',{exact:true}).fill('123456');await page.getByRole('button',{name:'保存应用密码'}).click();await saveWait(page);await page.getByRole('button',{name:'立即锁定',exact:true}).click();await expect(page.getByRole('heading',{name:'你的小岛，安心停靠'})).toBeVisible();await page.getByLabel('应用密码',{exact:true}).fill('000000');await page.getByRole('button',{name:'解锁心屿',exact:true}).click();await expect(page.getByRole('alert')).toContainText('不正确');await go(page,'/risu');await expect(page.getByRole('heading',{name:'你的小岛，安心停靠'})).toBeVisible();await page.getByLabel('应用密码',{exact:true}).fill('123456');await page.getByRole('button',{name:'解锁心屿',exact:true}).click();await expect(page.getByRole('heading',{name:'好像走到小岛的另一边了'})).toBeVisible();
});
test('390px 底部导航可用，各页面无横向溢出',async({page})=>{
  await page.setViewportSize({width:390,height:844});await expect(page.locator('.xy-sidebar')).toHaveCount(0);await page.getByRole('navigation',{name:'主导航',exact:true}).getByRole('link',{name:'对话',exact:true}).click();await expect(page.locator('.xy-page-heading h1')).toHaveText('说给小屿听');for(const id of ['/','/chat','/emotion','/memories','/profile','/growth','/avatar','/scenes','/settings']){await go(page,id);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
});
// Native modal keeps the background inert through its exit; wait for removal before typing.
test('开启与撤回记忆真实影响 Risu 提示词',async({page})=>{
  await go(page,'/memories');await page.getByRole('button',{name:'了解并开启',exact:true}).click();await page.getByRole('button',{name:'确认开启',exact:true}).click();await expect(page.locator('.xy-dialog')).toHaveCount(0);await page.getByLabel('记忆内容',{exact:true}).fill('工程记忆独特标记 sunflower-42');await page.getByLabel('我同意保存这条记忆').check();await page.getByRole('button',{name:'保存记忆',exact:true}).click();
  const bodies:any[]=[];await page.route('**/xinyu-api/chat/completions',route=>{bodies.push(route.request().postDataJSON());return route.fulfill({json:{choices:[{message:{role:'assistant',content:'工程响应'},finish_reason:'stop'}]}});});
  await gateway(page);await page.getByLabel('想对小屿说的话').fill('工程记忆授权测试');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.message-row:not(.from-user)')).toHaveCount(1);expect(JSON.stringify(bodies[0].messages)).toContain('sunflower-42');
  await go(page,'/memories');await page.getByRole('button',{name:'关闭记忆',exact:true}).click();await go(page,'/chat');await page.getByLabel('想对小屿说的话').fill('工程撤回授权测试');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.message-row:not(.from-user)')).toHaveCount(2);expect(JSON.stringify(bodies[1].messages)).not.toContain('sunflower-42');
});
test('个人导出入口已移除，完整清除后恢复空账号',async({page})=>{
  await page.evaluate(async()=>{const {DBState}=await (window as any).__xinyuTestImport('/src/ts/stores.svelte.ts');DBState.db.openAIKey='fixture-credential-must-not-export';});
  await page.evaluate(async()=>{
    for(const [name,storeName] of [['risuSaveCache','keyvaluepairs'],['LLMTranslateCache','keyvaluepairs'],['plugin','plugin']])await new Promise<void>((resolve,reject)=>{const request=indexedDB.open(name);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName);};request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).put('fixture-private-cache','privacy-fixture');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
    if(navigator.storage?.getDirectory){const root=await navigator.storage.getDirectory(),file=await root.getFileHandle('privacy-fixture.txt',{create:true}),writer=await file.createWritable();await writer.write('fixture-private-cache');await writer.close();}
  });
  await go(page,'/profile');await page.getByLabel('我的偏好',{exact:true}).fill('导出和清除测试记录');await page.getByRole('button',{name:'添加偏好'}).click();
  await go(page,'/settings');await expect(page.getByRole('button',{name:'导出个人记录',exact:true})).toHaveCount(0);await expect(page.locator('.settings-grid')).not.toContainText('fixture-credential');
  await page.getByLabel('输入“清除全部”以继续').fill('清除全部');await page.getByRole('button',{name:'清除全部本机数据',exact:true}).click();const clearedReload=page.waitForEvent('load');await page.getByRole('dialog').getByRole('button',{name:'清除全部本机数据',exact:true}).click();await clearedReload;await expect(page.locator('.island-greeting h1')).toBeVisible();await go(page,'/profile');await expect(page.locator('.fact-list')).toHaveCount(0);
  await page.reload();await expect(page.locator('.xy-page-heading h1')).toHaveText('慢慢认识真实的你');await expect(page.locator('.fact-list')).toHaveCount(0);expect(await page.evaluate(async()=>{const {DBState}=await (window as any).__xinyuTestImport('/src/ts/stores.svelte.ts');return DBState.db.openAIKey;})).not.toBe('fixture-credential-must-not-export');
  expect(await page.evaluate(async()=>{
    const remaining=[];for(const [name,storeName] of [['risuSaveCache','keyvaluepairs'],['LLMTranslateCache','keyvaluepairs'],['plugin','plugin']])remaining.push(await new Promise(resolve=>{const request=indexedDB.open(name);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains(storeName)){db.close();resolve(undefined);return;}const get=db.transaction(storeName).objectStore(storeName).get('privacy-fixture');get.onsuccess=()=>{db.close();resolve(get.result);};};}));
    if(navigator.storage?.getDirectory){const root=await navigator.storage.getDirectory();remaining.push(await root.getFileHandle('privacy-fixture.txt').then(()=>true).catch(()=>undefined));}return remaining.every(value=>value===undefined);
  })).toBe(true);
});

test('情绪分析经单独授权，画像先确认；撤回和删除来源阻止在途结果落盘',async({page})=>{
  let hold=false,analysisCount=0,release:(()=>void)|undefined;
  await page.route('**/xinyu-api/chat/completions',async route=>{
    const input=route.request().postDataJSON();
    const analysis=input.messages.some(m=>m.role==='system'&&m.content.includes('只输出 JSON'));
    if(analysis){analysisCount++;if(hold)await new Promise<void>(resolve=>release=resolve);}
    await route.fulfill({json:{choices:[{message:{role:'assistant',content:analysis?JSON.stringify({emotion_label:'anxiety',profile:[{label:'兴趣',value:'工程分析标记 reading-37'}]}):'工程对话响应'},finish_reason:'stop'}]}});
  });
  await gateway(page);
  await page.getByLabel('想对小屿说的话').fill('没有授权时只进行对话');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.message-row:not(.from-user)')).toHaveCount(1);expect(analysisCount).toBe(0);
  await go(page,'/settings');for(const name of ['对话情绪分析','画像参与陪伴']){await page.getByRole('switch',{name,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'我了解，开启',exact:true}).click();await expect(page.locator('.xy-dialog')).toHaveCount(0);}
  await go(page,'/chat');await page.getByLabel('想对小屿说的话').fill('这是已授权的对话分析检查');await page.getByRole('button',{name:'发送',exact:true}).click();
  await expect.poll(()=>analysisCount).toBe(1);await go(page,'/profile');await expect(page.locator('.fact-list')).toContainText('模型推断');await expect(page.getByRole('button',{name:'确认准确'})).toBeVisible();
  expect(await page.evaluate(async()=>{const {DBState}=await (window as any).__xinyuTestImport('/src/ts/stores.svelte.ts');return JSON.stringify(DBState.db.characters[0].globalLore);})).not.toContain('reading-37');
  await page.getByRole('button',{name:'确认准确'}).click();expect(await page.evaluate(async()=>{const {DBState}=await (window as any).__xinyuTestImport('/src/ts/stores.svelte.ts');return JSON.stringify(DBState.db.characters[0].globalLore);})).toContain('reading-37');
  hold=true;await go(page,'/chat');await page.getByLabel('想对小屿说的话').fill('请求期间撤回分析授权');await page.getByRole('button',{name:'发送',exact:true}).click();await expect.poll(()=>analysisCount).toBe(2);
  await go(page,'/settings');await page.getByRole('switch',{name:'对话情绪分析',exact:true}).click();release?.();await expect.poll(()=>page.evaluate(async()=>{const {chatState}=await (window as any).__xinyuTestImport('/src/xinyu/bridge.svelte.ts');return chatState.analyzing;})).toBe(false);
  expect(await page.evaluate(async()=>{const {companion}=await (window as any).__xinyuTestImport('/src/xinyu/state.svelte.ts');return companion.data.emotions.length;})).toBe(1);
  await page.getByRole('switch',{name:'对话情绪分析',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'我了解，开启',exact:true}).click();await expect(page.locator('.xy-dialog')).toHaveCount(0);await go(page,'/chat');await page.getByLabel('想对小屿说的话').fill('请求期间删除来源会话');await page.getByRole('button',{name:'发送',exact:true}).click();await expect.poll(()=>analysisCount).toBe(3);await expect(page.getByRole('button',{name:'发送',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^删除对话 /}).first().click();await page.getByRole('dialog').getByRole('button',{name:'确认删除',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();release?.();await expect.poll(()=>page.evaluate(async()=>{const {chatState}=await (window as any).__xinyuTestImport('/src/xinyu/bridge.svelte.ts');return chatState.analyzing;})).toBe(false);
  expect(await page.evaluate(async()=>{const {companion}=await (window as any).__xinyuTestImport('/src/xinyu/state.svelte.ts');return [companion.data.emotions.length,companion.data.facts.length];})).toEqual([0,0]);
});

test('流式回复沿原 Risu 链路解析，停止按钮能中止在途请求',async({page})=>{
  let streaming=false;
  await page.route('**/xinyu-api/chat/completions',async route=>{
    const body=route.request().postDataJSON();streaming=body.stream===true;
    await route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{delta:{role:'assistant',content:'工程流式'},index:0,finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:'回复成功'},index:0,finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{},index:0,finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n'});
  });
  await gateway(page);await page.evaluate(async()=>{const {DBState}=await (window as any).__xinyuTestImport('/src/ts/stores.svelte.ts');DBState.db.useStreaming=true;});
  await page.getByLabel('想对小屿说的话').fill('检查原始流式解析');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.message-row:not(.from-user)')).toContainText('工程流式回复成功');expect(streaming).toBe(true);
  await page.unroute('**/xinyu-api/chat/completions');let arrived=false,finish:(()=>void)|undefined;await page.route('**/xinyu-api/chat/completions',async route=>{arrived=true;await new Promise<void>(resolve=>finish=resolve);await route.fulfill({json:{choices:[{message:{role:'assistant',content:'不应展示的延迟回复'},finish_reason:'stop'}]}}).catch(()=>{});});
  await page.getByLabel('想对小屿说的话').fill('检查停止在途请求');await page.getByRole('button',{name:'发送',exact:true}).click();await expect.poll(()=>arrived).toBe(true);await page.getByRole('button',{name:'停止回复',exact:true}).click();finish?.();await expect(page.getByRole('button',{name:'发送',exact:true})).toBeVisible({timeout:15000});await expect(page.locator('.from-user')).toHaveCount(2);await expect(page.locator('.message-list')).not.toContainText('不应展示的延迟回复');
});
