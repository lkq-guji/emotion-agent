// Cabinet surface at y=185; the complete lamp stays behind the girl and cat.
export const roomLamp={x:1163,y:100,width:76,height:90};

export function drawLampLight(ctx:CanvasRenderingContext2D,power:number){
 if(power<.001)return;
 ctx.save();ctx.globalCompositeOperation='source-atop';
 ctx.translate(1199,159);ctx.scale(1.25,1);
 const halo=ctx.createRadialGradient(0,0,5,0,0,176);
 halo.addColorStop(0,`rgba(255,194,104,${.44*power})`);
 halo.addColorStop(.42,`rgba(255,177,92,${.21*power})`);halo.addColorStop(1,'rgba(255,177,92,0)');
 ctx.fillStyle=halo;ctx.fillRect(-176,-176,352,352);ctx.restore();
 ctx.save();ctx.globalCompositeOperation='source-atop';ctx.translate(1118,337);ctx.scale(2.4,.42);
 const bounce=ctx.createRadialGradient(0,0,1,0,0,90);
 bounce.addColorStop(0,`rgba(255,199,120,${.36*power})`);bounce.addColorStop(1,'rgba(255,199,120,0)');
 ctx.fillStyle=bounce;ctx.fillRect(-90,-90,180,180);ctx.restore();
}

export function drawRoomLamp(ctx:CanvasRenderingContext2D,power:number){
 ctx.save();ctx.translate(1200,184);
 // Stepped silhouette and two-pixel highlights match the furniture's pixel scale.
 ctx.fillStyle='#4d3b58';ctx.fillRect(-19,-4,38,6);ctx.fillRect(-12,-8,24,4);ctx.fillRect(-3,-45,6,38);
 ctx.fillStyle='#b68978';ctx.fillRect(-15,-3,30,3);ctx.fillRect(-9,-7,18,3);ctx.fillRect(-1,-44,2,36);
 ctx.beginPath();ctx.moveTo(-19,-76);ctx.lineTo(19,-76);ctx.lineTo(19,-72);ctx.lineTo(23,-72);ctx.lineTo(23,-64);ctx.lineTo(27,-64);ctx.lineTo(27,-55);ctx.lineTo(32,-55);ctx.lineTo(32,-44);ctx.lineTo(-32,-44);ctx.lineTo(-32,-55);ctx.lineTo(-27,-55);ctx.lineTo(-27,-64);ctx.lineTo(-23,-64);ctx.lineTo(-23,-72);ctx.lineTo(-19,-72);ctx.closePath();
 ctx.fillStyle='#594158';ctx.fill();ctx.save();ctx.clip();
 const fabric=ctx.createLinearGradient(-28,0,28,0);fabric.addColorStop(0,'#b28b94');fabric.addColorStop(.45,'#e7c9ad');fabric.addColorStop(1,'#ae7a84');ctx.fillStyle=fabric;ctx.fillRect(-30,-74,60,28);
 ctx.globalAlpha=power;const lit=ctx.createLinearGradient(0,-74,0,-44);lit.addColorStop(0,'#edb56b');lit.addColorStop(1,'#ffe7aa');ctx.fillStyle=lit;ctx.fillRect(-30,-74,60,28);
 ctx.globalAlpha=.16;ctx.fillStyle='#fff3cf';ctx.fillRect(-13,-72,3,26);ctx.fillRect(8,-72,2,26);ctx.restore();
 ctx.fillStyle='#71505c';ctx.fillRect(-28,-46,56,2);
 ctx.globalAlpha=power;ctx.fillStyle='#fff0bd';ctx.fillRect(-25,-44,50,2);ctx.fillRect(-3,-42,6,3);
 ctx.restore();
}
