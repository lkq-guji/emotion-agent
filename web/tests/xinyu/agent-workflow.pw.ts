import {test,expect,type Page} from '@playwright/test';
import {startAgentFixture} from './fixtures/agent-server.mjs';
import {writeFileSync,unlinkSync,mkdirSync} from 'node:fs';
import path from 'node:path';
let fixture:Awaited<ReturnType<typeof startAgentFixture>>;
const origin='http://127.0.0.1:5192',privateFile=path.resolve('.runtime','agent-private-fixture-'+process.pid+'.sqlite3');
test.use({baseURL:origin,actionTimeout:15000});
test.beforeAll(async()=>{fixture=await startAgentFixture();mkdirSync(path.dirname(privateFile),{recursive:true});writeFileSync(privateFile,'private-engineering-database-marker');});
test.afterAll(async()=>{await fixture?.close();if(privateFile.startsWith(path.resolve('.runtime')+path.sep))try{unlinkSync(privateFile);}catch{}});
async function go(page:Page,where:string){await page.evaluate(p=>location.hash=p,where);}
async function state(page:Page){const response=await page.request.get(origin+'/xinyu-api/agent/state');expect(response.status()).toBe(200);return response.json();}
async function ready(page:Page){await page.addInitScript(()=>localStorage.setItem('tos4','true'));await page.goto('/');await expect(page.locator('.island-stage')).toHaveAttribute('data-ready','true',{timeout:90000});await go(page,'/growth');await expect(page.getByLabel('小约定的内容')).toBeVisible();}
async function freshConversation(page:Page){await go(page,'/chat');await page.getByRole('button',{name:'对话与功能',exact:true}).click();await page.getByRole('button',{name:'新建对话',exact:true}).click();await page.getByRole('button',{name:'对话与功能',exact:true}).click();}
async function send(page:Page,text:string){await page.getByLabel('想对小屿说的话').fill(text);await page.getByRole('button',{name:'发送',exact:true}).click();}
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));fixture.calls.length=0;await ready(page);});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));

