import {test, expect, type Page} from '@playwright/test';

const failures = new WeakMap<Page, string[]>();
const evidence = '.impeccable/review/companion-upgrade';
async function go(page: Page, route: string) {
  await page.evaluate(path => { location.hash = path; }, route);
  await expect(page.locator('.xy-main')).toBeVisible();
}
async function weather(page: Page, name: string) {
  await page.getByRole('button', {name:'选择天气', exact:true}).click();
  const dialog = page.getByRole('dialog', {name:'天气控制'});
  await dialog.getByRole('button', {name:new RegExp('^'+name)}).click();
  await dialog.getByRole('button', {name:'完成', exact:true}).click();
}
async function period(page: Page, name: string) {
  await page.getByRole('button', {name:'选择场景时段'}).click();
  await page.getByRole('dialog', {name:'场景时段'}).getByRole('button', {name, exact:true}).click();
}
async function strength(page: Page, label: string, value: number) {
  const slider = page.getByLabel(label, {exact:true});
  await slider.focus(); await slider.press('Home');
  for (let i=0;i<value;i++) await slider.press('ArrowRight');
}
async function gateway(page: Page) {
  await go(page, '/settings');
  await page.getByRole('button', {name:'使用本机网关', exact:true}).click();
  await go(page, '/chat');
}
async function settleSave(page: Page) { await page.waitForTimeout(1600); }

test.beforeEach(async ({page}) => {
  const errors:string[]=[]; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('tos4', 'true'));
  await page.route('**/xinyu-api/health', route => route.fulfill({json:{configured:true, model:'engineering-fixture', localOnly:true}}));
  await page.goto('/');
  await expect(page.locator('.island-stage')).toHaveAttribute('data-ready', 'true', {timeout:90000});
});
test.afterEach(async ({page}) => { expect(failures.get(page)).toEqual([]); });

