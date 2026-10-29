<script lang="ts">
 import {onMount} from 'svelte';
 const uid=$props.id();const id='xy-glass-'+uid.replace(/[^a-zA-Z0-9_-]/g,'');
 let root:HTMLSpanElement,width=$state(1),height=$state(1),map=$state(''),capable=$state(false);
 function measure(){const box=root.getBoundingClientRect(),w=Math.max(1,Math.round(box.width)),h=Math.max(1,Math.round(box.height));if(map&&w===width&&h===height)return;width=w;height=h;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)return;const image=ctx.createImageData(w,h),r=Math.min(12,w/2,h/2),edge=Math.max(4,Math.min(10,h*.14));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const px=x+.5-w/2,py=y+.5-h/2,qx=Math.abs(px)-(w/2-r),qy=Math.abs(py)-(h/2-r),ox=Math.max(0,qx),oy=Math.max(0,qy),distance=Math.hypot(ox,oy)+Math.min(Math.max(qx,qy),0)-r;let nx=0,ny=0;if(ox>0&&oy>0){const length=Math.hypot(ox,oy);nx=ox/length*Math.sign(px);ny=oy/length*Math.sign(py);}else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);const strength=Math.max(0,1-Math.abs(distance)/edge)**2,i=(y*w+x)*4;image.data[i]=128+nx*95*strength;image.data[i+1]=128+ny*95*strength;image.data[i+2]=128;image.data[i+3]=255;}
  ctx.putImageData(image,0,0);map=canvas.toDataURL();
 }
 onMount(()=>{capable=CSS.supports('backdrop-filter','url(#'+id+')');measure();const observer=new ResizeObserver(measure);observer.observe(root);return()=>observer.disconnect();});
</script>
<span bind:this={root} class="glass-surface" data-renderer={capable&&map?'svg':'frost'} aria-hidden="true">
 <svg class="glass-definition" width="0" height="0" focusable="false"><defs><filter {id} filterUnits="userSpaceOnUse" x="0" y="0" {width} {height} color-interpolation-filters="sRGB"><feImage href={map} x="0" y="0" {width} {height} preserveAspectRatio="none" result="edge-map"/><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="soft-backdrop"/><feDisplacementMap in="soft-backdrop" in2="edge-map" scale="9" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="0.35"/></filter></defs></svg>
 <span class="glass-backdrop" style:backdrop-filter={capable&&map?'url(#'+id+') saturate(1.16)':'blur(10px) saturate(1.16)'}></span>
 <span class="glass-rim"></span>
</span>
<style>
 .glass-surface{position:absolute;inset:0;border-radius:inherit;z-index:-1;pointer-events:none;overflow:hidden}.glass-definition{position:absolute;pointer-events:none}.glass-backdrop,.glass-rim{position:absolute;inset:0;border-radius:inherit;pointer-events:none}.glass-backdrop{background:linear-gradient(135deg,color-mix(in srgb,var(--xy-panel) 38%,transparent),color-mix(in srgb,var(--xy-panel) 30%,transparent));-webkit-backdrop-filter:blur(10px) saturate(1.16);backdrop-filter:blur(10px) saturate(1.16)}
 .glass-backdrop::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,color-mix(in srgb,var(--xy-panel) 32%,transparent),transparent 85%)}
 .glass-rim{box-shadow:inset 0 1px 0 #ffffff70,inset 1px 0 0 #ffffff30,inset 0 -1px 0 #2115391c;border:1px solid color-mix(in srgb,var(--xy-panel) 40%,transparent)}
</style>
