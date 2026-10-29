import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))];
const bad=[],sensitive=/\bsk-[A-Za-z0-9_-]{24,}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\\nr]*[A-Za-z0-9+/=]{32,}(?:[\s\\nr]+[A-Za-z0-9+/=]{16,})*[\s\\nr]*-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const known=[process.env.DEEPSEEK_API_KEY,process.env.XINYU_API_KEY].filter(v=>v?.length>8);
for(const f of files){const full=path.join(root,f);if(!existsSync(full)||!statSync(full).isFile())continue;
 if(/(?:^|\/)(?:node_modules|dist|\.runtime|\.impeccable|\.taste-skill|playwright-report|test-results)\//.test(f)||/(?:^|\/)\.env(?:\..*)?$/.test(f)&&!f.endsWith('.env.example'))bad.push({file:f,reason:'local-only artifact'});
 if(statSync(full).size>50*1024*1024)bad.push({file:f,reason:'oversized file'});
 if(/\.(?:md|json|ts|js|svelte|html|css|mjs|yml|yaml|toml|txt|example|py|lock)$/.test(f)){const b=readFileSync(full);if(sensitive.test(b.toString('utf8'))||known.some(k=>b.includes(Buffer.from(k))))bad.push({file:f,reason:'credential-like value'});}
}
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0');
if(tracked.some(f=>/(?:^|\/)\.env(?:\..*)?$/.test(f)&&!f.endsWith('.env.example')))bad.push({file:'.env',reason:'tracked environment'});
console.log(JSON.stringify({filesChecked:files.length,findings:bad}));if(bad.length)process.exitCode=1;
