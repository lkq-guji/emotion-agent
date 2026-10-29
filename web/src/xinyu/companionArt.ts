export function colorCompanion(image:HTMLImageElement|HTMLCanvasElement,tone:string):HTMLCanvasElement|HTMLImageElement{
  if(!['rose','cream'].includes(tone))return image;
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2;if(delta<.015||l<.17)continue;
    let h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h=(h*60+360)%360;
    if(h<245||h>295)continue;
    const saturation=delta/(1-Math.abs(2*l-1)),nextS=Math.min(tone==='cream'?.48:.52,saturation*(tone==='cream'?.65:.85)),nextH=tone==='cream'?40:330,c=(1-Math.abs(2*l-1))*nextS,x=c*(1-Math.abs((nextH/60)%2-1)),m=l-c/2;
    const rgb=nextH===40?[c,x,0]:[c,0,x];for(let j=0;j<3;j++)data[i+j]=Math.round((rgb[j]+m)*255);
  }
  ctx.putImageData(pixels,0,0);return canvas;
}
