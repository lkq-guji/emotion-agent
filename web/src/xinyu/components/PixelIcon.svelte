<script lang="ts">
  let { src, size=32 }=$props<{src:string;size?:number}>();
  let canvas:HTMLCanvasElement;
  $effect(()=>{
    const image=new Image();let active=true;
    image.onload=()=>{
      if(!active||!canvas)return;
      canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;
      ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),{data,width,height}=pixels;
      const visited=new Uint8Array(width*height),queue:number[]=[];
      const visit=(p:number)=>{if(p<0||p>=visited.length||visited[p])return;visited[p]=1;const i=p*4,min=Math.min(data[i],data[i+1],data[i+2]),max=Math.max(data[i],data[i+1],data[i+2]);if(data[i+3]===0||(min>180&&max-min<85)){queue.push(p);data[i+3]=0;}};
      for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
      for(let cursor=0;cursor<queue.length;cursor++){const p=queue[cursor],x=p%width;if(x>0)visit(p-1);if(x<width-1)visit(p+1);visit(p-width);visit(p+width);}
      ctx.putImageData(pixels,0,0);
    };
    image.src=src;return()=>{active=false;image.onload=null;};
  });
</script>
<canvas class="pixel-icon" bind:this={canvas} style:width={size+'px'} style:height={size+'px'} aria-hidden="true"></canvas>
<style>.pixel-icon{display:block;flex:none;object-fit:contain;image-rendering:pixelated}</style>