test('manual goals and focus persist through reload; completion, recovery and cancellation use actual SQLite state',async({page})=>{
 await page.getByRole('button',{name:'选择场景时段',exact:true}).click();await page.getByRole('dialog',{name:'场景时段'}).getByRole('button',{name:'白天',exact:true}).click();
 await page.getByLabel('小约定的内容').fill('读英语两页');await page.getByLabel('小步骤').fill('复习单词\n读一段短文');await page.getByRole('button',{name:'创建小目标',exact:true}).click();
 await expect(page.locator('.task-row')).toContainText('读英语两页');await page.screenshot({path:'.impeccable/review/agent/growth.png'});await page.reload();await expect(page.locator('.task-row')).toContainText('读英语两页');
 await page.getByRole('button',{name:'完成目标',exact:true}).click();await page.getByRole('button',{name:'已结束',exact:true}).click();await expect(page.locator('.task-row')).toContainText('已完成');
 await page.getByRole('button',{name:'恢复目标',exact:true}).click();await page.getByRole('button',{name:/^目标/}).click();await expect(page.locator('.task-row')).toContainText('进行中');
 await page.getByLabel('安排类型').selectOption('focus');await page.getByLabel('小约定的内容').fill('英语专注');await page.getByLabel('专注计时（分钟）').fill('25');await page.getByRole('button',{name:'开始专注',exact:true}).click();
 await expect(page.getByRole('timer')).toHaveText(/^\d{2}:\d{2}$/);await page.waitForTimeout(1200);await page.reload();await page.getByRole('button',{name:/^专注/}).click();await expect(page.locator('.focus-countdown')).not.toHaveText('25:00');
 await page.getByRole('button',{name:'取消计时',exact:true}).click();expect((await state(page)).items.find(x=>x.kind==='focus').status).toBe('cancelled');expect(fixture.calls.length).toBe(0);await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'选择场景时段',exact:true}).click();await page.getByRole('dialog',{name:'场景时段'}).getByRole('button',{name:'夜间',exact:true}).click();await page.screenshot({path:'.impeccable/review/agent/growth-night.png'});expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
});
test('authorized preference is confirmed, survives reload, guides a new plan and is excluded after deletion',async({page})=>{
 await go(page,'/memories');await page.getByRole('button',{name:'了解并开启',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'确认开启',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await go(page,'/chat');await send(page,'[工程偏好]请记住我学习英语喜欢每次25分钟。');
 const memoryCard=page.getByRole('article',{name:'待确认：珍藏一条记忆',exact:true});await expect(page.getByText('确认前尚未执行',{exact:true})).toBeVisible();await expect(memoryCard).toBeVisible();
 expect((await state(page)).items).toHaveLength(0);await memoryCard.getByRole('button',{name:'确认保存记忆',exact:true}).click();await expect(memoryCard).toHaveCount(0);
 await page.reload();await go(page,'/memories');await expect(page.locator('.memory-timeline')).toContainText('我学习英语时喜欢每次专注25分钟。');
 await freshConversation(page);await page.getByRole('button',{name:'沉浸剧场',exact:true}).click();await send(page,'[工程安排]请帮我安排英语学习。');
 const plan=page.getByRole('article',{name:'待确认：一个小目标',exact:true});await expect(plan).toContainText('25 分钟');await expect(plan.getByRole('button',{name:'确认并执行'})).toBeInViewport({ratio:1});await page.screenshot({path:'.impeccable/review/agent/chat-plan.png'});expect((await state(page)).items).toHaveLength(0);
 await plan.getByRole('button',{name:'确认并执行',exact:true}).click();await expect(plan).toHaveCount(0);expect((await state(page)).items.map(x=>x.kind).sort()).toEqual(['focus','goal','reminder']);
 await page.reload();await go(page,'/growth');await expect(page.locator('.task-row')).toContainText('英语学习小目标');
 await go(page,'/memories');await page.locator('.memory-timeline article').getByRole('button',{name:'删除',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'确认删除',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await freshConversation(page);await expect(page.locator('.agent-turn-log')).toHaveCount(0);const from=fixture.calls.length;await send(page,'[工程安排]再帮我安排英语学习。');await expect(page.getByRole('article',{name:'待确认：一个小目标'})).toContainText('15 分钟');
 expect(fixture.calls.slice(from).some(c=>c.messages[0].content.includes('我学习英语时喜欢每次专注25分钟。'))).toBe(false);
});
test('reminders can be rescheduled, notify in another page and are actually cancelled',async({page})=>{
 await page.getByLabel('安排类型').selectOption('reminder');await page.getByLabel('小约定的内容').fill('看看窗外');
 const future=await page.evaluate(()=>{const d=new Date(Date.now()+600000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19);});
 await page.getByLabel('什么时候提醒').fill(future);await page.getByRole('button',{name:'设置提醒',exact:true}).click();await expect(page.locator('.task-row')).toContainText('等待提醒');
 await page.getByRole('button',{name:'调整时间',exact:true}).click();const soon=await page.evaluate(()=>{const d=new Date(Date.now()+5000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19);});
 await page.getByLabel('新的提醒时间').fill(soon);await page.getByRole('button',{name:'保存时间',exact:true}).click();await expect(page.getByLabel('新的提醒时间')).toHaveCount(0);await go(page,'/chat');
 await expect(page.getByRole('complementary',{name:'到期的小约定'})).toContainText('看看窗外',{timeout:20000});
 await send(page,'[工程取消]请取消当前提醒。');const cancel=page.getByRole('article',{name:'待确认：提醒安排',exact:true});await expect(cancel).toContainText('取消这项约定');
 await cancel.getByRole('button',{name:'确认并执行',exact:true}).click();await expect(page.getByRole('complementary',{name:'到期的小约定'})).toHaveCount(0);
 expect((await state(page)).items.find(x=>x.kind==='reminder').status).toBe('cancelled');
});
test('provider failures and stopping preserve the draft message without inventing a reply or executing actions',async({page})=>{
 await go(page,'/chat');await send(page,'[工程失败]检查错误路径');await expect(page.locator('.chat-error')).toContainText('HTTP 502');expect((await state(page)).actions).toHaveLength(0);await expect(page.locator('.message-row:not(.from-user)')).toHaveCount(0);
 await freshConversation(page);const before=fixture.aborted;await send(page,'[工程等待]检查停止路径');await expect(page.getByRole('button',{name:'停止回复',exact:true})).toBeVisible();
 await expect.poll(()=>fixture.calls.some(c=>c.messages.some(m=>m.role==='user'&&m.content.includes('[工程等待]')))).toBe(true);await page.getByRole('button',{name:'停止回复',exact:true}).click();await expect(page.locator('.chat-error')).toContainText('已停止');await expect.poll(()=>fixture.aborted).toBeGreaterThan(before);expect((await state(page)).actions).toHaveLength(0);
});
test('spaces are isolated, clear removes tasks, and development HTTP never serves the private database',async({page,browser})=>{
 await page.getByLabel('小约定的内容').fill('只属于这个浏览器的约定');await page.getByRole('button',{name:'创建小目标',exact:true}).click();await expect(page.locator('.task-row')).toContainText('这个浏览器');
 const other=await browser.newContext();try{const second=await other.newPage();await ready(second);expect((await state(second)).items).toHaveLength(0);}finally{await other.close();}
 const hidden=await page.request.get(origin+'/.runtime/'+path.basename(privateFile));expect(hidden.status()).not.toBe(200);expect(await hidden.text()).not.toContain('private-engineering-database-marker');
 await go(page,'/settings');await page.getByLabel('输入“清除全部”以继续').fill('清除全部');await page.getByRole('button',{name:'清除全部本机数据',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'清除全部本机数据',exact:true}).click();
 await expect(page.locator('.island-stage')).toHaveAttribute('data-ready','true');await go(page,'/growth');await expect(page.getByLabel('小约定的内容')).toBeVisible();expect((await state(page)).items).toHaveLength(0);expect((await state(page)).actions).toHaveLength(0);
});

test('legacy goals migrate once, mirror completion and delete from both the task store and original save',async({page})=>{
 await page.evaluate(async()=>{
  const entry=performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname==='/src/xinyu/state.svelte.ts');
  const {updateData}=await import(entry.name);
  updateData(data=>data.goals.unshift({id:'legacy-engineering-goal',text:'旧存档的散步约定',at:Date.now()-86400000}));
 });
 await expect(page.getByText('已保存到本机',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>fetch('/xinyu-api/agent/data',{method:'DELETE'}).then(r=>r.status))).toBe(200);
 await page.reload();const row=page.getByRole('article',{name:'旧存档的散步约定',exact:true});await expect(row).toBeVisible();
 await row.getByRole('button',{name:'完成目标',exact:true}).click();
 await expect.poll(()=>page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname==='/src/xinyu/state.svelte.ts');const {companion}=await import(entry.name);return companion.data.goals.find(g=>g.id==='legacy-engineering-goal')?.status;})).toBe('completed');
 await page.getByRole('button',{name:'已结束',exact:true}).click();await row.getByRole('button',{name:'删除记录',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'删除记录',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.reload();expect((await state(page)).items).toHaveLength(0);
 expect(await page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname==='/src/xinyu/state.svelte.ts');const {companion}=await import(entry.name);return companion.data.goals.some(g=>g.id==='legacy-engineering-goal');})).toBe(false);
});