test('larger home entry stays within desktop bounds and arrives at the real composer', async ({page}) => {
  for (const width of [1366,1920,2560]) {
    await page.setViewportSize({width, height:900});
    const cta = page.getByRole('button', {name:'和小屿聊聊', exact:true});
    const box = (await cta.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(285); expect(box.height).toBeGreaterThanOrEqual(64);
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button', {name:'和小屿聊聊', exact:true}).click();
  await expect(page.getByLabel('想对小屿说的话')).toBeFocused({timeout:10000});
  await expect(page.locator('.companion-layout')).toHaveAttribute('data-chat-view', 'table');
});

test('rain keeps the chosen room window while the island retains its weather atmosphere', async ({page}) => {
  await weather(page,'晴天'); await go(page, '/scenes');
  await page.getByRole('button', {name:'预览樱花庭院', exact:true}).click();
  await page.getByRole('button', {name:'应用这个场景', exact:true}).click();
  await go(page, '/'); await weather(page,'雨天');
  for (const [name,file] of [['白天','day'],['傍晚','day'],['夜间','night']]) {
    await period(page, name);
    await expect(page.locator('.island-stage')).toHaveAttribute('data-sky','overcast');
    await expect(page.locator('.island-stage')).toHaveAttribute('data-scenery',new RegExp('island-overcast-'+file+'-v1.png$'));
  }
  await page.screenshot({path:evidence+'/rain-night-home.png'});
  await go(page, '/chat');
  await expect(page.locator('.pixel-room')).toHaveAttribute('data-display-scene','sakura');
  await expect(page.locator('.pixel-room')).toHaveAttribute('data-scene','sakura');
  await expect(page.locator('.pixel-room')).toHaveAttribute('data-window-art','/xinyu/generated/sakura.png');
  await weather(page,'晴天');
  await expect(page.locator('.pixel-room')).toHaveAttribute('data-display-scene','sakura');
  await settleSave(page);await page.reload();await expect(page.locator('.pixel-room')).toHaveAttribute('data-scene','sakura');await expect(page.locator('.xinyu-app')).toHaveAttribute('data-period','night');
});

test('emotion recording, multiple feelings, action, review and correction persist and delete together', async ({page}) => {
  await go(page,'/emotion');
  await page.getByLabel('我的心情',{exact:true}).selectOption('anxiety');
  await strength(page,'感受强度',8);
  await page.getByLabel('想说的话 可选').fill('项目快提交了，想先理清一点');
  await page.locator('.reflection-details summary').click();
  await page.locator('.emotion-chips').getByRole('button',{name:'低落',exact:true}).click();
  await page.getByLabel('当时的情境',{exact:true}).fill('项目准备');
  await page.getByLabel('此刻需要什么',{exact:true}).fill('先有人听我说');
  await page.getByLabel('愿意尝试的一小步',{exact:true}).fill('去窗边喝水');
  await page.getByRole('button',{name:'保存心情',exact:true}).click();
  const record=page.locator('.emotion-record');
  await expect(record).toContainText('焦虑 · 低落');
  await record.getByRole('checkbox').check();
  await record.getByRole('button',{name:'事后回看',exact:true}).click();
  await strength(page,'现在的感受强度',3);
  await page.getByLabel('这一步对我',{exact:true}).selectOption('yes');
  await page.getByLabel('回看想说的话',{exact:true}).fill('先休息一下，清楚多了');
  await page.getByRole('button',{name:'保存回看',exact:true}).click();
  await expect(record.locator('.reflection-result')).toContainText('8 → 3');
  await record.getByLabel('更正这条情绪').selectOption('relaxed');
  await expect(record).toContainText('平静 · 低落');
  await settleSave(page); await page.reload();
  await page.getByRole('button',{name:'打开我的情绪日记',exact:true}).click();await page.locator('.diary-entry').first().locator('summary').click();
  await expect(record.getByRole('checkbox')).toBeChecked();
  await expect(record).toContainText('先休息一下，清楚多了');
  await expect(page.locator('.journey-overview')).toContainText('1');
  await record.scrollIntoViewIfNeeded();
  await page.screenshot({path:evidence+'/emotion-review.png'});
  await page.locator('.context-tags').getByRole('button',{name:/项目准备/}).click();
  await expect(record).toHaveCount(1);
  await expect(record.locator('.reflection-result')).toContainText('8 → 3');await expect(record).toContainText('项目准备');
  await record.getByRole('button',{name:'删除',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'确认删除',exact:true}).click();
  await expect(page.locator('.xy-dialog')).toHaveCount(0);
  await expect(page.locator('.diary-entry')).toHaveCount(0);
});

test('emotion support opens an editable real chat draft without sending and view changes retain it', async ({page}) => {
  let calls=0; await page.route('**/xinyu-api/chat/completions',route=>{calls++; return route.abort();});
  await go(page,'/emotion');
  await page.getByLabel('想说的话 可选').fill('想试着说出今天发生的事');
  await page.getByRole('button',{name:'保存，和小屿梳理',exact:true}).click();
  const input=page.getByLabel('想对小屿说的话');
  await expect(input).toHaveValue(/想试着说出今天发生的事/);
  await expect(input).toBeFocused();
  await page.getByRole('button',{name:'沉浸剧场',exact:true}).click();
  await expect(input).toHaveValue(/想试着说出今天发生的事/);
  await page.getByRole('button',{name:'同桌陪伴',exact:true}).click();
  await expect(input).toHaveValue(/不要替我下结论/);
  expect(calls).toBe(0); await expect(page.locator('.message-row')).toHaveCount(0);
});

test('both conversation modes share real Risu requests, context, history and the persisted choice', async ({page}) => {
  const requests:any[]=[];
  await page.route('**/xinyu-api/chat/completions',route=>{requests.push(route.request().postDataJSON());return route.fulfill({json:{choices:[{message:{role:'assistant',content:'[工程链路验证] 我在听，第'+requests.length+'次回应。'},finish_reason:'stop'}]}});});
  await gateway(page);
  const input=page.getByLabel('想对小屿说的话');
  await input.fill('第一件真实请求检查'); await page.getByRole('button',{name:'发送',exact:true}).click();
  await expect(page.locator('.message-row:not(.from-user)')).toContainText('第1次回应');
  await page.getByRole('button',{name:'沉浸剧场',exact:true}).click();
  await input.fill('接着上一句'); await page.getByRole('button',{name:'发送',exact:true}).click();
  await expect(page.locator('.theatre-present')).toContainText('第2次回应');
  await expect(page.locator('.message-row')).toHaveCount(2);
  expect(JSON.stringify(requests[1].messages)).toContain('第一件真实请求检查');
  expect(JSON.stringify(requests[1].messages)).toContain('第1次回应');
  await page.screenshot({path:evidence+'/theatre-filled.png'});
  await page.getByRole('button',{name:'展开对话记录',exact:true}).click();
  await expect(page.locator('.message-row')).toHaveCount(4);
  await expect(page.locator('.theatre-present')).toHaveCount(0);
  await page.getByRole('button',{name:'回到当前问答',exact:true}).click();
  await expect(page.locator('.message-row')).toHaveCount(2);
  await settleSave(page); await page.reload();
  await expect(page.locator('.companion-layout')).toHaveAttribute('data-chat-view','theatre');
  await expect(page.locator('.theatre-present')).toContainText('第2次回应');
  await page.getByRole('button',{name:'同桌陪伴',exact:true}).click();
  await expect(page.locator('.message-row')).toHaveCount(4);
  await page.screenshot({path:evidence+'/table-filled.png'});
});

test('profile edits and past versions persist while only confirmed active current facts enter model context', async ({page}) => {
  const bodies:any[]=[];
  await page.route('**/xinyu-api/chat/completions',route=>{bodies.push(route.request().postDataJSON());return route.fulfill({json:{choices:[{message:{role:'assistant',content:'[工程上下文验证] 已收到'},finish_reason:'stop'}]}});});
  await go(page,'/profile');
  await page.getByLabel('偏好类型',{exact:true}).selectOption('交流方式');
  await page.getByLabel('我的偏好',{exact:true}).fill('past-pref-41 先倾听');
  await page.getByRole('button',{name:'添加偏好',exact:true}).click();
  await page.getByRole('button',{name:'编辑档案：past-pref-41 先倾听',exact:true}).click();
  await page.getByLabel('修改偏好内容',{exact:true}).fill('current-pref-72 可以先给一点建议');
  await page.getByRole('button',{name:'保存修改',exact:true}).click();
  await page.getByRole('button',{name:'了解并开启',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'确认开启',exact:true}).click();
  await expect(page.locator('.xy-dialog')).toHaveCount(0);
  await gateway(page);
  await page.getByLabel('想对小屿说的话').fill('确认当前画像上下文');
  await page.getByRole('button',{name:'发送',exact:true}).click();
  await expect(page.locator('.message-row:not(.from-user)')).toHaveCount(1);
  expect(JSON.stringify(bodies[0].messages)).toContain('current-pref-72');
  expect(JSON.stringify(bodies[0].messages)).not.toContain('past-pref-41');
  await go(page,'/profile');
  await page.getByRole('button',{name:/^暂停档案：/}).click();
  await go(page,'/chat');
  await page.getByLabel('想对小屿说的话').fill('暂停后只进行普通对话');
  await page.getByRole('button',{name:'发送',exact:true}).click();
  await expect(page.locator('.message-row:not(.from-user)')).toHaveCount(2);
  expect(JSON.stringify(bodies[1].messages)).not.toContain('current-pref-72');
  await go(page,'/profile');
  await page.getByRole('button',{name:'变化轨迹',exact:true}).click();
  await expect(page.locator('.profile-history')).toContainText('past-pref-41');
  await expect(page.locator('.profile-history')).toContainText('你将这项了解暂停');
  await page.getByRole('button',{name:'恢复这版内容',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'设为当前内容',exact:true}).click();
  await expect(page.locator('.xy-dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'当前档案',exact:true}).click();
  await expect(page.locator('.fact-list h3')).toHaveText('past-pref-41 先倾听');
  await expect(page.getByRole('button',{name:/^启用档案：/})).toBeVisible();
  await settleSave(page); await page.reload();
  await expect(page.locator('.fact-list h3')).toHaveText('past-pref-41 先倾听');
  await page.screenshot({path:evidence+'/profile-filled.png'});
  await expect(page.getByRole('button',{name:/^启用档案：/})).toBeVisible();await page.getByRole('button',{name:'变化轨迹',exact:true}).click();await expect(page.locator('.profile-history li')).toHaveCount(4);await page.getByRole('button',{name:'当前档案',exact:true}).click();
  await go(page,'/profile'); await page.getByRole('button',{name:/^移除档案：/}).click();
  await page.getByRole('dialog').getByRole('button',{name:'确认删除',exact:true}).click();
  await expect(page.locator('.xy-dialog')).toHaveCount(0);
  await expect(page.locator('.fact-list')).toHaveCount(0);await page.getByRole('button',{name:'变化轨迹',exact:true}).click();await expect(page.locator('.profile-history li')).toHaveCount(0);
});

test('desktop layouts preserve visible character, accessible input and keyboard mode selection at night', async ({page}) => {
  await period(page,'夜间'); await go(page,'/chat');
  for(const [width,height] of [[1366,720],[1920,1080],[2560,1440]]) {
    await page.setViewportSize({width,height});
    for(const name of ['同桌陪伴','沉浸剧场']) {
      const button=page.getByRole('button',{name,exact:true}); await button.focus(); await button.press('Enter');
      await expect(button).toHaveAttribute('aria-pressed','true');
      const character=(await page.getByRole('button',{name:'和小屿打招呼',exact:true}).boundingBox())!;
      const input=(await page.getByLabel('想对小屿说的话').boundingBox())!;
      expect(character.x).toBeGreaterThanOrEqual(0); expect(character.x+character.width).toBeLessThan(width);
      expect(character.y+character.height*.5).toBeLessThan(input.y);
      expect(input.y+input.height).toBeLessThan(height);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:evidence+'/theatre-night.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'同桌陪伴',exact:true}).click();
  await page.getByRole('button',{name:'和小屿打招呼',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'小屿'})).toBeVisible();
  await expect(page.getByLabel('想对小屿说的话')).toBeVisible();
});

test('theatre reads a long reply in its own log while the whole companion and composer stay available', async ({page}) => {
  const reply='[工程长回复] 这段文本用于验证真实请求完成后的阅读和滚动。'.repeat(55);
  await page.route('**/xinyu-api/chat/completions',route=>route.fulfill({json:{choices:[{message:{role:'assistant',content:reply},finish_reason:'stop'}]}}));
  await page.setViewportSize({width:1366,height:720});
  await gateway(page); await page.getByRole('button',{name:'沉浸剧场',exact:true}).click();
  await page.getByLabel('想对小屿说的话').fill('检查沉浸剧场长回复');
  await page.getByRole('button',{name:'发送',exact:true}).click();
  const log=page.locator('.theatre-present');
  await expect(log).toContainText('[工程长回复]');
  expect(await log.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  const face=(await page.getByRole('button',{name:'和小屿打招呼',exact:true}).boundingBox())!;
  const panel=(await log.boundingBox())!;
  expect(face.x+face.width).toBeLessThan(panel.x);
  await log.evaluate(el=>el.scrollTo({top:0}));
  await expect(log).toContainText('检查沉浸剧场长回复');
  await page.getByRole('button',{name:'摸摸猫咪',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'喵'})).toBeVisible();
  await expect(page.getByLabel('想对小屿说的话')).toBeVisible();
  await page.screenshot({path:evidence+'/theatre-long-1366.png'});
});
