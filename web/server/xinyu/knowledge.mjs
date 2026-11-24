import {reciprocalRank} from './embedding.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {extname} from 'node:path';
import {AgentError} from './agent-store.mjs';

const segmenter=new Intl.Segmenter('zh',{granularity:'word'});
function words(text){
 return [...segmenter.segment(text.normalize('NFKC').toLowerCase())].filter(x=>x.isWordLike).map(x=>x.segment);
}
async function pages(name,bytes){
 if(!bytes?.length||bytes.length>10*1024*1024)throw new AgentError('文件为空或超过 10 MiB',413);
 switch(extname(name).toLowerCase()){
 case '.pdf':{
  if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw new AgentError('PDF 文件头无效',415);
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:Uint8Array.from(bytes),isEvalSupported:false,useSystemFonts:false});
  try{
   const pdf=await task.promise;
   if(pdf.numPages>200)throw new AgentError('最多支持 200 页 PDF',413);
   const result=[];let size=0;
   for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i),content=await page.getTextContent();
    const text=content.items.map(x=>x.str||'').join(' ');size+=text.length;
    if(size>2_000_000)throw new AgentError('文档文本过长',413);
    result.push(text);page.cleanup();
   }
   return result;
  }catch(e){throw e instanceof AgentError?e:new AgentError('无法解析 PDF，请检查文件或密码');}finally{await task.destroy();}
 }
 case '.md':case '.txt':{
  let value;try{value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new AgentError('请选择 UTF-8 文本文档',415);}
  if(value.includes('\0'))throw new AgentError('不支持二进制文本',415);
  return [value];
 }
 default:throw new AgentError('请选择 PDF、TXT 或 Markdown',415);
 }
}
export function createKnowledge(db,transaction,encode){
 const list=space=>db.prepare('SELECT id,name,version,share FROM documents WHERE space=? ORDER BY name,id').all(space);
 const document=(space,id)=>{const doc=db.prepare('SELECT * FROM documents WHERE space=? AND id=?').get(space,id);if(!doc)throw new AgentError('资料不存在',404);return doc;};
 function removeChunks(id){
  db.prepare('DELETE FROM chunks WHERE doc_id=?').run(id);
 }
 function remove(space,id){document(space,id);transaction(()=>{removeChunks(id);db.prepare('DELETE FROM documents WHERE space=? AND id=?').run(space,id);});}
 async function put(space,name,bytes,share,id,signal){
  if(typeof name!=='string'||!name.trim()||name.length>200||/[\\/\x00-\x1f]/.test(name))throw new AgentError('文件名无效');
  const previous=id?document(space,id):null,hash=createHash('sha256').update(bytes).digest('hex');
  const content=await pages(name,bytes),parts=[];let heading='';
  for(const [index,page] of content.entries()){
   for(const section of page.split(/(?=^#{1,6}\s)/m)){
    const match=section.match(/^#{1,6}\s+([^\n]+)/);if(match)heading=match[1].slice(0,160);
    for(let pos=0;pos<section.length;pos+=340){
     const text=section.slice(pos,pos+400).trim();
     if(text)parts.push({text,page:index+1,heading});
     if(parts.length>6000)throw new AgentError('文档分块过多',413);
     if(pos+400>=section.length)break;
    }
   }
  }
  if(!parts.length)throw new AgentError('没有可读文本，扫描件请先转为文本 PDF');
  let model=null;const vectors=[];
  if(encode){
   try{
    for(let i=0;i<parts.length;i+=16){
     const batch=await encode(parts.slice(i,i+16).map(p=>p.text));
     model=batch.model;vectors.push(...batch.vectors);
    }
   }catch{throw new AgentError('本地向量模型无法读取。请检查目录或切回关键词模式后重试；原版本仍可用。',503);}
  }
  return transaction(()=>{
   if(signal?.aborted)throw new AgentError('授权或资料已变化，请重新导入',409);
   if(previous&&(document(space,id).version!==previous.version||document(space,id).share!==previous.share))throw new AgentError('文档已被更新，请刷新',409);
   const same=previous?.hash===hash&&previous.name===name&&previous.share===Number(share)?previous:
    !id&&db.prepare('SELECT id,version FROM documents WHERE space=? AND name=? AND hash=? AND share=?').get(space,name,hash,Number(share));
   const indexed=same&&model&&db.prepare('SELECT v.model FROM chunk_vectors v JOIN chunks c ON c.id=v.chunk_id WHERE c.doc_id=? LIMIT 1').get(same.id);
   if(same&&(!model||indexed?.model===model))return {id:same.id,version:same.version,chunks:parts.length};
   id=id||same?.id||randomUUID();
   if(previous||same)removeChunks(id);
   db.prepare('INSERT INTO documents(id,space,name,version,share,hash) VALUES(?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=documents.version+1,share=excluded.share,hash=excluded.hash').run(id,space,name,Number(share),hash);
   const insert=db.prepare('INSERT INTO chunks(id,doc_id,page,heading,text) VALUES(?,?,?,?,?)'),index=db.prepare('INSERT INTO knowledge_fts(rowid,terms) VALUES(?,?)');
   const saveVector=db.prepare('INSERT INTO chunk_vectors VALUES(?,?,?,?)');
   for(const [i,p] of parts.entries()){
    const chunkId=randomUUID(),row=insert.run(chunkId,id,p.page,p.heading,p.text);
    index.run(row.lastInsertRowid,words(p.text).join(' '));
    if(model)saveVector.run(chunkId,model,vectors[i].length,new Uint8Array(vectors[i].buffer));
   }
   return {id,version:document(space,id).version,chunks:parts.length};
  });
 }
 const select='SELECT c.id,d.name,d.version,c.page,c.heading,c.text FROM chunks c JOIN documents d ON d.id=c.doc_id ';
 function search(space,query,shared=false){
  if(typeof query!=='string'||query.length>1000)throw new AgentError('查询过长');
  const tokens=[...new Set(words(query))].slice(0,32);if(!tokens.length)return [];
  return db.prepare(select+'JOIN knowledge_fts ON knowledge_fts.rowid=c.rowid WHERE d.space=? AND (?=0 OR d.share=1) AND knowledge_fts MATCH ? ORDER BY rank,c.rowid LIMIT 5').all(space,Number(shared),tokens.map(t=>'"'+t.replaceAll('"','""')+'"').join(' OR '));
 }
 async function retrieve(space,query,shared=false){
  if(typeof query!=='string'||query.length>1000)throw new AgentError('请输入最多 1000 字的查询');
  if(!encode||!query.trim())return search(space,query,shared);
  let batch;try{batch=await encode([query],true);}catch{return search(space,query,shared);}
  const vector=batch.vectors[0];
  const rows=db.prepare('SELECT c.id,v.embedding FROM chunk_vectors v JOIN chunks c ON v.chunk_id=c.id JOIN documents d ON c.doc_id=d.id WHERE d.space=? AND (?=0 OR d.share=1) AND v.model=? AND v.dimension=?').iterate(space,Number(shared),batch.model,vector.length);
  const nearest=[];
  for(const row of rows){
   const data=new DataView(row.embedding.buffer,row.embedding.byteOffset,row.embedding.byteLength);
   let score=0;for(let i=0;i<vector.length;i++)score+=data.getFloat32(i*4,true)*vector[i];
   if(score<0.5)continue;
   nearest.push({id:row.id,score});nearest.sort((a,b)=>b.score-a.score);if(nearest.length>5)nearest.pop();
  }
  const lexical=search(space,query,shared);
  return reciprocalRank(lexical.map(h=>h.id),nearest.map(h=>h.id)).map(id=>chunk(space,id));
 }
 function chunk(space,id){const row=db.prepare(select+'WHERE d.space=? AND c.id=?').get(space,id);if(!row)throw new AgentError('来源已删除或更新',404);return row;}
 function share(space,id,value){document(space,id);if(typeof value!=='boolean')throw new AgentError('请确认授权');db.prepare('UPDATE documents SET share=? WHERE space=? AND id=?').run(Number(value),space,id);}
 return {list,remove,put,search,retrieve,chunk,share};
}
