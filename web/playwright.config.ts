import {defineConfig} from '@playwright/test';

const external=process.env.XINYU_TEST_URL;
export default defineConfig({
 testDir:'tests/xinyu',
 testMatch:['window-flow.pw.ts','scene-library.pw.ts','glass-scenery.pw.ts','distinct-room.pw.ts','immersive-diary.pw.ts','immersive-chat.pw.ts','companion-upgrade.pw.ts','platform.pw.ts','cozy-interactions.pw.ts'],
 grepInvert:/390px/,
 workers:1,timeout:90000,expect:{timeout:15000},
 reporter:[['list'],['json',{outputFile:'.runtime/browser-results.json'}]],
 use:{baseURL:external||'http://127.0.0.1:5190',channel:process.env.XINYU_BROWSER?undefined:'chromium',viewport:{width:1440,height:900},locale:'zh-CN',trace:'retain-on-failure',
  launchOptions:{...(process.env.XINYU_BROWSER?{executablePath:process.env.XINYU_BROWSER}:{}),...(process.env.CI?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})}},
 projects:[
  {name:'desktop',testIgnore:'**/window-flow.pw.ts'},
  {name:'pixel-readback',testMatch:'**/window-flow.pw.ts',use:{launchOptions:{...(process.env.XINYU_BROWSER?{executablePath:process.env.XINYU_BROWSER}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},
 ],
 webServer:external?undefined:{command:'pnpm dev --port 5190',url:'http://127.0.0.1:5190',reuseExistingServer:!process.env.CI,timeout:120000,
  env:{DEEPSEEK_API_KEY:'',XINYU_API_KEY:''}},
});
