import {describe,it,expect} from 'vitest';
import {swapCellProgress} from '../../src/xinyu/pixelSwap';
import {panoramaView,panoramaLayout} from '../../src/xinyu/panoramaRoom';
import {floatingIslandOffset} from '../../src/xinyu/landscapeMotion';
describe('continuous landscape, pixel reveal and desktop panorama',()=>{
 it('every square grows monotonically to a complete background with no uncovered gaps',()=>{
  for(let y=0;y<9;y++)for(let x=0;x<20;x++){
   let last=0;for(let t=0;t<800;t+=8){const p=swapCellProgress(x,y,20,9,t);expect(p).toBeGreaterThanOrEqual(last);expect(p).toBeLessThanOrEqual(1);last=p;}
   expect(last).toBe(1);expect(swapCellProgress(x,y,20,9,0)).toBe(0);
  }
 });
 it('floating positions stay continuous across old loop boundaries without copying or resetting objects',()=>{
  for(let i=0;i<3;i++)for(const t of [0,5.999,12,59.999,120]){const a=floatingIslandOffset(t,i),b=floatingIslandOffset(t+.016,i);expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(.06);expect(Math.abs(a.x)).toBeLessThan(3.2);expect(Math.abs(a.y)).toBeLessThan(6.9);}
 });
 it('keeps one covering room camera and fixed furniture-to-subject proportions independent of dialogue',()=>{
  for(const [w,h] of [[1232,480],[1318,494],[1390,661],[1870,841],[2460,1190],[1232,790]]){const v=panoramaView(w,h),l=panoramaLayout(w,h);expect(v.x).toBeLessThanOrEqual(0);expect(v.x+2176*v.scale).toBeGreaterThanOrEqual(w-1e-6);expect(v.y).toBeLessThanOrEqual(0);expect(v.y+v.height).toBeGreaterThanOrEqual(h-1e-6);expect(v.y+(l.girl.y+24*l.girl.width/512)*v.scale).toBeGreaterThan(0);expect(l.window.x+l.window.width).toBeLessThan(l.girl.x);expect(l.window.y+l.window.height).toBeLessThan(l.cat.y+205*l.cat.width/512);expect(l.girl.width).toBe(570);expect(l.cat.width).toBe(350);expect(l.girl.y+496*l.girl.width/512).toBeCloseTo(l.desk+4,8);expect(l.cat.y+472*l.cat.width/512).toBeCloseTo(l.desk+3,8);}
 });
});
