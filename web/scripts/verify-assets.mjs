import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('docs/runtime-assets.json','utf8')),failures=[];
for(const entry of manifest.files){try{const bytes=await readFile(entry.path);if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)failures.push(entry.path);}catch{failures.push(entry.path);}}
console.log(JSON.stringify({checked:manifest.files.length,missingOrChanged:failures}));if(failures.length)process.exitCode=1;
