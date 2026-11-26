import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';

export function backupDatabase(db,path){
 if(existsSync(path))throw new Error('备份文件已存在');
 db.prepare('VACUUM INTO ?').run(path);
 const copy=new DatabaseSync(path,{readOnly:true});
 try{
  if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||copy.prepare('PRAGMA foreign_key_check').all().length)throw new Error('备份校验失败');
 }finally{copy.close();}
}
export function upgrade(db,path,allow=false){
 const version=db.prepare('PRAGMA user_version').get().user_version;
 const app=db.prepare('PRAGMA application_id').get().application_id;
 if(version===1&&app===0x58594e32)return;
 if(app!==0)throw new Error('文件不属于支持的心屿任务库');
 if(version!==0)throw new Error('数据库版本不兼容');
 const existing=db.prepare("SELECT 1 FROM sqlite_master WHERE name='spaces'").get();
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
 if(tables.length&&(!existing||!db.prepare('PRAGMA table_info(spaces)').all().some(c=>c.name==='policy_version')))throw new Error('无法识别旧版心屿任务库，已停止迁移');
 if(existing&&path!==':memory:'){
  if(!allow)throw new Error('请先停服、备份浏览器存档，再运行 node server/xinyu/migration.mjs migrate <数据库路径>');
  backupDatabase(db,path+'.pre-agent2-'+Date.now()+'.sqlite3');
 }
 db.exec('BEGIN IMMEDIATE');
 try{
 db.exec(`CREATE TABLE command_receipts(action_id TEXT PRIMARY KEY REFERENCES actions(id) ON DELETE CASCADE, payload_hash TEXT NOT NULL);
 CREATE TABLE run_requests(run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE, request_hash TEXT NOT NULL);
 CREATE TABLE confirmation_receipts(action_id TEXT PRIMARY KEY REFERENCES actions(id) ON DELETE CASCADE, payload_hash TEXT NOT NULL);
 CREATE TABLE memory_grants(space TEXT REFERENCES spaces(id) ON DELETE CASCADE,id TEXT,digest TEXT NOT NULL,character_id TEXT NOT NULL,conversation_id TEXT NOT NULL,PRIMARY KEY(space,id));
 CREATE TABLE trace_events(seq INTEGER PRIMARY KEY,run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,kind TEXT NOT NULL,status TEXT NOT NULL,duration_ms INTEGER,tokens INTEGER,at INTEGER NOT NULL);
 CREATE INDEX trace_run ON trace_events(run_id,seq);
 CREATE TABLE documents(id TEXT PRIMARY KEY,space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,name TEXT NOT NULL,version INTEGER NOT NULL,share INTEGER NOT NULL,hash TEXT NOT NULL);
 CREATE TABLE chunks(id TEXT NOT NULL UNIQUE,doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,page INTEGER NOT NULL,heading TEXT NOT NULL,text TEXT NOT NULL);
 CREATE TABLE chunk_vectors(chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,model TEXT NOT NULL,dimension INTEGER NOT NULL,embedding BLOB NOT NULL);
 CREATE INDEX chunks_doc ON chunks(doc_id);
 CREATE VIRTUAL TABLE knowledge_fts USING fts5(terms);
 CREATE TRIGGER erase_chunk_terms BEFORE DELETE ON chunks BEGIN DELETE FROM knowledge_fts WHERE rowid=old.rowid; END;
 PRAGMA application_id=0x58594e32; PRAGMA user_version=1;`);
 db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const [op,path,dest]=process.argv.slice(2);
 if(!existsSync(path||''))throw new Error('请指定现有数据库文件');
 const db=new DatabaseSync(path,{readOnly:op==='backup'});
 try{if(op==='migrate')upgrade(db,path,true);else if(op==='backup'&&dest)backupDatabase(db,dest);else throw new Error('使用 migrate <数据库> 或 backup <数据库> <新备份路径>');}finally{db.close();}
}
