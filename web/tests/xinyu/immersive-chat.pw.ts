import {test,expect} from '@playwright/test';
test('full character and cat remain interactive beside a long real chat response',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tos4','true'));await page.setViewportSize({width:1366,height:768});
 await page.route('**/xinyu-api/health',r=>r.fulfill({json:{configured:true,model:'engineering-fixture',localOnly:true}}));
 const reply='这是用于检查长回复阅读与滚动的工程测试内容。'.repeat(65);
 await page.route('**/xinyu-api/chat/completions',r=>r.fulfill({json:{choices:[{message:{role:'assistant',content:reply},finish_reason:'stop'}]}}));
 await page.goto('/#/settings');await page.getByRole('button',{name:'使用本机网关',exact:true}).click();await page.evaluate(()=>location.hash='/chat');const scene=page.locator('.companion-room'),message=page.locator('.chat-main'),girl=scene.getByRole('button',{name:'和小屿打招呼',exact:true}),cat=scene.getByRole('button',{name:'摸摸猫咪',exact:true});
 await expect(girl).toBeVisible();const a=await girl.boundingBox(),b=await message.boundingBox();expect(a!.x).toBeGreaterThanOrEqual(b!.x+b!.width-2);await girl.click();await expect(page.getByRole('status').filter({hasText:'小屿'})).toBeVisible();await cat.click();await expect(page.getByRole('status').filter({hasText:'喵'})).toBeVisible();
 await page.getByLabel('想对小屿说的话').fill('测试一段较长的对话');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.message-row:not(.from-user)')).toContainText('工程测试内容');await expect(page.locator('.message-row:not(.from-user) .message-name')).toContainText('小屿');expect(await page.locator('.message-list').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);await expect(page.getByLabel('想对小屿说的话')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});
