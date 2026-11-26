import {localEmbedding} from '../server/xinyu/embedding.mjs';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {getLoadablePath} from 'sqlite-vec';
import {createAgentStore} from '../server/xinyu/agent-store.mjs';

const cases=JSON.parse(readFileSync(new URL('../tests/xinyu/fixtures/knowledge-eval.json',import.meta.url)));
const local=process.env.XINYU_EVAL_MODEL_DIR;
const store=createAgentStore(':memory:',Date.now,localEmbedding(local));store.space('eval');
const db=new DatabaseSync(':memory:',{allowExtension:true});
try{
 db.loadExtension(getLoadablePath());db.enableLoadExtension(false);
 const extension=db.prepare('SELECT vec_version() v').get().v;
 let encode;
 if(local){
  const {pipeline,env}=await import('@huggingface/transformers');env.allowRemoteModels=false;
  const extractor=await pipeline('feature-extraction',local,{device:'cpu',dtype:'q8',local_files_only:true});
  encode=async text=>Float32Array.from((await extractor(text,{pooling:'cls',normalize:true})).data);
 }
 const vectors=[];
 for(const [name,body] of cases){
  await store.knowledge.put('eval',name+'.txt',Buffer.from(name+'。'+body),true);
  if(encode)vectors.push(await encode(name+'。'+body));
 }
 if(encode){
  db.exec('CREATE VIRTUAL TABLE corpus USING vec0(embedding float['+vectors[0].length+'])');
  const insert=db.prepare('INSERT INTO corpus(rowid,embedding) VALUES(?,?)');
  vectors.forEach((v,i)=>insert.run(BigInt(i+1),new Uint8Array(v.buffer)));
 }
 const scores={},failures=[];let maxDelta=0;
 for(const [target,item] of cases.entries()){
  for(const [index,query] of item.slice(2).entries()){
   const lexical=store.knowledge.search('eval',query).map(h=>cases.findIndex(d=>d[0]+'.txt'===h.name));
   const methods={fts:lexical};
   if(encode){
    const q=await encode('为这个句子生成表示以用于检索相关文章：'+query);
    const dot=v=>v.reduce((sum,x,j)=>sum+x*q[j],0);
    const exact=vectors.map((v,id)=>({id,s:dot(v)})).sort((a,b)=>b.s-a.s).map(x=>x.id);
    const native=db.prepare('SELECT rowid,distance FROM corpus WHERE embedding MATCH ? AND k=? ORDER BY distance').all(new Uint8Array(q.buffer),vectors.length).map(x=>Number(x.rowid)-1);
    if(exact[0]!==native[0])maxDelta++;
    const rr=new Map();
    for(const rank of [lexical,exact.slice(0,5)])rank.forEach((id,pos)=>rr.set(id,(rr.get(id)||0)+1/(61+pos)));
    methods.product=(await store.knowledge.retrieve('eval',query,true)).map(h=>cases.findIndex(d=>d[0]+'.txt'===h.name));
    methods.vector=exact;methods.hybrid=[...rr].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
   }
   for(const [method,rank] of Object.entries(methods)){
    for(const group of ['all',index>=3?'paraphrase':'literal']){
     const s=scores[method+'_'+group]??={n:0,hits:0,reciprocal:0};const pos=rank.indexOf(target);
     s.n++;if(pos>=0&&pos<5){s.hits++;s.reciprocal+=1/(pos+1);}
    }
    if(!rank.slice(0,5).includes(target))failures.push({method,query,expected:item[0]});
   }
  }
 }
 db.exec("CREATE VIRTUAL TABLE perf USING fts5(content)");
 db.exec('BEGIN');
 const insert=db.prepare('INSERT INTO perf(content) VALUES(?)');
 for(let i=0;i<10000;i++)insert.run('资料 '+(i%4===0?'复习':'课表')+' 班级'+(i%100));
 db.exec('COMMIT');
 const lookup=db.prepare('SELECT rowid FROM perf WHERE perf MATCH ? ORDER BY rank LIMIT 5');
 const elapsed=[];for(let i=0;i<101;i++){const start=performance.now();lookup.all('复习');if(i)elapsed.push(performance.now()-start);}
 elapsed.sort((a,b)=>a-b);
 const noAnswer=['黑曜石','犀牛','杏仁蛋糕','液氮','量子隧穿','琥珀蜻蜓'];
 const abstained=noAnswer.filter(q=>store.knowledge.search('eval',q).length===0).length;
 const productEmpty=(await Promise.all(noAnswer.map(q=>store.knowledge.retrieve('eval',q,true)))).filter(h=>!h.length).length;
 console.log(JSON.stringify({productNoAnswer:{n:noAnswer.length,emptyResults:productEmpty},ftsOnlyNoAnswer:{n:noAnswer.length,emptyResults:abstained},ftsWarm10kMs:{p50:elapsed[49],p95:elapsed[94]},platform:process.platform,node:process.version,extension,semantic:!!encode,exactNativeTop1Differences:maxDelta,scores:Object.fromEntries(Object.entries(scores).map(([key,s])=>[key,{n:s.n,recall5:s.hits/s.n,mrr5:s.reciprocal/s.n}])),failures},null,2));
}finally{db.close();store.close();}
