import {describe,it,expect} from 'vitest';
import {windowAperture} from '../../src/xinyu/windowGlass';

describe('the known room pane preserves foreground occlusion',()=>{
 const w=7,h=5,blue=[142,182,223,255],green=[76,110,63,255];
 function fixture(){const a=new Uint8ClampedArray(w*h*4);for(let p=0;p<w*h;p++)a.set(blue,p*4);return a;}
 it('keeps flowers, leaves and mullions opaque in front of the scenery',()=>{const a=fixture();for(const p of [0,1,7,14,33,34])a.set(green,p*4);a.set([248,236,211,255],(w*3+2)*4);const m=windowAperture(a,w,h);expect(m[(w*2+3)*4+3]).toBe(255);for(const p of [0,1,7,14,33,34,w*3+2])expect(m[p*4+3]).toBe(0);});
 it('cannot select a separate blue object behind a foreground barrier',()=>{const a=fixture();for(let y=0;y<h;y++)a.set(green,(y*w+1)*4);const m=windowAperture(a,w,h);expect(m[(w*2)*4+3]).toBe(0);expect(m[(w*2+4)*4+3]).toBe(255);});
 it('fails closed if a replacement plate no longer has the known pane',()=>{const a=fixture();a.set(green,(Math.floor(h*.45)*w+Math.floor(w*.5))*4);expect(windowAperture(a,w,h).every(v=>v===0)).toBe(true);});
});
