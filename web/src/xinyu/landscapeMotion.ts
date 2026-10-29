import {waterShader} from './waterShader';
/** One landscape pass, with continuous water confined to the original waterfall channels. */
const vertex=`attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D image;uniform float clock;
uniform vec2 islands[3];
${waterShader}
float channel(vec2 p,vec4 r){return smoothstep(r.x,r.x+.003,p.x)*(1.-smoothstep(r.x+r.z-.003,r.x+r.z,p.x))*smoothstep(r.y,r.y+.008,p.y)*(1.-smoothstep(r.y+r.w-.012,r.y+r.w,p.y));}
float weight(vec2 p,vec2 center,vec2 radius){float d=length((p-center)/radius);float a=1.-smoothstep(.35,1.,d);return a*a;}
vec2 leaf(vec2 p,vec2 center,vec2 radius,float phase){float a=weight(p,center,radius);float tip=clamp((center.y+radius.y-p.y)/(radius.y*2.),0.,1.);return vec2((sin(clock*(1.05+phase*.014)+phase)*.0018+sin(clock*.31+phase)*.00035)*tip*a,sin(clock*.73+phase)*.0005*a);}
void main(){vec2 q=uv;
q-=islands[0]*weight(uv,vec2(.111,.30),vec2(.059,.146));
q-=islands[1]*weight(uv,vec2(.735,.115),vec2(.048,.132));
q-=islands[2]*weight(uv,vec2(.927,.12),vec2(.069,.184));
q-=leaf(uv,vec2(.30,.25),vec2(.045,.14),0.);
q-=leaf(uv,vec2(.358,.19),vec2(.045,.13),1.);
q-=leaf(uv,vec2(.573,.16),vec2(.045,.13),2.);
q-=leaf(uv,vec2(.604,.24),vec2(.04,.12),3.);
q-=leaf(uv,vec2(.166,.595),vec2(.08,.15),4.);
q-=leaf(uv,vec2(.373,.75),vec2(.07,.13),5.);
q-=leaf(uv,vec2(.70,.65),vec2(.115,.15),6.);
q-=leaf(uv,vec2(.79,.265),vec2(.045,.14),7.);
float sky=(1.-smoothstep(.13,.25,uv.y))*(1.-weight(uv,vec2(.48,.17),vec2(.24,.18)));
q.x-=(sin(clock*.065)*.008+sin(clock*.021)*.003)*sky;
vec4 color=texture2D(image,clamp(q,vec2(.0001),vec2(.9999)));
float fall=max(max(channel(q,vec4(.174,.785,.039,.215)),channel(q,vec4(.741,.79,.030,.21))),max(channel(q,vec4(0.,.415,.047,.255)),channel(q,vec4(.946,.225,.019,.17))));
if(fall>.001){
  // Bright neutral water is included; warm rock and green foliage stay anchored.
  float wet=smoothstep(-.06,.04,color.b-color.r)*smoothstep(-.08,.01,color.g-color.r)*smoothstep(.18,.48,max(color.b,color.g));fall*=wet;
  vec2 stream=waterWarp(q,clock,0.,fall);color=texture2D(image,clamp(stream,vec2(.0001),vec2(.9999)));color.rgb=waterLight(color.rgb,q,clock,0.,fall);
}
gl_FragColor=color;}`;

type Engine={canvas:HTMLCanvasElement;gl:WebGLRenderingContext;program:WebGLProgram;buffer:WebGLBuffer;textures:Map<HTMLImageElement,WebGLTexture>};
let engine:Engine|undefined,failed=false,leases=0;
export function floatingIslandOffset(seconds:number,index:number){return {x:Math.sin(seconds*.29+index*1.7)*2.5+Math.sin(seconds*.071+index)*.6,y:Math.sin(seconds*.42+index*2.1)*6+Math.sin(seconds*.13+index)*.8};}
function create():Engine{
 const canvas=document.createElement('canvas');canvas.width=2172;canvas.height=724;
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,depth:false,stencil:false});if(!gl)throw new Error('No WebGL');
 const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader failed');return s;};
 const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Link failed');gl.useProgram(program);
 const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);gl.viewport(0,0,2172,724);return {canvas,gl,program,buffer,textures:new Map()};
}
export function retainIslandMotion(){leases++;return()=>{if(--leases<=0){leases=0;if(engine){const {gl}=engine;for(const texture of engine.textures.values())gl.deleteTexture(texture);gl.deleteBuffer(engine.buffer);gl.deleteProgram(engine.program);gl.getExtension('WEBGL_lose_context')?.loseContext();engine=undefined;}failed=false;}};}
export function landscapeBackend(){return engine?'single-pass':'static';}
export function drawIslandMotion(ctx:CanvasRenderingContext2D,image:HTMLImageElement,time:number,reduced:boolean){
 if(reduced||failed){ctx.drawImage(image,0,0,2172,724);return;}
 try{
  engine??=create();const {gl,program,textures}=engine;if(gl.isContextLost()){ctx.drawImage(image,0,0,2172,724);return;}
  let texture=textures.get(image);if(!texture){texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);textures.set(image,texture);}
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1f(gl.getUniformLocation(program,'clock'),time/1000);const offsets=[];for(let i=0;i<3;i++){const p=floatingIslandOffset(time/1000,i);offsets.push(p.x/1086,p.y/362);}gl.uniform2fv(gl.getUniformLocation(program,'islands[0]'),offsets);gl.drawArrays(gl.TRIANGLES,0,6);ctx.drawImage(engine.canvas,0,0,2172,724);
 }catch{failed=true;ctx.drawImage(image,0,0,2172,724);}
}
