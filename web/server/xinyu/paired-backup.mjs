import {cpSync,existsSync,lstatSync,mkdirSync,readdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {backupDatabase} from './migration.mjs';

// Copy a stopped, dedicated browser user-data directory (including its space cookie).
// Both backup and restore require a new destination; an interrupted copy is never activated.
const [mode,first,second,third]=process.argv.slice(2);
const inside=(parent,path)=>{const r=relative(parent,path);return !r||(!r.startsWith('..')&&!isAbsolute(r));};
function fresh(dest,sources){
 const target=resolve(dest);
 if(existsSync(target)||sources.some(s=>inside(s,target)))throw Error('目标须为源目录之外的全新路径');
 mkdirSync(target);return target;
}
function files(root,dir=root){
 return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p=join(dir,e.name);
  if(e.isSymbolicLink()||(!e.isFile()&&!e.isDirectory()))throw Error('备份不支持链接或特殊文件');
  return e.isDirectory()?files(root,p):[relative(root,p).split('\\').join('/')];
 }).sort();
}
async function hashes(root){
 const result={};
 for(const file of files(root).filter(f=>f!=='manifest.json')){
  const hash=createHash('sha256');for await(const data of createReadStream(join(root,file)))hash.update(data);
  result[file]=hash.digest('hex');
 }
 return result;
}
if(mode==='backup'&&first&&second&&third){
 const database=realpathSync(first),profile=realpathSync(second);
 if(!lstatSync(profile).isDirectory()||inside(profile,database))throw Error('应分别提供 SQLite 文件与专用浏览器目录');
 files(profile);
 const target=fresh(third,[profile]);
 const db=new DatabaseSync(database,{readOnly:true});
 try{backupDatabase(db,join(target,'agent.sqlite3'));}finally{db.close();}
 cpSync(profile,join(target,'browser'),{recursive:true,errorOnExist:true,force:false});
 writeFileSync(join(target,'manifest.json'),JSON.stringify({version:1,files:await hashes(target)},null,2),{flag:'wx'});
 console.log('双端备份已生成并计算校验和');
}else if(mode==='restore'&&first&&second){
 const source=realpathSync(first),manifest=JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
 if(manifest.version!==1||JSON.stringify(manifest.files)!==JSON.stringify(await hashes(source)))throw Error('备份清单或校验和不匹配');
 const target=fresh(second,[source]);
 cpSync(join(source,'browser'),join(target,'browser'),{recursive:true});
 cpSync(join(source,'agent.sqlite3'),join(target,'agent.sqlite3'));
 console.log('已恢复到独立目录，请使用匹配的应用版本、端口和浏览器配置验证');
}else throw Error('用法：backup <SQLite文件> <已关闭的专用浏览器目录> <新目录> 或 restore <备份目录> <新目录>');