test('task forms and confirmation support keyboard and reduced motion; locking hides due task content',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByLabel('小约定的内容').fill('键盘创建的约定');
 const submit=page.getByRole('button',{name:'创建小目标',exact:true});await submit.focus();await page.keyboard.press('Enter');await expect(page.getByRole('article',{name:'键盘创建的约定',exact:true})).toBeVisible();
 await go(page,'/chat');await send(page,'[工程安排]请帮我安排英语学习。');const plan=page.getByRole('article',{name:'待确认：一个小目标',exact:true});
 const reject=plan.getByRole('button',{name:'暂不安排',exact:true});await expect(reject).toBeEnabled();await reject.focus();await expect(reject).toBeFocused();expect(await reject.evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');await page.keyboard.press('Enter');await expect(plan).toHaveCount(0);expect((await state(page)).items).toHaveLength(1);
 await page.evaluate(()=>fetch('/xinyu-api/agent/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({commandId:'lock-reminder',tool:'manage_reminder',args:{operation:'create',title:'锁定时不应显示的约定',at:new Date(Date.now()+4000).toISOString()}})}));
 await go(page,'/settings');await page.getByLabel('设置应用密码（6–12 位数字）').fill('123456');await page.getByLabel('再次输入',{exact:true}).fill('123456');await page.getByRole('button',{name:'保存应用密码',exact:true}).click();await page.getByRole('button',{name:'立即锁定',exact:true}).click();await expect(page.getByRole('heading',{name:'你的小岛，安心停靠',exact:true})).toBeVisible();
 await page.waitForTimeout(5000);await expect(page.getByRole('complementary',{name:'到期的小约定'})).toHaveCount(0);await expect(page.getByText('锁定时不应显示的约定',{exact:true})).toHaveCount(0);
 await page.getByLabel('应用密码',{exact:true}).fill('123456');await page.getByRole('button',{name:'解锁心屿',exact:true}).click();await expect(page.getByRole('complementary',{name:'到期的小约定'})).toContainText('锁定时不应显示的约定',{timeout:15000});
});
