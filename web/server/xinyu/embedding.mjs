import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {join,resolve} from 'node:path';

export function localEmbedding(directory){
 if(!directory)return null;
 const path=resolve(directory);let model;
 async function load(){
  const hash=createHash('sha256');
  for(const file of ['config.json','tokenizer.json','tokenizer_config.json','onnx/model_quantized.onnx']){
   for await(const bytes of createReadStream(join(path,file)))hash.update(bytes);
  }
  const {pipeline}=await import('@huggingface/transformers');
  const extractor=await pipeline('feature-extraction',path,{local_files_only:true,device:'cpu',dtype:'q8'});
  return {id:'bge-zh-cls-q8:'+hash.digest('hex'),extractor};
 }
 return async function encode(values,query=false){
  model??=load().catch(error=>{model=undefined;throw error;});
  const {id,extractor}=await model;
  const inputs=query?values.map(q=>'为这个句子生成表示以用于检索相关文章：'+q):values;
  const output=await extractor(inputs,{pooling:'cls',normalize:true});
  const vectors=output.tolist().map(row=>Float32Array.from(row));
  return {model:id,vectors};
 };
}

export function reciprocalRank(lexical,semantic){
 const scores=new Map();
 for(const list of [lexical,semantic])list.forEach((id,i)=>scores.set(id,(scores.get(id)||0)+1/(61+i)));
 return [...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(([id])=>id);
}
