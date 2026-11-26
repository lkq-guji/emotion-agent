<script lang="ts">
 import {onMount} from 'svelte';
 import {agentJson,agentResponse} from '../agent.svelte';
 type Doc={id:string;name:string;version:number;share:number};
 type Hit={id:string;name:string;page:number;heading:string;text:string};
 let docs=$state<Doc[]>([]),hits=$state<Hit[]>([]),query=$state(''),share=$state(false),replace=$state(''),busy=$state(false),status=$state('');
 let picker:HTMLInputElement;
 const refresh=async()=>{docs=await agentJson('/documents');};
 async function perform(fn:()=>Promise<void>){busy=true;status='';try{await fn();}catch(e){status=String(e).replace(/^Error: /,'');}finally{busy=false;}}
 onMount(()=>{void perform(refresh);});
 async function upload(){
  const file=picker.files?.[0];if(!file)return;
  await perform(async()=>{
   status='正在解析并建立本地索引…';
   const path=replace?'/documents/'+replace+'/content':'/documents';
   await agentResponse(path+'?'+new URLSearchParams({name:file.name,share:String(share)}),{method:replace?'PUT':'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
   picker.value='';replace='';share=false;hits=[];await refresh();status='资料已可检索。';
  });
 }
</script>
<section class="xy-panel library"><h2>本地资料库</h2>
 <label>导入或替换资料 <select class="xy-input" bind:value={replace}><option value="">导入新资料</option>{#each docs as d}<option value={d.id}>替换 {d.name}</option>{/each}</select></label>
 <input aria-label="选择本地资料" bind:this={picker} type="file" accept=".pdf,.md,.txt"/>
 <label><input type="checkbox" bind:checked={share}/> 允许小屿发送这份资料的相关片段给模型</label>
 <button class="xy-btn" disabled={busy} onclick={upload}>建立本地索引</button>
 {#each docs as d}<div><strong>{d.name}</strong> · 第 {d.version} 版 · {d.share?'允许陪伴引用':'仅本地'}
 <button class="text-button" disabled={busy} onclick={()=>perform(async()=>{await agentJson('/documents/'+d.id,'PATCH',{share:!d.share});await refresh();})}>{d.share?'停止分享':'允许分享'}</button>
 <button class="text-button" disabled={busy} onclick={()=>perform(async()=>{if(!window.confirm('删除资料及其全部索引？'))return;await agentJson('/documents/'+d.id,'DELETE');hits=[];replace='';await refresh();})}>删除</button></div>{/each}
 <form onsubmit={e=>{e.preventDefault();void perform(async()=>{hits=await agentJson('/knowledge/search','POST',{query});status=hits.length?'':'没有找到相关段落。';});}}>
 <label>搜索资料 <input class="xy-input" bind:value={query}/></label><button class="xy-btn" disabled={busy||!query.trim()}>搜索</button></form>
 {#each hits as hit}<details><summary>{hit.name} · 第 {hit.page} 页 {hit.heading}</summary><p>{hit.text}</p></details>{/each}
 <p role="status">{status}</p>
</section>
<style>.library{display:grid;gap:.7rem;margin-block:1rem}.library>button{justify-self:start}.library form{display:flex;align-items:end;gap:.5rem}.library p{white-space:pre-wrap}</style>
