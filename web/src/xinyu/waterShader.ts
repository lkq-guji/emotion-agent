/** Shared continuous water field. Only the precomputed water/fall matte receives it. */
export const waterShader = `
vec2 waterWarp(vec2 p,float t,float water,float fall){
  float a=sin(p.y*174.-t*2.3+sin(p.x*19.)*.8);
  float b=sin(p.y*71.+p.x*13.-t*1.1);
  vec2 drift=vec2(a*.0038+b*.0014,sin(p.x*79.+p.y*27.-t*1.6)*.0015);
  // Downward-travelling compression moves the original fall pixels continuously.
  vec2 stream=vec2(sin(p.y*91.-t*2.8+p.x*6.)*.0008,
    sin(p.y*151.-t*7.2+sin(p.x*311.)*.5)*.0026);
  return p+drift*water+stream*fall;
}
vec3 waterLight(vec3 color,vec2 p,float t,float water,float fall){
  float crest=pow(.5+.5*sin(p.y*219.-t*2.3+sin(p.x*23.)*1.6),9.);
  float broken=.35+.65*pow(.5+.5*sin(p.x*157.+sin(p.y*31.-t*.7)*2.),2.);
  float swell=sin(p.y*83.-t*1.4+p.x*19.);
  float cascade=pow(.5+.5*sin(p.y*247.-t*10.5+sin(p.x*533.)*.9),5.);
  float strands=.5+.5*sin(p.x*761.+sin(p.y*67.-t*3.1));
  color*=1.+water*(swell*.035-crest*.025)+fall*(strands*.035-.018);
  float light=water*crest*broken*.19+fall*cascade*(.10+strands*.13);
  return mix(color,vec3(.91,.97,1.),light);
}`;
