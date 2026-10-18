// Small seeded 3D value noise + fbm (no deps)
export function makeNoise(seed=1){
  const p=new Uint8Array(512);const r=mulberry(seed);
  const perm=[...Array(256).keys()];for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]];}
  for(let i=0;i<512;i++)p[i]=perm[i&255];
  const v=new Float32Array(256);for(let i=0;i<256;i++)v[i]=r()*2-1;
  const h=(x,y,z)=>v[p[p[p[x&255]+(y&255)]+(z&255)]];
  const s=t=>t*t*(3-2*t),l=(a,b,t)=>a+(b-a)*t;
  function n(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const xf=s(x-xi),yf=s(y-yi),zf=s(z-zi);
    return l(l(l(h(xi,yi,zi),h(xi+1,yi,zi),xf),l(h(xi,yi+1,zi),h(xi+1,yi+1,zi),xf),yf),
             l(l(h(xi,yi,zi+1),h(xi+1,yi,zi+1),xf),l(h(xi,yi+1,zi+1),h(xi+1,yi+1,zi+1),xf),yf),zf);}
  return (x,y,z,oct=5)=>{let a=1,f=1,t=0,m=0;for(let i=0;i<oct;i++){t+=a*n(x*f,y*f,z*f);m+=a;a*=.5;f*=2;}return t/m;};
}
export function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
