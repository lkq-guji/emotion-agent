<script lang="ts">
 import {prefersReducedMotion} from 'svelte/motion';
 let {id,value=$bindable(''),length,minLength=6,maxLength=12,disabled=false,status='idle',describedBy='',autocomplete='current-password',reduced=false,onedit=()=>{}}=$props<{id:string;value?:string;length?:number;minLength?:number;maxLength?:number;disabled?:boolean;status?:'idle'|'error'|'success';describedBy?:string;autocomplete?:'current-password'|'new-password';reduced?:boolean;onedit?:()=>void}>();
 let input:HTMLInputElement,root:HTMLDivElement,focused=$state(false),cursor=$state(0),draining=$state(false);const uid=$props.id();
 let limit=$derived(Math.min(12,Math.max(6,length||maxLength))),slots=$derived(length?Math.min(12,Math.max(6,length)):Math.max(6,Math.min(12,value.length))),quiet=$derived(reduced||prefersReducedMotion.current);
 let columns=$derived(slots<=8?slots:Math.ceil(slots/2));
 const digits=(raw:string)=>raw.replace(/[０-９]/g,c=>String(c.charCodeAt(0)-0xff10)).replace(/\D/g,'');
 export function focus(){input?.focus({preventScroll:true});}
 function position(){cursor=input?.selectionStart??value.length;}
 function edit(event:Event){const element=event.currentTarget as HTMLInputElement,start=element.selectionStart??element.value.length,before=digits(element.value.slice(0,start));value=digits(element.value).slice(0,limit);element.value=value;cursor=Math.min(value.length,before.length);element.setSelectionRange(cursor,cursor);onedit();}
 function choose(event:PointerEvent){if(disabled||status==='success')return;event.preventDefault();const cells=root.querySelectorAll<HTMLElement>('.code-slot');let nearest=0,distance=Infinity;cells.forEach((cell,index)=>{const box=cell.getBoundingClientRect(),d=Math.hypot(event.clientX-box.x-box.width/2,event.clientY-box.y-box.height/2);if(d<distance){distance=d;nearest=index;}});focus();cursor=Math.min(value.length,nearest);input.setSelectionRange(cursor,cursor);}
 $effect(()=>{if(status!=='error'||!value)return;const rejected=value;draining=true;const timer=setTimeout(()=>{if(status==='error'&&value===rejected){value='';cursor=0;}draining=false;},quiet?0:240);return()=>{clearTimeout(timer);draining=false;};});
</script>
<div class="code-slots" bind:this={root} data-status={status} data-quiet={quiet} data-draining={draining} data-count={value.length}>
 <div class="code-row" class:focused style:--slot-columns={columns}>
  <input bind:this={input} {id} type="password" inputmode="numeric" {autocomplete} value={value} minlength={length||minLength} maxlength={limit} pattern="[0-9]*" required {disabled} readonly={status==='success'} aria-invalid={status==='error'} aria-describedby={uid+'-count'+(describedBy?' '+describedBy:'')} oninput={edit} onselect={position} onkeyup={position} onpointerdown={choose} onfocus={()=>{focused=true;position();}} onblur={()=>focused=false}/>
  {#each Array.from({length:slots}) as _,index}<span class="code-slot" class:filled={!!value[index]} class:active={focused&&index===Math.min(cursor,slots-1)} style:--slot-index={index} aria-hidden="true"><span class="slot-fill"></span><span class="slot-dot">◆</span><span class="slot-caret"></span></span>{/each}
  <span class="code-success" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"/></svg></span>
 </div>
 <span id={uid+'-count'} class="code-count" aria-live="polite">{status==='success'?'密码已验证':length?`已输入 ${value.length} / ${length} 位`:`已输入 ${value.length} 位，支持 ${minLength}–${maxLength} 位`}</span>
</div>
<style>
 .code-slots{position:relative;display:block;max-width:100%;--slot-size:44px;--slot-gap:8px}.code-row{position:relative;display:grid;grid-template-columns:repeat(var(--slot-columns),minmax(0,1fr));gap:var(--slot-gap);width:calc(var(--slot-columns)*var(--slot-size) + (var(--slot-columns) - 1)*var(--slot-gap));max-width:100%;border-radius:9px;isolation:isolate}
 .code-row input{position:absolute;inset:0;width:100%;height:100%;min-height:0!important;padding:0!important;margin:0;opacity:0;z-index:4;border:0;outline:0;cursor:text;font-size:16px;caret-color:transparent}
 .code-slot{position:relative;display:grid;place-items:center;width:100%;height:52px;border:1px solid var(--xy-border);border-radius:7px;background:var(--xy-panel);overflow:hidden;pointer-events:none}
 .slot-fill{position:absolute;inset:0;background:var(--xy-selected);transform:scale(0);transition:transform .2s cubic-bezier(.2,0,0,1);transition-delay:calc(var(--slot-index)*10ms)}.filled .slot-fill{transform:scale(1)}.slot-dot{position:relative;font-size:10px;opacity:0;translate:0 5px;color:var(--xy-ink);transition:opacity .16s,translate .2s;transition-delay:calc(var(--slot-index)*10ms)}.filled .slot-dot{opacity:1;translate:0 0}.active{border-color:var(--xy-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--xy-accent) 24%,transparent)}.slot-caret{position:absolute;width:2px;height:20px;background:var(--xy-accent);opacity:0}.active:not(.filled) .slot-caret{opacity:1}
 .code-success{position:absolute;inset:0;display:grid;place-items:center;z-index:3;border-radius:8px;background:var(--xy-accent);color:var(--xy-panel);opacity:0;transform:scaleX(.5);transition:opacity .18s,transform .22s;pointer-events:none}.code-slots[data-status=success] .code-success{opacity:1;transform:scaleX(1)}.code-slots[data-status=error] .code-slot{border-color:#bf6c8c;background:color-mix(in srgb,var(--xy-panel) 90%,#bf6c8c)}.code-slots[data-draining=true] .slot-fill{transform:scale(0)}.code-slots[data-draining=true] .slot-dot{opacity:0;translate:0 5px}.code-count{display:block;font-size:12px;line-height:1.7;color:var(--xy-secondary);margin-top:8px}
 .code-slots[data-quiet=true] *{transition:none!important}.code-row:has(input:disabled){opacity:.65}
 @media(max-width:1250px){.code-slots{--slot-size:40px;--slot-gap:7px}}
</style>
