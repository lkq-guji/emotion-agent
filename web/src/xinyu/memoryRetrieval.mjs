const ignored=new Set(['我','你','的','了','是','在','和','也','有','想','一个','一下','帮我','可以','什么','怎么','今天','现在','喜欢','之前','记得','请','一下子']);
function terms(text) {
  const value=String(text||'').normalize('NFKC').toLowerCase();
  const words=[...new Intl.Segmenter('zh-CN',{granularity:'word'}).segment(value)].filter(s=>s.isWordLike&&!ignored.has(s.segment)).map(s=>s.segment);
  for(const part of [...words].filter(w=>/^[\p{Script=Han}]{3,}$/u.test(w)))for(let i=0;i<part.length-1;i++)words.push(part.slice(i,i+2));
  return [...new Set(words.filter(w=>w.length>1&&!ignored.has(w)))].slice(0,48);
}
/** @param {import('./domain').Memory[]} memories @param {string} query */
export function relevantMemories(memories,query,limit=5,maxChars=4000) {
  const keys=terms(query);if(!keys.length)return [];
  const ranked=memories.filter(m=>m.consented===true).map(m=>{
    const text=m.text.normalize('NFKC').toLowerCase();
    return {memory:m,score:keys.reduce((sum,k)=>sum+(text.includes(k)?Math.min(k.length,5):0),0)};
  }).filter(m=>m.score>0).sort((a,b)=>b.score-a.score||b.memory.at-a.memory.at);
  let left=maxChars;const result=[];
  for(const {memory} of ranked){if(result.length>=limit||left<=0)break;const text=memory.text.slice(0,Math.min(left,2000));result.push({...memory,text});left-=text.length;}
  return result;
}
