import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.getElementById('view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.NeutralToneMapping; renderer.toneMappingExposure=1.0;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9fd8ef);
scene.fog=new THREE.Fog(0x9fd8ef,35,90);
const camera=new THREE.PerspectiveCamera(50,1,0.1,200);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- lights
scene.add(new THREE.HemisphereLight(0xfff3d6,0xd8c49a,1.35));
const sun=new THREE.DirectionalLight(0xfff1d0,2.4);
sun.position.set(12,20,8); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60}); sun.shadow.bias=-0.0005; sun.shadow.normalBias=0.02;
scene.add(sun); scene.add(sun.target);

// ---------- island height field
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
function islandR(ang){return 11+1.3*Math.sin(3*ang+1)+0.8*Math.sin(5*ang+2)+0.4*Math.sin(7*ang)}
function height(x,z){
  const d=Math.hypot(x,z)/islandR(Math.atan2(z,x));
  let h=-1.4+1.8*(1-smooth(0.82,1.18,d));           // beach shelf down into the sea
  h+=1.1*(1-smooth(0.30,0.72,d));                    // grassy hill
  h+=0.18*Math.sin(x*0.55+1)*Math.cos(z*0.47)*(1-smooth(0.55,0.85,d));
  return h;
}
const SAND=new THREE.Color(0xf3dfae), WET=new THREE.Color(0xd9bf8a), GRASS=new THREE.Color(0x7cc46a), GRASS2=new THREE.Color(0x5fae5a);
{
  const g=new THREE.PlaneGeometry(64,64,180,180); g.rotateX(-Math.PI/2);
  const p=g.attributes.position, col=new Float32Array(p.count*3), c=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), z=p.getZ(i), h=height(x,z); p.setY(i,h);
    const gN=0.5+0.5*Math.sin(x*1.3)*Math.cos(z*1.1);
    if(h>1.0) c.copy(GRASS).lerp(GRASS2,gN*0.6);
    else if(h>0.85) c.copy(SAND).lerp(GRASS,smooth(0.85,1.0,h));
    else if(h>0.08) c.copy(SAND);
    else c.copy(WET).lerp(new THREE.Color(0xc9ad78),smooth(0,-1,h));
    col.set([c.r,c.g,c.b],i*3);
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.computeVertexNormals();
  const ground=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95}));
  ground.receiveShadow=true; scene.add(ground);
}

// ---------- sea
const seaGeo=new THREE.PlaneGeometry(220,220,60,60); seaGeo.rotateX(-Math.PI/2);
const sea=new THREE.Mesh(seaGeo,new THREE.MeshStandardMaterial({color:0x3fb2c9,roughness:0.25,metalness:0.05,transparent:true,opacity:0.82}));
sea.receiveShadow=true; scene.add(sea);
const seaBase=Float32Array.from(seaGeo.attributes.position.array);
const foamPts=[]; for(let i=0;i<=128;i++){const a=i/128*Math.PI*2; let lo=5,hi=20; for(let k=0;k<20;k++){const m=(lo+hi)/2; if(height(Math.cos(a)*m,Math.sin(a)*m)>0.02) lo=m; else hi=m} foamPts.push([Math.cos(a)*lo,Math.sin(a)*lo])}
const foam=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(foamPts.map(([x,z])=>new THREE.Vector3(x,0.04,z)),true),256,0.12,6,true),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.6,transparent:true,opacity:0.8}));
foam.scale.y=0.25; scene.add(foam);

// ---------- props (soft toy-like shapes to match Kai)
const colliders=[]; // {x,z,r}
const occluders=[]; // meshes the camera should not sit behind
const std=(c,r=0.7)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
function add(m,x,z,yOff=0,occludes=true){m.position.set(x,height(x,z)+yOff,z); m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(occludes)occluders.push(o)}}); scene.add(m); return m}

const palms=[]; const coconutGeo=new THREE.SphereGeometry(0.14,16,12), coconutMat=std(0x7a5232,0.5);
const trunkM=std(0xb98b5e,0.85), leafM=std(0x4fa45a,0.6);
function palm(x,z,lean=0.3,rot=0){
  const g=new THREE.Group();
  let px=0,py=0;
  for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(0.22-i*0.012,16,12),trunkM); s.scale.y=1.5; px+=lean*0.12*i*0.35; py+=0.42; s.position.set(px,py,0); g.add(s)}
  const top=new THREE.Vector3(px,py+0.15,0);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2; const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),leafM); leaf.scale.set(1.25,0.07,0.3);
    const piv=new THREE.Group(); piv.position.copy(top); piv.rotation.y=a; leaf.position.x=1.05; leaf.rotation.z=-0.38; piv.add(leaf); g.add(piv)}
  const nuts=[];
  for(let i=0;i<3;i++){const n=new THREE.Mesh(coconutGeo,coconutMat); n.position.set(top.x+Math.cos(i*2.1)*0.16,top.y-0.18,Math.sin(i*2.1)*0.16); g.add(n); nuts.push({mesh:n,ready:true,regrow:0})}
  g.rotation.y=rot; add(g,x,z,-0.1); const col={x,z,r:0.35}; colliders.push(col);
  const stump=new THREE.Group(); const sm=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.24,0.32,16),trunkM); sm.position.y=0.1; stump.add(sm);
  const ring=new THREE.Mesh(new THREE.CircleGeometry(0.19,16),std(0xe8c48e,0.8)); ring.rotation.x=-Math.PI/2; ring.position.y=0.261; stump.add(ring);
  stump.visible=false; add(stump,x,z,-0.05,false);
  palms.push({g,x,z,rot,nuts,hits:0,need:2,shake:0,col,stump,state:'up',chops:0,fallT:0,regrow:0,grow:1});
}
const rocks=[]; // big boulders Kai can stand on
function rock(x,z,s=1){const m=new THREE.Mesh(new THREE.SphereGeometry(0.6*s,20,14),std(0x9aa3a6,0.9)); m.scale.set(1.2,0.7,1); m.rotation.y=x; add(m,x,z,0.1*s);
  rocks.push({x,z,cy:m.position.y,a:0.72*s,b:0.42*s,c:0.6*s,cos:Math.cos(x),sin:Math.sin(x)})}
function rockTop(x,z){let top=-Infinity; for(const r of rocks){const dx=x-r.x,dz=z-r.z; const lx=dx*r.cos-dz*r.sin, lz=dx*r.sin+dz*r.cos; const q=(lx/r.a)**2+(lz/r.c)**2; if(q<1) top=Math.max(top,r.cy+r.b*Math.sqrt(1-q))} return top}
function surface(x,z){return Math.max(height(x,z),rockTop(x,z))}

const bushes=[]; const berryGeo=new THREE.SphereGeometry(0.055,12,10), berryMat=new THREE.MeshStandardMaterial({color:0xd8344f,roughness:0.25});
const leafMat=std(0x4c9a4f,0.8);
function bush(x,z,s=1){const g=new THREE.Group(); const blobs=[[0,0.35,0,0.5],[0.4,0.25,0.1,0.38],[-0.35,0.25,-0.1,0.36],[0.05,0.25,0.38,0.34]];
  blobs.forEach(([a,b,c,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r*s,18,12),leafMat); m.position.set(a*s,b*s,c*s); g.add(m)});
  const berries=[]; let seed=x*12.9898+z*78.233;
  const rnd=()=>{seed=Math.sin(seed)*43758.5453; return seed-Math.floor(seed)};
  for(let i=0;i<6;i++){const [a,b,c,r]=blobs[i%blobs.length]; const th=rnd()*Math.PI*2, ph=0.25+rnd()*0.9;
    const m=new THREE.Mesh(berryGeo,berryMat); m.position.set((a+Math.cos(th)*Math.sin(ph)*r*0.98)*s,(b+Math.cos(ph)*r*0.98)*s,(c+Math.sin(th)*Math.sin(ph)*r*0.98)*s);
    g.add(m); berries.push({mesh:m,ready:true,regrow:0})}
  add(g,x,z,0,false); bushes.push({g,x,z,s,shake:0,berries})}
[[3.5,-2.5,0.4,0.6],[-4.2,-1.8,-0.5,2],[-1.5,4.6,0.5,4],[5.8,3.2,0.6,1],[-7.4,3.4,0.5,3],[1.0,-7.2,0.5,5],[7.6,-4.6,0.4,0.2]].forEach(a=>palm(...a));
[[6.4,0.2,1.1],[-6.9,-4.6,1.3],[2.8,7.6,0.8],[-2.6,-8.4,0.9],[7.9,4.6,0.9],[-8.4,0.4,1.1]].forEach(a=>rock(...a));
[[-2.2,-1.4,1],[1.6,2.6,0.8],[-5.2,1.6,0.9],[4.2,-5.4,0.8],[0.4,-3.6,0.7]].forEach(a=>bush(...a));

// the crash: a small high-wing plane nose-down on the beach, its other wing torn off nearby, plus a suitcase
{
  const cx=7.5, cz=-6.6, tx=0.66, tz=0.75;            // centre on the sand, and the shoreline direction
  const g=new THREE.Group();
  // fuselage: lathed body, nose at +x, tail at -x, painted with a blue window stripe and an orange line
  const prof=[[0,-3.3],[0.2,-3.25],[0.36,-2.9],[0.62,-2.0],[0.95,-0.9],[1.05,0],[1.05,1.3],[0.98,1.9],[0.8,2.4],[0.5,2.75],[0.2,2.9],[0,2.92]].map(([r,y])=>new THREE.Vector2(r,y));
  const fg=new THREE.LatheGeometry(prof,48); fg.rotateZ(-Math.PI/2);
  const fp=fg.attributes.position, fc=new Float32Array(fp.count*3), WHITE=new THREE.Color(0xf4f3ee), BLUE=new THREE.Color(0x2f6fb0), ORANGE=new THREE.Color(0xf08a3c), cc=new THREE.Color();
  for(let i=0;i<fp.count;i++){const y=fp.getY(i), x=fp.getX(i); cc.copy(WHITE); if(x<2.5&&y>-0.08&&y<0.14) cc.copy(BLUE); else if(x<2.5&&y>-0.3&&y<-0.2) cc.copy(ORANGE); fc.set([cc.r,cc.g,cc.b],i*3)}
  fg.setAttribute('color',new THREE.BufferAttribute(fc,3)); fg.computeVertexNormals();
  g.add(new THREE.Mesh(fg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.45})));
  const glass=std(0x2a3a48,0.15);
  for(const sz of [1,-1]) for(let i=0;i<4;i++){const w=new THREE.Mesh(new THREE.SphereGeometry(0.17,14,10),glass); w.scale.set(1.15,1,0.35); w.position.set(-1.1+i*0.62,0.42,sz*0.97); g.add(w)}
  const shield=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,12),glass); shield.scale.set(0.55,0.45,1.5); shield.position.set(1.75,0.62,0); g.add(shield);
  // propeller with a bent blade
  const hub=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.36,16),std(0xd8344f,0.4)); hub.rotation.z=-Math.PI/2; hub.position.x=3.05; g.add(hub);
  const bladeM=std(0x3b4650,0.5), tipM=std(0xffc93c,0.5);
  [[0,0],[Math.PI,0.55]].forEach(([a,bend])=>{const piv=new THREE.Group(); piv.position.x=3.0; piv.rotation.x=a+0.4; const b=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.75,0.16),bladeM); b.position.y=0.4; b.rotation.x=bend; const tp=new THREE.Mesh(new THREE.BoxGeometry(0.065,0.14,0.165),tipM); tp.position.y=0.33; b.add(tp); piv.add(b); g.add(piv)});
  // tail fin and stabilisers
  const finShape=new THREE.Shape(); finShape.moveTo(0,0); finShape.lineTo(1.1,0); finShape.lineTo(0.35,1.25); finShape.lineTo(-0.05,1.25); finShape.lineTo(0,0);
  const fin=new THREE.Mesh(new THREE.ExtrudeGeometry(finShape,{depth:0.08,bevelEnabled:false}),std(0x2f6fb0,0.45)); fin.position.set(-3.25,0.15,-0.04); g.add(fin);
  const finTip=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.16,0.1),std(0xf08a3c,0.45)); finTip.position.set(-3.1,1.32,0); g.add(finTip);
  const stab=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.06,2.0),std(0xf4f3ee,0.45)); stab.position.set(-2.95,0.2,0); g.add(stab);
  // high wing: the seaward half is still on, with a strut
  const wingM=std(0xf4f3ee,0.45);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(1.35,0.14,3.2),wingM); wing.position.set(0.7,1.18,-1.55); wing.rotation.x=-0.06; g.add(wing);
  const wtip=new THREE.Mesh(new THREE.BoxGeometry(1.36,0.15,0.3),std(0xd8344f,0.45)); wtip.position.set(0.7,1.08,-3.05); g.add(wtip);
  const stump=new THREE.Mesh(new THREE.BoxGeometry(1.35,0.14,0.5),wingM); stump.position.set(0.7,1.15,0.4); g.add(stump);
  const strut=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,1.75,8),std(0x9aa3a6,0.5)); strut.position.set(0.7,0.45,-1.55); strut.rotation.x=0.72; g.add(strut);
  // nose dug into the sand, rolled toward the sea, lying along the shore
  g.rotation.set(-0.1,-Math.atan2(tz,tx),-0.07,'YZX');
  add(g,cx,cz,0.72);
  for(let s=-2.6;s<=2.61;s+=1.3) colliders.push({x:cx+tx*s,z:cz+tz*s,r:s<-2?0.6:1.0});
  // the torn-off wing half, lying further along the beach
  const loose=new THREE.Group(); const lw=new THREE.Mesh(new THREE.BoxGeometry(3.0,0.14,1.35),wingM); loose.add(lw);
  const lt=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.15,1.36),std(0xd8344f,0.45)); lt.position.x=1.5; loose.add(lt);
  loose.rotation.set(0.1,-0.4,0.08); add(loose,4.6,-9.4,0.05); colliders.push({x:4.6,z:-9.4,r:1.0},{x:5.9,z:-10.0,r:0.7},{x:3.3,z:-8.8,r:0.7});
  const case_=new THREE.Group(); const cb=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.45,0.25),std(0xd66b4f,0.6)); case_.add(cb);
  const h=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.025,8,16,Math.PI),std(0x333333,0.4)); h.position.y=0.22; case_.add(h); case_.rotation.set(0,0.6,1.35);
  add(case_,5.7,-4.9,0.15); colliders.push({x:5.7,z:-4.9,r:0.4});
}

// ---------- things Kai can pick up: sticks, small rocks, shells, fallen coconuts
const stickMat=std(0x9a6a3e,0.8), pebbleMats=[std(0x8c9396,0.75),std(0xa7a49c,0.75),std(0x737c80,0.75)], shellMats=[std(0xffe1c6,0.45),std(0xff9e7d,0.45),std(0xf7c6d9,0.45)];
function makeStick(){const g=new THREE.Group(); const c=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.03,0.6,8),stickMat); g.add(c);
  const tw=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.016,0.16,6),stickMat); tw.position.set(0.04,0.12,0); tw.rotation.z=-0.7; g.add(tw); return g}
function makePebble(i=0){const m=new THREE.Mesh(new THREE.SphereGeometry(0.085,12,9),pebbleMats[i%3]); m.scale.set(1.25,0.7,1); return m}
function makeShell(i=0){const g=new THREE.Group(); const m=new THREE.Mesh(new THREE.SphereGeometry(0.1,14,8,0,Math.PI*2,0,Math.PI/2),shellMats[i%3]); m.scale.set(1,0.55,0.85); g.add(m);
  for(let k=-2;k<=2;k++){const r=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.17,4),shellMats[(i+1)%3]); r.rotation.set(Math.PI/2,0,k*0.28); r.position.y=0.03; g.add(r)} return g}
const woodMat=std(0xc8935f,0.8), woodEnd=std(0xe8c48e,0.8), leafItemMat=std(0x5fae5a,0.6), clayMat=std(0xc7775a,0.85);
function makeWood(){const g=new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34,0.08,0.11),woodMat));
  for(const sx of [1,-1]){const e=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.07,0.1),woodEnd); e.position.x=0.17*sx; g.add(e)} return g}
function makeLeaf(){const g=new THREE.Group(); const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),leafItemMat); m.scale.set(0.36,0.02,0.1); g.add(m);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.78,5),std(0x8a6a3a,0.8)); st.rotation.z=Math.PI/2; st.position.y=0.014; g.add(st); return g}
function makeClay(){const m=new THREE.Mesh(new THREE.SphereGeometry(0.075,14,10),clayMat); m.scale.set(1.2,0.75,1); return m}
const ITEM_R={berry:0.055,coconut:0.12,pebble:0.045,shell:0.01,wood:0.04,leaf:0.02,clay:0.055};
function makeItemMesh(id,i=0){switch(id){case 'berry':return new THREE.Mesh(berryGeo,berryMat); case 'coconut':return new THREE.Mesh(coconutGeo,coconutMat);
  case 'pebble':return makePebble(i); case 'shell':return makeShell(i); case 'wood':return makeWood(); case 'leaf':return makeLeaf(); default:return makeClay()}}
// throw an item into the air; it lands, bounces once and becomes something to pick up
function toss(id,x,y,z,vx,vz,vy=1.2,i=0){const m=makeItemMesh(id,i); m.traverse(o=>{if(o.isMesh)o.castShadow=true}); m.position.set(x,y,z); scene.add(m);
  falling.push({m,id,r:ITEM_R[id]??0.05,vx,vz,vy,bounces:0,spin:id!=='leaf'&&id!=='wood'})}
const pickups=[]; // {id, obj, x, z, active, respawn, keep}
function placePickup(id,obj,x,z,{keep=true,yaw=0,y=null}={}){obj.rotation.y=yaw; obj.position.set(x,(y??surface(x,z)),z); obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}}); scene.add(obj);
  const p={id,obj,x,z,active:true,respawn:0,keep}; pickups.push(p); return p}
// sticks lie near the palms
palms.forEach((p,i)=>{const a=i*1.9+0.5, d=1.1; const x=p.x+Math.cos(a)*d, z=p.z+Math.sin(a)*d; const s=makeStick(); s.rotation.z=Math.PI/2; const g=new THREE.Group(); g.add(s); s.position.y=0.03; placePickup('stick',g,x,z,{yaw:a})});
// small rocks scattered on the sand and grass
[[4.0,-3.6],[6.9,-2.2],[-3.4,-5.6],[-6.0,-2.9],[2.4,5.6],[-0.8,7.2],[-7.8,1.9],[8.4,1.9],[0.6,-5.2],[-4.6,5.8]].forEach(([x,z],i)=>{const m=makePebble(i); m.position.y=0.04; const g=new THREE.Group(); g.add(m); placePickup('pebble',g,x,z,{yaw:i*1.3})});
// shells along the shoreline
for(let i=0;i<14;i++){const a=i*2.39, r=islandR(a)*0.9; const x=Math.cos(a)*r,z=Math.sin(a)*r; const g=new THREE.Group(); const s=makeShell(i); s.position.y=0.01; g.add(s); placePickup('shell',g,x,z,{yaw:a})}

// ---------- items, icons, recipes
const ITEMS={
  berry:{name:'Berries',max:30,verb:'Eat',food:15},
  stick:{name:'Stick',max:5,tool:true},
  pebble:{name:'Rock',max:30},
  shell:{name:'Shell',max:30},
  coconut:{name:'Coconut',max:10},
  cwater:{name:'Coconut water',max:10,verb:'Drink',water:35},
  sharp:{name:'Sharp stone',max:10},
  axe:{name:'Ax',max:1,tool:true},
  shovel:{name:'Shovel',max:1,tool:true},
  wood:{name:'Wood',max:30},
  leaf:{name:'Palm leaf',max:30},
  string:{name:'String',max:30},
  clay:{name:'Clay',max:30},
  bug:{name:'Bug',max:10,note:'Kai would rather keep the bug than eat it'},
  box:{name:'Box',max:5,place:true},
  bed:{name:'Bed',max:2,place:true},
};
const ICONS={
  berry:`<svg viewBox="0 0 32 32"><circle cx="11" cy="20" r="7" fill="#d8344f"/><circle cx="21" cy="21" r="7" fill="#c42b46"/><circle cx="16" cy="12" r="7" fill="#e04a63"/><circle cx="13.5" cy="9.5" r="2" fill="#ff9fb1"/><path d="M16 5c2-3 6-3 8-2-2 2-5 3-8 2z" fill="#5fae5a"/></svg>`,
  stick:`<svg viewBox="0 0 32 32"><path d="M6 27L26 5" stroke="#9a6a3e" stroke-width="4.5" stroke-linecap="round"/><path d="M16 16l6 2" stroke="#9a6a3e" stroke-width="3" stroke-linecap="round"/><circle cx="25" cy="7" r="2.5" fill="#5fae5a"/></svg>`,
  pebble:`<svg viewBox="0 0 32 32"><path d="M5 20c0-6 6-10 12-10s10 4 10 9-5 7-11 7S5 25 5 20z" fill="#8c9396"/><path d="M10 15c2-2 5-3 8-3" stroke="#c3c9cb" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>`,
  shell:`<svg viewBox="0 0 32 32"><path d="M16 27L5 14c3-6 8-9 11-9s8 3 11 9z" fill="#ffc9a8"/><path d="M16 27V7M16 27L9 10M16 27L23 10M16 27L5.5 15M16 27l10.5-12" stroke="#ff8f6b" stroke-width="1.6" fill="none"/></svg>`,
  coconut:`<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="11" fill="#7a5232"/><circle cx="12.5" cy="12" r="1.8" fill="#3d2816"/><circle cx="17" cy="11" r="1.8" fill="#3d2816"/><circle cx="14.5" cy="15.5" r="1.8" fill="#3d2816"/><path d="M8 20c2 4 7 6 12 4" stroke="#9b6d47" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  cwater:`<svg viewBox="0 0 32 32"><path d="M5 15h22c0 7-5 12-11 12S5 22 5 15z" fill="#7a5232"/><ellipse cx="16" cy="15" rx="11" ry="3.5" fill="#f5f2e6"/><ellipse cx="16" cy="15" rx="8" ry="2.2" fill="#bfe8f2"/><path d="M19 15L25 3" stroke="#ff6b8a" stroke-width="2.5" stroke-linecap="round"/></svg>`,
};
ICONS.sharp=`<svg viewBox="0 0 32 32"><path d="M7 26L13 5l13 17z" fill="#8c9396"/><path d="M13 5l13 17-9-2z" fill="#b9c0c3"/><path d="M7 26l10-6 9 2z" fill="#6b7477"/></svg>`;
ICONS.axe=`<svg viewBox="0 0 32 32"><path d="M8 28L22 6" stroke="#9a6a3e" stroke-width="4" stroke-linecap="round"/><path d="M15 6c5-3 11-1 13 3-4 0-7 2-9 6z" fill="#8c9396"/><path d="M15 6c3 0 6 1 7 4" stroke="#c3c9cb" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M17 13l4 2" stroke="#d9c08a" stroke-width="3" stroke-linecap="round"/></svg>`;
ICONS.shovel=`<svg viewBox="0 0 32 32"><path d="M6 26L19 13" stroke="#9a6a3e" stroke-width="4" stroke-linecap="round"/><path d="M17 11c3-5 8-7 11-6 1 3-1 8-6 11z" fill="#8c9396"/><path d="M19 11c2-2 4-3 6-4" stroke="#c3c9cb" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;
ICONS.wood=`<svg viewBox="0 0 32 32"><rect x="4" y="16" width="24" height="8" rx="2" fill="#c8935f"/><rect x="6" y="8" width="22" height="8" rx="2" fill="#b07a4a"/><path d="M8 20h14M10 12h12" stroke="#e8c48e" stroke-width="1.6" stroke-linecap="round"/></svg>`;
ICONS.leaf=`<svg viewBox="0 0 32 32"><path d="M4 28C10 16 18 8 28 4" stroke="#8a6a3a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M8 22l-4-6M11 18l-3-7M15 14l-1-8M19 11l1-7M23 8l3-4M10 22l6 1M13 18l7 1M17 14l7 0M21 11l6-1" stroke="#5fae5a" stroke-width="3.2" stroke-linecap="round"/></svg>`;
ICONS.string=`<svg viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="10" ry="9" fill="none" stroke="#d9c08a" stroke-width="3"/><ellipse cx="16" cy="16" rx="5.5" ry="5" fill="none" stroke="#c4a86a" stroke-width="3"/><path d="M25 19c2 3 3 6 1 9" stroke="#d9c08a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
ICONS.clay=`<svg viewBox="0 0 32 32"><path d="M5 21c0-6 5-10 11-10 7 0 11 4 11 9 0 5-5 7-11 7S5 26 5 21z" fill="#c7775a"/><path d="M10 16c2-2 5-3 8-3" stroke="#e2a184" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>`;
ICONS.bug=`<svg viewBox="0 0 32 32"><path d="M9 13l-4-3M9 18H4M10 23l-4 3M23 13l4-3M23 18h5M22 23l4 3" stroke="#222" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="9" r="4" fill="#222"/><ellipse cx="16" cy="19" rx="8" ry="9" fill="#d8344f"/><path d="M16 10v18" stroke="#222" stroke-width="1.5"/><circle cx="12.5" cy="17" r="1.8" fill="#222"/><circle cx="19.5" cy="17" r="1.8" fill="#222"/><circle cx="13" cy="23" r="1.5" fill="#222"/><circle cx="19" cy="23" r="1.5" fill="#222"/></svg>`;
ICONS.box=`<svg viewBox="0 0 32 32"><rect x="4" y="10" width="24" height="18" rx="2" fill="#c8935f"/><rect x="3" y="6" width="26" height="6" rx="2" fill="#a8754a"/><path d="M5 17h22M5 23h22" stroke="#a8754a" stroke-width="1.6"/><rect x="14" y="10" width="4" height="5" rx="1" fill="#6b7477"/></svg>`;
ICONS.bed=`<svg viewBox="0 0 32 32"><rect x="3" y="9" width="4" height="17" rx="1.5" fill="#a8754a"/><rect x="5" y="18" width="24" height="6" rx="1.5" fill="#c8935f"/><rect x="7" y="14" width="22" height="5" rx="2.5" fill="#6fbf5f"/><ellipse cx="11" cy="13" rx="4" ry="2.2" fill="#a6d98f"/><rect x="26" y="20" width="3" height="6" fill="#a8754a"/></svg>`;

// ---------- Kai
const kai=new THREE.Group(); scene.add(kai);
const rig={}; let ready=false;
const heldStick=makeStick(); heldStick.visible=false;
const heldBerry=new THREE.Mesh(berryGeo,berryMat); heldBerry.scale.setScalar(1.1); heldBerry.visible=false;
const heldNut=new THREE.Group(); {const half=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,10,0,Math.PI*2,Math.PI/2,Math.PI/2),coconutMat); half.material=coconutMat; heldNut.add(half);
  const top=new THREE.Mesh(new THREE.CircleGeometry(0.1,20),std(0xf5f2e6,0.5)); top.rotation.x=-Math.PI/2; heldNut.add(top);
  const juice=new THREE.Mesh(new THREE.CircleGeometry(0.075,20),std(0xbfe8f2,0.2)); juice.rotation.x=-Math.PI/2; juice.position.y=0.002; heldNut.add(juice);
  const straw=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.18,8),std(0xff6b8a,0.4)); straw.position.set(0.03,0.07,0); straw.rotation.z=-0.35; heldNut.add(straw);
  heldNut.traverse(o=>{if(o.material)o.material.side=THREE.DoubleSide})} heldNut.visible=false;
function makeAxe(){const g=new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.024,0.52,8),stickMat));
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8),pebbleMats[2]); head.scale.set(0.45,0.9,1.5); head.position.set(0,0.2,0.07); g.add(head);
  const tie=new THREE.Mesh(new THREE.TorusGeometry(0.028,0.01,6,12),std(0xd9c08a,0.9)); tie.rotation.x=Math.PI/2; tie.position.y=0.2; g.add(tie); return g}
function makeShovel(){const g=new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.024,0.52,8),stickMat));
  const blade=new THREE.Mesh(new THREE.SphereGeometry(0.1,14,10),pebbleMats[0]); blade.scale.set(0.8,1.25,0.22); blade.position.y=0.33; g.add(blade);
  const tie=new THREE.Mesh(new THREE.TorusGeometry(0.026,0.01,6,12),std(0xd9c08a,0.9)); tie.rotation.x=Math.PI/2; tie.position.y=0.22; g.add(tie); return g}
const heldAxe=makeAxe(), heldShovel=makeShovel(); heldAxe.visible=heldShovel.visible=false;
const face={}; let mood='ok';
new GLTFLoader().load('models/Kai_v2.glb',gl=>{
  const model=gl.scene; model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  kai.add(model); kai.updateMatrixWorld(true);
  const byName=n=>model.getObjectByName(n);
  const mk=(name,x,y,parts)=>{const p=new THREE.Group(); p.position.set(x,y,0); model.add(p); p.updateMatrixWorld(true);
    parts.forEach(n=>{const o=byName(n); if(o) p.attach(o)}); rig[name]=p};
  for(const [s,sx] of [['L',1],['R',-1]]){
    mk('leg'+s,0.073*sx,0.33,['leg','sock','shoe','sole','shorts_leg','shorts_cuff'].map(n=>n+'_'+s));
    mk('arm'+s,0.16*sx,0.60,['arm','hand','sleeve'].map(n=>n+'_'+s));
  }
  const upper=new THREE.Group(); model.add(upper);
  model.children.slice().forEach(o=>{if(o!==upper && !/^leg/.test(Object.keys(rig).find(k=>rig[k]===o)||'')) upper.attach(o)});
  rig.upper=upper; rig.model=model;
  // the stick sits in his right fist, pointing forward
  heldStick.position.set(-0.045,-0.235,0.13); heldStick.rotation.x=Math.PI/2-0.25; rig.armR.add(heldStick);
  heldStick.traverse(o=>{if(o.isMesh)o.castShadow=true});
  for(const tl of [heldAxe,heldShovel]){tl.position.copy(heldStick.position); tl.rotation.copy(heldStick.rotation); rig.armR.add(tl); tl.traverse(o=>{if(o.isMesh)o.castShadow=true})}
  // snacks that show in his fist while he eats or drinks
  heldBerry.position.set(-0.045,-0.255,0.035); rig.armR.add(heldBerry);
  heldNut.position.set(-0.05,-0.27,0.05); heldNut.rotation.x=-0.4; rig.armR.add(heldNut);
  // face: his own skin material for the head so we can blush it, plus a frown and sad brows to swap in
  face.head=byName('head'); face.skin=face.head.material; face.headMat=face.skin.clone(); face.head.material=face.headMat;
  face.base=face.skin.color.clone();
  face.mouth=byName('mouth'); face.brows=[byName('brow_L'),byName('brow_R')]; face.blush=[byName('blush_L'),byName('blush_R')].filter(Boolean);
  face.blushMat=face.blush[0]?.material.clone(); face.blush.forEach(b=>b.material=face.blushMat); face.blushBase=face.blushMat?.color.clone();
  const H=0.85, a=[...Array(11)].map((_,i)=>-0.8+i*0.16);
  const frownPts=a.map(v=>new THREE.Vector3(0.026*Math.sin(v),H-0.085-0.012*(1-Math.cos(v)),0.207-0.008*Math.abs(Math.sin(v))));
  face.frown=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(frownPts),16,0.0045,8,false),face.mouth.material);
  face.frown.visible=false; face.mouth.parent.add(face.frown);
  face.sadBrows=[1,-1].map(sx=>{const b=new THREE.Mesh(new THREE.CapsuleGeometry(0.009,0.045,4,8),face.brows[0].material); b.rotation.set(0,sx*0.4,Math.PI/2+sx*0.38*-1);
    b.position.set(0.088*sx,H+0.036,0.212); b.visible=false; face.mouth.parent.add(b); return b});
  // closed eyes for sleeping: little curves where the eyes are
  face.eyes=['eye_L','eye_R','eye_glint_L','eye_glint_R'].map(byName).filter(Boolean);
  face.closed=['eye_L','eye_R'].map(byName).filter(Boolean).map(e=>{e.updateMatrix(); e.geometry.computeBoundingBox();
    const bb=e.geometry.boundingBox.clone().applyMatrix4(e.matrix), c=bb.getCenter(new THREE.Vector3());
    const pts=[...Array(9)].map((_,i)=>{const v=-1.1+i*0.275; return new THREE.Vector3(c.x+0.028*Math.sin(v),c.y-0.012*Math.cos(v),bb.max.z-0.006)});
    const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,0.0045,6,false),face.mouth.material); m.visible=false; upper.add(m); return m});
  // the head (with hair, face and everything on it) turns on a neck pivot so Kai can look down
  const headPiv=new THREE.Group(); headPiv.position.set(0,0.68,0); upper.add(headPiv); headPiv.updateMatrixWorld(true);
  upper.children.slice().forEach(o=>{ if(o===headPiv||o===rig.armL||o===rig.armR||/^(tee|shorts|neck|collar)/.test(o.name)) return; headPiv.attach(o)});
  rig.head=headPiv;
  ready=true; onKaiReady();
},undefined,e=>{document.getElementById('startMsg').textContent='Kai could not load. Close the game and open it again.'});
const blob=new THREE.Mesh(new THREE.CircleGeometry(0.28,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.18,depthWrite:false}));
blob.rotation.x=-Math.PI/2; scene.add(blob);

// ---------- inventory
const SLOTS=8; const inv=Array.from({length:SLOTS},()=>null); let sel=0;
let food=75, water=70;
const hotbar=document.getElementById('hotbar');
const selName=document.getElementById('selName');
function countOf(id){return inv.reduce((a,s)=>a+(s&&s.id===id?s.count:0),0)}
function canAdd(id){return inv.some(s=>!s||(s.id===id&&s.count<ITEMS[id].max))}
// put n of an item into a list of slots (pockets or a box); returns how many did not fit
function fitInto(arr,id,n){
  for(const s of arr){ if(n&&s&&s.id===id&&s.count<ITEMS[id].max){const k=Math.min(n,ITEMS[id].max-s.count); s.count+=k; n-=k} }
  while(n>0){const i=arr.findIndex(s=>!s); if(i<0) break; const k=Math.min(n,ITEMS[id].max); arr[i]={id,count:k}; n-=k}
  return n}
function addItem(id,n=1){ n=fitInto(inv,id,n); renderInv(); bumpItem(id); if(n>0) toast('Your pockets are full'); return n===0 }
function takeFromSlot(i,n=1){const s=inv[i]; if(!s) return null; s.count-=n; const id=s.id; if(s.count<=0) inv[i]=null; renderInv(); return id}
function takeItem(id,n=1){for(let i=inv.length-1;i>=0&&n>0;i--){const s=inv[i]; if(s&&s.id===id){const k=Math.min(n,s.count); s.count-=k; n-=k; if(!s.count) inv[i]=null}} renderInv()}
const held=()=>inv[sel]?.id||null;
// the action button picks the right tool by itself, so Kai just takes it out of his pocket
function equip(id){const i=inv.findIndex(s=>s&&s.id===id); if(i>=0&&i!==sel){sel=i; renderInv()} return i>=0}
function slotHTML(s){return s?ICONS[s.id]+(s.count>1?`<span class="count">${s.count}</span>`:''):''}
function slotLabel(s){return s?`${ITEMS[s.id].name}, ${s.count}`:'Empty'}
function buildSlots(){
  hotbar.innerHTML='';
  for(let i=0;i<SLOTS;i++){const b=document.createElement('button'); b.type='button'; b.className='slot'; b.dataset.i=i;
    b.addEventListener('click',()=>tapSlot(i)); hotbar.appendChild(b)}
}
function renderInv(){
  hotbar.querySelectorAll('.slot').forEach((b,i)=>{const s=inv[i]; b.innerHTML=slotHTML(s); b.classList.toggle('sel',!!(i===sel&&s&&ITEMS[s.id].tool));
    b.classList.toggle('food',!!(s&&ITEMS[s.id].verb)); b.setAttribute('aria-label',`${slotLabel(s)}${s&&ITEMS[s.id].verb?', tap to '+ITEMS[s.id].verb.toLowerCase():''}`)});
  const h=held(); heldStick.visible=h==='stick'; heldAxe.visible=h==='axe'; heldShovel.visible=h==='shovel';
  renderMake(); renderStore();
}
function bumpItem(id){const i=inv.findIndex(s=>s&&s.id===id); const b=hotbar.querySelectorAll('.slot')[i]; if(!b) return; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump')}
let selNameTimer=0;
function showName(text){selName.textContent=text; selName.style.opacity=1; clearTimeout(selNameTimer); selNameTimer=setTimeout(()=>selName.style.opacity=0,1800)}
// tapping a pocket does the obvious thing: eat or drink it, put a box or bed down, or hold a tool
function tapSlot(i){
  if(!started||sleep) return;
  const s=inv[i]; if(!s){showName('Empty pocket'); return}
  const it=ITEMS[s.id];
  if(it.verb) return eatSlot(i);
  if(it.place) return place(s.id,i);
  if(it.tool){ sel=i; renderInv(); showName(`Kai is holding the ${it.name.toLowerCase()}`); return }
  if(it.note){ toast(it.note); return }
  showName(`${it.name}: tap Make to use it`);
}
function toast(text){const el=document.createElement('div'); el.className='toast'; el.textContent=text; document.body.appendChild(el); setTimeout(()=>el.remove(),1600)}
const meters={food:[document.getElementById('foodFill'),document.getElementById('foodMeter')],water:[document.getElementById('waterFill'),document.getElementById('waterMeter')]};
let shown={food:-1,water:-1};
function renderMeters(){for(const k of ['food','water']){const v=Math.floor(k==='food'?food:water); if(v===shown[k]) continue; shown[k]=v; const [f,m]=meters[k]; f.style.width=v+'%'; m.setAttribute('aria-valuenow',v)}}

// ---------- eat / drink
let eating=false, eatT=0, eatingItem=null;
function eatSlot(i){
  const id=inv[i]?.id; if(!id||eating) return; const it=ITEMS[id];
  if(it.food&&food>=99){toast('Kai is full'); return}
  if(it.water&&water>=99){toast('Kai is not thirsty'); return}
  takeFromSlot(i); eating=true; eatT=0; eatingItem=id;
  setTimeout(()=>{ if(it.food){food=Math.min(100,food+it.food); toast('Yum!')} if(it.water){water=Math.min(100,water+it.water); toast('Ahh, refreshing!')} renderMeters(); saveSoon()},450);
}
function eatSomething(){ // keyboard F: eat whatever food Kai has
  const i=inv.findIndex(s=>s&&ITEMS[s.id].verb&&((ITEMS[s.id].food&&food<99)||(ITEMS[s.id].water&&water<99)));
  if(i<0){toast('Nothing to eat or drink'); return} eatSlot(i)}

// ---------- making things: one tap per recipe, no grid
const MAKE=[
  {out:'cwater',n:1,need:{coconut:1,pebble:1}},
  {out:'axe',n:1,need:{pebble:2,stick:1}},
  {out:'shovel',n:1,need:{pebble:1,stick:1}},
  {out:'box',n:1,need:{wood:4}},
  {out:'bed',n:1,need:{leaf:3,wood:3}},
  {out:'string',n:2,need:{leaf:1}},
];
const craftEl=document.getElementById('craft'), makeList=document.getElementById('makeList');
let crafting=false;
const canMake=r=>Object.entries(r.need).every(([k,n])=>countOf(k)>=n);
function renderMake(){ if(!crafting) return;
  makeList.querySelectorAll('.recipe').forEach((b,i)=>{const r=MAKE[i], ok=canMake(r); b.classList.toggle('ready',ok); b.setAttribute('aria-disabled',String(!ok));
    b.querySelectorAll('.need').forEach(el=>{const k=el.dataset.k, n=r.need[k], have=countOf(k); el.classList.toggle('have',have>=n); el.querySelector('.n').textContent=`${Math.min(have,n)}/${n}`})});
}
function buildMake(){
  makeList.innerHTML=MAKE.map(r=>`<button type="button" class="recipe"><span class="out">${ICONS[r.out]}${r.n>1?`<span class="count">${r.n}</span>`:''}</span><span class="rname">${ITEMS[r.out].name}</span>
    <span class="needs">${Object.entries(r.need).map(([k,n])=>`<span class="need" data-k="${k}">${ICONS[k]}<span class="n">0/${n}</span></span>`).join('')}</span></button>`).join('');
  makeList.querySelectorAll('.recipe').forEach((b,i)=>b.addEventListener('click',()=>{const r=MAKE[i];
    if(!canMake(r)){const miss=Object.entries(r.need).filter(([k,n])=>countOf(k)<n).map(([k,n])=>`${n-countOf(k)} more ${ITEMS[k].name.toLowerCase()}`); toast(`You need ${miss.join(' and ')}`); return}
    // check there is room first, counting the pockets the ingredients free up
    const trial=inv.map(s=>s&&{...s}); Object.entries(r.need).forEach(([k,n])=>{for(let j=trial.length-1;j>=0&&n>0;j--){const s=trial[j]; if(s&&s.id===k){const q=Math.min(n,s.count); s.count-=q; n-=q; if(!s.count) trial[j]=null}}});
    if(fitInto(trial,r.out,r.n)>0){toast('Your pockets are full'); return}
    Object.entries(r.need).forEach(([k,n])=>takeItem(k,n));
    fitInto(inv,r.out,r.n); renderInv(); bumpItem(r.out);
    b.classList.remove('made'); void b.offsetWidth; b.classList.add('made');
    toast(`You made ${r.n>1?r.n+' ':'a '}${ITEMS[r.out].name.toLowerCase()}!`); saveSoon()}));
}
function toggleCraft(open=!crafting){
  if(open&&(!started||sleep||storeOpen)) return;
  crafting=open; craftEl.hidden=!open; keys.clear(); stickEnd(); renderMake();
}
document.getElementById('makeBtn').addEventListener('click',()=>toggleCraft(true));
document.getElementById('craftClose').addEventListener('click',()=>toggleCraft(false));
craftEl.addEventListener('click',e=>{if(e.target===craftEl) toggleCraft(false)});
// a placed box keeps 12 slots of its own; tap to move a whole stack across
const storeEl=document.getElementById('store'), boxGridEl=document.getElementById('boxGrid'), storePocket=document.getElementById('storePocket');
let storeOpen=null;
function openStore(box){ storeOpen=box; storeEl.hidden=false; keys.clear(); stickEnd(); renderStore() }
function closeStore(){ storeOpen=null; storeEl.hidden=true; saveSoon() }
function moveStack(from,i,to,where){ const s=from[i]; if(!s) return; const left=fitInto(to,s.id,s.count); if(left===s.count){toast(where==='box'?'The box is full':'Your pockets are full'); return}
  if(left>0) s.count=left; else from[i]=null; renderInv() }
function renderStore(){ if(!storeOpen) return;
  const mk=(arr,i,onClick)=>{const b=document.createElement('button'); b.type='button'; b.className='slot'; const st=arr[i]; b.innerHTML=slotHTML(st); b.setAttribute('aria-label',slotLabel(st)); b.addEventListener('click',onClick); return b};
  boxGridEl.replaceChildren(...storeOpen.slots.map((_,i)=>mk(storeOpen.slots,i,()=>moveStack(storeOpen.slots,i,inv,'pocket'))));
  storePocket.replaceChildren(...inv.map((_,i)=>mk(inv,i,()=>moveStack(inv,i,storeOpen.slots,'box'))));
}
document.getElementById('storeClose').addEventListener('click',closeStore);
storeEl.addEventListener('click',e=>{if(e.target===storeEl) closeStore()});

// ---------- input: keyboard still works, but touch comes first
const keys=new Set();
let actionQueued=false, jumpQueued=false;
addEventListener('keydown',e=>{
  if(!started) return;
  if(storeOpen){ if((e.code==='Escape'||e.code==='KeyE')&&!e.repeat) closeStore(); return }
  if(sleep) return;
  if(e.code==='KeyC'||(e.code==='Escape'&&crafting)){ if(!e.repeat) toggleCraft(); e.preventDefault(); return }
  if(crafting) return;
  keys.add(e.code); if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if(e.repeat) return;
  if(e.code==='KeyE') actionQueued=true;
  if(e.code==='KeyF') eatSomething();
  const m=/^Digit([1-8])$/.exec(e.code); if(m) tapSlot(+m[1]-1);
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
let camYaw=2.45, camPitch=0.4, dragging=null, camDist=5.0;
// left half of the screen: a joystick appears wherever the thumb lands. Right half: drag to look around.
const stick={x:0,y:0,id:null,cx:0,cy:0}; const stickEl=document.getElementById('stick'), knob=document.getElementById('knob');
const STICK_MAX=56;
function stickMove(e){let dx=e.clientX-stick.cx, dy=e.clientY-stick.cy; const m=Math.hypot(dx,dy); if(m>STICK_MAX){dx*=STICK_MAX/m;dy*=STICK_MAX/m}
  stick.x=dx/STICK_MAX; stick.y=dy/STICK_MAX; knob.style.transform=`translate(${dx}px,${dy}px)`}
function stickEnd(){stick.id=null; stick.x=stick.y=0; knob.style.transform=''; stickEl.classList.remove('active'); stickEl.style.left=stickEl.style.top=''}
canvas.addEventListener('pointerdown',e=>{
  if(!started) return; e.preventDefault();
  if(e.pointerType!=='mouse'&&e.clientX<innerWidth*0.5&&stick.id===null){
    stick.id=e.pointerId; stick.cx=e.clientX; stick.cy=e.clientY; stickEl.classList.add('active');
    stickEl.style.left=e.clientX+'px'; stickEl.style.top=e.clientY+'px'; stickMove(e); canvas.setPointerCapture(e.pointerId); return }
  if(!dragging){dragging={id:e.pointerId,x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId)}
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId===stick.id) return stickMove(e);
  if(!dragging||dragging.id!==e.pointerId) return;
  const k=e.pointerType==='mouse'?1:1.3;
  camYaw-=(e.clientX-dragging.x)*0.006*k; camPitch=Math.min(1.1,Math.max(0.15,camPitch+(e.clientY-dragging.y)*0.004*k)); dragging.x=e.clientX; dragging.y=e.clientY});
const pointerEnd=e=>{ if(e.pointerId===stick.id) stickEnd(); if(dragging&&dragging.id===e.pointerId) dragging=null };
canvas.addEventListener('pointerup',pointerEnd); canvas.addEventListener('pointercancel',pointerEnd);
canvas.addEventListener('wheel',e=>{camDist=Math.min(9,Math.max(2.5,camDist+e.deltaY*0.003))},{passive:true});
const press=(el,fn)=>el.addEventListener('pointerdown',e=>{e.preventDefault(); if(started) fn(); el.classList.add('down'); setTimeout(()=>el.classList.remove('down'),150)});
const actBtn=document.getElementById('actBtn'), jumpBtn=document.getElementById('jumpBtn');
press(jumpBtn,()=>jumpQueued=true); press(actBtn,()=>actionQueued=true);
const HAND=`<svg viewBox="0 0 32 32"><path d="M10 17V8a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 6-4 10-9 10-4 0-6-2-8-5l-4-6a2 2 0 0 1 3-3z" fill="#fff8ea" opacity=".85"/></svg>`;
function setActBtn(act){
  const on=!!(act&&act.short); actBtn.classList.toggle('idle',!on);
  actBtn.innerHTML=on?`${ICONS[act.icon]||HAND}<span>${act.short}</span>`:HAND;
  actBtn.setAttribute('aria-label',on?act.label:'Nothing to do here');
}
// no zooming, scrolling or text selection on the tablet
for(const ev of ['gesturestart','gesturechange','dblclick','contextmenu']) document.addEventListener(ev,e=>e.preventDefault());
document.addEventListener('touchmove',e=>{if(!e.target.closest('.craftPanel')) e.preventDefault()},{passive:false});

// ---------- actions in the world
const promptEl=document.getElementById('prompt'), promptText=document.getElementById('promptText');
let reach=0, swingT=-1, swingTarget=null; const flying=[], falling=[];
function flyToKai(obj,onArrive){flying.push({obj,from:obj.position.clone(),t:0,onArrive})}
function pickBerry(b){const br=b.berries.find(x=>x.ready); if(!br) return; if(!canAdd('berry')){toast('Your pockets are full'); return}
  br.ready=false; br.regrow=40; br.mesh.visible=false; b.shake=Math.max(b.shake,0.6); reach=0.35;
  const m=new THREE.Mesh(berryGeo,berryMat); br.mesh.getWorldPosition(m.position); scene.add(m); flyToKai(m,()=>{addItem('berry'); toast('+1 berry')})}
function grab(p){ if(!canAdd(p.id)){toast('Your pockets are full'); return}
  p.active=false; reach=0.35; const obj=p.obj; const copy=obj.clone(); scene.add(copy); obj.visible=false;
  if(p.keep) p.respawn=90; else {scene.remove(obj); pickups.splice(pickups.indexOf(p),1)}
  flyToKai(copy,()=>{addItem(p.id); toast(`+1 ${ITEMS[p.id].name.toLowerCase()}`)})}
// swing whatever tool is in hand: stick (whack palms, smack bushes), ax (chop palms and logs), shovel (dig sand)
let swingTool=null;
function startSwing(kind){ if(swingT>=0) return; swingT=0; swingTool=held(); swingTarget=kind==='dig'?{kind:'dig',...digSpot()}:swingTargetNear(swingTool) }
function swingTargetNear(tool){
  let best=null, bd=1e9;
  for(const p of palms){ if(p.state!=='up') continue; const d=Math.hypot(pos.x-p.x,pos.z-p.z); if(d<1.45&&d<bd){bd=d;best={kind:'palm',p,x:p.x,z:p.z}}}
  if(best) return best;
  if(tool==='axe') for(const l of logs){const c=logPoint(l), d=Math.hypot(pos.x-c.x,pos.z-c.z); if(d<1.0&&d<bd){bd=d;best={kind:'log',l,x:c.x,z:c.z}}}
  if(best) return best;
  for(const b of bushes){const d=Math.hypot(pos.x-b.x,pos.z-b.z); if(d<0.75*b.s+0.75&&d<bd){bd=d;best={kind:'bush',b,x:b.x,z:b.z}}}
  return best;
}
function onSwingHit(target){
  if(!target){ return }
  if(target.kind==='palm') return swingTool==='axe'?onChopHit(target.p):onWhackHit(target.p);
  if(target.kind==='log') return chopLog(target.l);
  if(target.kind==='dig') return isSand(target.x,target.z)?dig(target.x,target.z):toast('Too hard to dig here. Try the sand');
  const b=target.b; b.shake=1;
  const ready=b.berries.filter(x=>x.ready); if(!ready.length){toast('No berries left on this bush'); return}
  const n=Math.min(ready.length,1+Math.floor(Math.random()*2));
  for(let i=0;i<n;i++){const br=ready[i]; br.ready=false; br.regrow=40; br.mesh.visible=false;
    const m=new THREE.Mesh(berryGeo,berryMat); m.castShadow=true; br.mesh.getWorldPosition(m.position); scene.add(m);
    const a=Math.random()*Math.PI*2; falling.push({m,id:'berry',r:0.055,vx:Math.cos(a)*1.1,vz:Math.sin(a)*1.1,vy:1.2,bounces:0})}
  toast(n>1?'Berries fell off!':'A berry fell off!');
}
// ---- whacking a palm with a stick: every 2nd whack knocks a coconut down
function onWhackHit(p){
  p.shake=1; const ready=p.nuts.filter(n=>n.ready); if(!ready.length){toast('No coconuts up there right now'); return}
  p.hits++; if(p.hits<p.need){toast('Whack!'); return}
  p.hits=0; const n=ready[0]; n.ready=false; n.regrow=30; n.mesh.visible=false;
  const w=new THREE.Vector3(); n.mesh.getWorldPosition(w); const dx=pos.x-p.x, dz=pos.z-p.z, d=Math.hypot(dx,dz)||1;
  toss('coconut',w.x,w.y,w.z,dx/d*0.9+(Math.random()-0.5)*0.4,dz/d*0.9+(Math.random()-0.5)*0.4,0.5); toast('A coconut fell!');
}
// ---- chopping palms with the ax: 4 chops and it falls away from Kai
function onChopHit(p){
  p.shake=1; p.chops++;
  if(p.chops<4){toast(['Chop!','Chop chop!','Almost!'][p.chops-1]); return}
  p.chops=0; p.state='falling'; p.fallT=0; p.col.off=true;
  const dx=p.x-pos.x, dz=p.z-pos.z, d=Math.hypot(dx,dz)||1; p.fdx=dx/d; p.fdz=dz/d;
  toast('Timber!');
}
const qFall=new THREE.Quaternion(), qBase=new THREE.Quaternion(), fallAxis=new THREE.Vector3(), eul=new THREE.Euler();
function landPalm(p){
  p.state='down'; p.regrow=150; p.g.visible=false; p.stump.visible=true;
  spawnLog(p.x+p.fdx*1.45,p.z+p.fdz*1.45,p.fdx,p.fdz);
  const px=-p.fdz, pz=p.fdx;                                       // sideways from the fall line
  for(let i=0;i<3;i++){const s=2.9+Math.random()*0.4, o=(i-1)*0.7; const x=p.x+p.fdx*s+px*o, z=p.z+p.fdz*s+pz*o; toss('leaf',x,height(x,z)+0.5,z,(Math.random()-0.5)*0.4,(Math.random()-0.5)*0.4,0.6)}
  p.nuts.forEach((n,i)=>{ if(!n.ready) return; n.ready=false; n.mesh.visible=false; n.regrow=1e9;
    const x=p.x+p.fdx*2.6+px*(i-1)*0.4, z=p.z+p.fdz*2.6+pz*(i-1)*0.4; toss('coconut',x,height(x,z)+0.6,z,p.fdx*0.8+(Math.random()-0.5),p.fdz*0.8+(Math.random()-0.5),1.0)});
}
// ---- logs lie where a palm fell; 2 chops split one into wood
const logs=[]; const barkMat=std(0x9a6a3e,0.85);
function spawnLog(x,z,dx,dz){
  const g=new THREE.Group(); const m=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.22,1.8,16),barkMat); m.rotation.z=Math.PI/2; g.add(m);
  for(const sx of [1,-1]){const e=new THREE.Mesh(new THREE.CircleGeometry(0.2,16),woodEnd); e.position.x=0.902*sx; e.rotation.y=sx*Math.PI/2; g.add(e)}
  g.rotation.y=-Math.atan2(dz,dx); g.position.set(x,height(x,z)+0.19,z); g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}}); scene.add(g);
  const cols=[-0.55,0,0.55].map(s=>({x:x+dx*s,z:z+dz*s,r:0.18})); colliders.push(...cols);
  logs.push({g,x,z,dx,dz,hits:0,cols,shake:0});
}
function logPoint(l){const s=Math.max(-0.9,Math.min(0.9,(pos.x-l.x)*l.dx+(pos.z-l.z)*l.dz)); return {x:l.x+l.dx*s,z:l.z+l.dz*s}}
function chopLog(l){
  l.shake=1; l.hits++;
  if(l.hits<2){toast('Chop!'); return}
  scene.remove(l.g); l.cols.forEach(c=>c.off=true); logs.splice(logs.indexOf(l),1);
  for(let i=0;i<4;i++){const s=-0.7+i*0.47; toss('wood',l.x+l.dx*s,l.g.position.y+0.15,l.z+l.dz*s,(Math.random()-0.5)*0.8,(Math.random()-0.5)*0.8,1.6)}
  toast('Chopped into wood!');
}
// ---- digging in the sand with the shovel
const holes=[];
function digSpot(){return {x:pos.x+Math.sin(facing)*0.45,z:pos.z+Math.cos(facing)*0.45}}
function isSand(x,z){const h=height(x,z); return h>0.05&&h<0.88&&rockTop(x,z)<h+0.02}
function dig(x,z){
  const h=height(x,z);
  const m=new THREE.Mesh(new THREE.CircleGeometry(0.17,18),new THREE.MeshBasicMaterial({color:0x9c7a4c,transparent:true,opacity:0.6,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(x,h+0.015,z); scene.add(m); holes.push({m,t:40});
  const r=Math.random(); const found=r<0.2?'pebble':r<0.4?'shell':r<0.58?'clay':r<0.7?'bug':null;
  if(!found){toast('Just sand'); return}
  if(found==='bug'){spawnBug(x,z,Math.floor(Math.random()*bugColors.length)); toast('A bug crawled out!'); return}
  const a=Math.random()*Math.PI*2; toss(found,x,h+0.1,z,Math.cos(a)*0.5,Math.sin(a)*0.5,2.0,Math.floor(Math.random()*3));
  toast(found==='clay'?'Found some clay!':`Found a ${ITEMS[found].name.toLowerCase()}!`);
}
// ---- little bugs that wander around; walk up and press E to catch one
const bugs=[]; const bugColors=[[0xd8344f,0x222222],[0x3fa34d,0x1d4a24],[0x3a7bd5,0x1b2f55],[0xf2a531,0x5a3a10]];
const bugLegM=std(0x222222,0.6);
function makeBug(kind){const [c,dot]=bugColors[kind]; const g=new THREE.Group();
  const shell=new THREE.Mesh(new THREE.SphereGeometry(0.05,14,10,0,Math.PI*2,0,Math.PI/2),std(c,0.3)); shell.scale.set(0.85,0.8,1.15); shell.position.y=0.016; g.add(shell);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.022,10,8),std(0x222222,0.5)); head.position.set(0,0.02,0.055); g.add(head);
  for(const [x,z] of [[0.017,0.012],[-0.017,0.012],[0.02,-0.022],[-0.02,-0.022]]){const d=new THREE.Mesh(new THREE.SphereGeometry(0.008,8,6),std(dot,0.5)); d.position.set(x,0.05,z); g.add(d)}
  const legs=[]; for(const sx of [1,-1]) for(let k=0;k<3;k++){const l=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.045,4),bugLegM); l.rotation.z=sx*1.15; l.position.set(sx*0.045,0.012,-0.028+k*0.028); g.add(l); legs.push(l)}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true}); g.userData.legs=legs; return g}
function spawnBug(x,z,kind){const g=makeBug(kind); scene.add(g); bugs.push({g,x,z,dir:Math.random()*Math.PI*2,t:0,pause:false,flee:false})}
function freeSpot(x,z,room){return !colliders.some(c=>!c.off&&Math.hypot(x-c.x,z-c.z)<c.r+room)}
function randomLand(){for(let k=0;k<60;k++){const a=Math.random()*Math.PI*2, r=1+Math.random()*8.5, x=Math.cos(a)*r, z=Math.sin(a)*r; if(height(x,z)>0.15&&rockTop(x,z)<-1e3&&freeSpot(x,z,0.3)) return [x,z]} return [0,0]}
const BUG_COUNT=6; let bugSpawnT=0;
for(let i=0;i<BUG_COUNT;i++){const [x,z]=randomLand(); spawnBug(x,z,i%bugColors.length)}
function catchBug(b){ if(!canAdd('bug')){toast('Your pockets are full'); return}
  bugs.splice(bugs.indexOf(b),1); reach=0.35; flyToKai(b.g,()=>{addItem('bug'); toast('Caught a bug!')})}
// ---- putting a box or bed down
const placed=[];
function makeBox(){const g=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.36,0.42),woodMat); body.position.y=0.18; g.add(body);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.08,0.46),std(0xa8754a,0.8)); lid.position.y=0.39; g.add(lid);
  for(const y of [0.1,0.25]){const band=new THREE.Mesh(new THREE.BoxGeometry(0.53,0.025,0.43),std(0xa8754a,0.8)); band.position.y=y; g.add(band)}
  const latch=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.09,0.03),pebbleMats[2]); latch.position.set(0,0.34,0.225); g.add(latch); return g}
function makeBed(){const g=new THREE.Group(); const frame=new THREE.Mesh(new THREE.BoxGeometry(0.64,0.16,1.15),woodMat); frame.position.y=0.08; g.add(frame);
  const mat=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.07,1.04),std(0x6fbf5f,0.7)); mat.position.y=0.195; g.add(mat);
  for(const x of [-0.18,0,0.18]){const st=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.075,1.0),std(0x4c9a4f,0.7)); st.position.set(x,0.2,0); g.add(st)}
  const pillow=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),std(0xa6d98f,0.7)); pillow.scale.set(0.22,0.06,0.12); pillow.position.set(0,0.25,-0.36); g.add(pillow);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.64,0.34,0.06),std(0xa8754a,0.8)); head.position.set(0,0.22,-0.575); g.add(head); return g}
function spotFree(x,z){const h=height(x,z);
  return !(h<0.05||rockTop(x,z)>h-0.2||!freeSpot(x,z,0.45)||placed.some(o=>Math.hypot(x-o.x,z-o.z)<1.0)||bushes.some(b=>Math.hypot(x-b.x,z-b.z)<0.75*b.s+0.45)||pickups.some(p=>p.active&&Math.hypot(x-p.x,z-p.z)<0.3))}
function placeAt(kind,x,z,yaw,slots){
  const h=height(x,z); const g=kind==='box'?makeBox():makeBed();
  g.rotation.y=yaw; g.position.set(x,h,z); g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}}); scene.add(g);
  const ax=Math.sin(yaw), az=Math.cos(yaw);
  const cols=kind==='box'?[{x,z,r:0.3}]:[{x:x+ax*0.3,z:z+az*0.3,r:0.32},{x:x-ax*0.3,z:z-az*0.3,r:0.32}]; colliders.push(...cols);
  const o={kind,g,x,z,y:h,yaw,cols,slots:kind==='box'?Array.from({length:12},(_,i)=>slots?.[i]&&ITEMS[slots[i].id]?{...slots[i]}:null):null};
  placed.push(o); return o}
// tap a box or bed in the pockets: it goes down in front of Kai, or the nearest clear spot around him
function place(id,slotI=sel){
  for(const off of [0,0.7,-0.7,1.4,-1.4,2.1,-2.1,Math.PI]) for(const d of [0.95,1.4]){
    const a=facing+off, x=pos.x+Math.sin(a)*d, z=pos.z+Math.cos(a)*d;
    if(!spotFree(x,z)) continue;
    placeAt(id,x,z,id==='box'?a+Math.PI:a+Math.PI/2); takeFromSlot(slotI);
    toast(id==='box'?'Box put down. Walk up and tap Open':'Bed put down. Walk up and tap Sleep'); saveSoon(); return }
  toast('No room here. Try an open bit of sand');
}
// ---- sleeping: lie down for a moment, the screen dims, then Kai gets back up
let sleep=null; const sleepFade=document.getElementById('sleepFade');
function startSleep(bed){ sleep={t:0,bed,zz:0}; keys.clear(); stickEnd(); speed=0; toast('Zzz...') }

// what can Kai do right here? Picks the right tool by itself.
function findAction(){
  let best=null, bd=1e9; const has=id=>countOf(id)>0;
  for(const p of pickups){ if(!p.active) continue; const d=Math.hypot(pos.x-p.x,pos.z-p.z); if(d<1.0&&d<bd&&Math.abs(pos.y-p.obj.position.y)<0.8){bd=d;best={kind:'grab',p,label:`Pick up the ${ITEMS[p.id].name.toLowerCase()}`,short:'Grab',icon:p.id}} }
  if(best) return best;
  for(const b of bugs){ const d=Math.hypot(pos.x-b.x,pos.z-b.z); if(d<1.0&&d<bd){bd=d;best={kind:'bug',b,label:'Catch the bug',short:'Catch',icon:'bug'}} }
  if(best) return best;
  for(const o of placed){ const d=Math.hypot(pos.x-o.x,pos.z-o.z); if(d<(o.kind==='bed'?1.2:1.05)&&d<bd){bd=d;best=o.kind==='box'?{kind:'open',o,label:'Open the box',short:'Open',icon:'box'}:{kind:'sleep',o,label:'Sleep in the bed',short:'Sleep',icon:'bed'}} }
  if(best) return best;
  let nearPalm=null;
  for(const p of palms){ if(p.state!=='up') continue; const d=Math.hypot(pos.x-p.x,pos.z-p.z); if(d<1.45&&d<bd){bd=d;nearPalm=p} }
  if(nearPalm){
    if(has('axe')) return {kind:'swing',tool:'axe',label:'Chop the palm down',short:'Chop',icon:'axe'};
    if(has('stick')) return {kind:'swing',tool:'stick',label:nearPalm.nuts.some(n=>n.ready)?'Whack the palm for a coconut':'Whack the palm',short:'Whack',icon:'stick'};
  }
  if(has('axe')) for(const l of logs){const c=logPoint(l), d=Math.hypot(pos.x-c.x,pos.z-c.z); if(d<1.0) return {kind:'swing',tool:'axe',label:'Chop the log into wood',short:'Chop',icon:'axe'}}
  bd=1e9;
  for(const b of bushes){ const d=Math.hypot(pos.x-b.x,pos.z-b.z); if(d<1.15*b.s+0.45&&b.berries.some(x=>x.ready)&&d<bd){bd=d;best={kind:'berry',b,label:'Pick berries',short:'Pick',icon:'berry'}} }
  if(best) return best;
  if(has('shovel')){ const sp=digSpot(); if(isSand(sp.x,sp.z)) return {kind:'dig',tool:'shovel',label:'Dig in the sand',short:'Dig',icon:'shovel'} }
  if(nearPalm) return {kind:'hint',label:'Find a stick, then whack the palm',short:null};
  return null;
}

// ---------- player state
const pos=new THREE.Vector3(4.6,0,-5.6); pos.y=height(pos.x,pos.z);
let vy=0, grounded=true, facing=-0.69, speed=0, phase=0;
const camTarget=new THREE.Vector3(); const camPos=new THREE.Vector3(); const camDir=new THREE.Vector3(); const ray=new THREE.Raycaster();

// ---------- how Kai feels: fine, low (sad, red, no running) or empty (green, hunched, slow)
const RED=new THREE.Color(0xf0705f), GREEN=new THREE.Color(0x9cc77a), BLUSH_RED=new THREE.Color(0xe8344a);
const foodLabel=document.getElementById('foodLabel'), waterLabel=document.getElementById('waterLabel');
let moodBlend=0, greenBlend=0;
function updateMood(dt){
  const need=Math.min(food,water);
  const next=need<=0?'empty':need<25?'low':'ok';
  if(next!==mood){
    if(next==='low'&&mood==='ok') toast(food<water?'Kai is getting hungry':'Kai is getting thirsty');
    if(next==='empty') toast(food<=0?'Kai is starving!':'Kai is parched!');
    if(next==='ok'&&mood!=='ok') toast('Kai feels better');
    mood=next;
  }
  foodLabel.setAttribute('class',food<25?'low':''); waterLabel.setAttribute('class',water<25?'low':'');
  if(!face.head) return;
  moodBlend+=((mood==='ok'?0:1)-moodBlend)*Math.min(1,dt*3);
  greenBlend+=((mood==='empty'?1:0)-greenBlend)*Math.min(1,dt*2);
  const sad=mood!=='ok';
  face.mouth.visible=!sad; face.frown.visible=sad;
  face.brows.forEach(b=>b.visible=!sad); face.sadBrows.forEach(b=>b.visible=sad);
  face.headMat.color.copy(face.base).lerp(RED,moodBlend*0.35*(1-greenBlend)).lerp(GREEN,greenBlend*0.7);
  face.skin.color.copy(face.base).lerp(GREEN,greenBlend*0.7);
  if(face.blushMat){face.blushMat.color.copy(face.blushBase).lerp(BLUSH_RED,moodBlend*(1-greenBlend))}
}

function resize(){const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=w/h<1.2?62:50; camera.updateProjectionMatrix()}
addEventListener('resize',resize); resize();

// ---------- saving: pockets, food, water and anything put down are kept on the tablet
const SAVE_KEY='upgrade-island-save-v1'; let noSave=false, saveT=0;
function saveGame(){ if(noSave||!started) return; try{ localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,inv,food,water,placed:placed.map(o=>({kind:o.kind,x:o.x,z:o.z,yaw:o.yaw,slots:o.slots}))})) }catch(e){} }
function saveSoon(){ saveT=0.5 }
function loadGame(){ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(!s||s.v!==1) return false;
    s.inv.forEach((x,i)=>{ if(i<SLOTS) inv[i]=x&&ITEMS[x.id]?{id:x.id,count:Math.min(x.count,ITEMS[x.id].max)}:null });
    food=Math.max(30,+s.food||0); water=Math.max(30,+s.water||0);   // coming back is never a bad start
    (s.placed||[]).forEach(o=>{ if(o.kind==='box'||o.kind==='bed') placeAt(o.kind,o.x,o.z,o.yaw,o.slots) });
    return true }catch(e){ return false } }
setInterval(saveGame,5000);
addEventListener('visibilitychange',()=>{ if(document.hidden) saveGame() });
addEventListener('pagehide',saveGame);
const hadSave=loadGame();

// ---------- start screen
let started=false;
const startEl=document.getElementById('start'), playBtn=document.getElementById('playBtn'), newBtn=document.getElementById('newBtn');
function onKaiReady(){ startEl.classList.add('ready'); playBtn.disabled=false; playBtn.textContent=hadSave?'Keep playing':'Play'; newBtn.hidden=!hadSave }
playBtn.addEventListener('click',()=>{
  const standalone=matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches||navigator.standalone;
  const de=document.documentElement;
  if(!standalone&&matchMedia('(pointer:coarse)').matches&&de.requestFullscreen) de.requestFullscreen({navigationUI:'hide'}).then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{});
  else screen.orientation?.lock?.('landscape')?.catch?.(()=>{});
  startEl.hidden=true; started=true; clock.getDelta();
  toast(hadSave?'Welcome back!':'Walk over things to pick them up');
});
newBtn.addEventListener('click',()=>{ noSave=true; try{localStorage.removeItem(SAVE_KEY)}catch(e){} location.reload() });

buildSlots(); buildMake(); renderInv(); renderMeters(); setActBtn(null);

const clock=new THREE.Clock(); let lastPrompt='';
function tick(){
  const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  const sp=seaGeo.attributes.position;
  for(let i=0;i<sp.count;i++){const x=seaBase[i*3],z=seaBase[i*3+2]; sp.setY(i,reduced?0:0.06*Math.sin(x*0.35+t*1.2)+0.05*Math.cos(z*0.4+t*0.9))}
  sp.needsUpdate=true; seaGeo.computeVertexNormals();
  foam.material.opacity=0.55+0.25*Math.sin(t*1.5);

  // movement input relative to camera (frozen while the crafting menu is open)
  let ix=0,iz=0;
  if(started&&!crafting&&!storeOpen&&!sleep){
    if(keys.has('KeyW')||keys.has('ArrowUp')) iz-=1; if(keys.has('KeyS')||keys.has('ArrowDown')) iz+=1;
    if(keys.has('KeyA')||keys.has('ArrowLeft')) ix-=1; if(keys.has('KeyD')||keys.has('ArrowRight')) ix+=1;
    ix+=stick.x; iz+=stick.y;
  }
  const mag=Math.min(1,Math.hypot(ix,iz)); const run=keys.has('ShiftLeft')||keys.has('ShiftRight')||Math.hypot(stick.x,stick.y)>0.95;
  const canRun=mood==='ok', walk=mood==='empty'?1.4:2.8;
  const target=mag>0.1&&swingT<0?(run&&canRun?5.2:walk)*mag:0;
  speed+=(target-speed)*Math.min(1,dt*10);
  if(mag>0.1&&swingT<0){
    const fx=-Math.sin(camYaw), fz=-Math.cos(camYaw);
    const dx=fx*(-iz)+(-fz)*ix, dz=fz*(-iz)+fx*ix;
    let d=Math.atan2(dx,dz)-facing; d=Math.atan2(Math.sin(d),Math.cos(d)); facing+=d*Math.min(1,dt*12);
    // the camera drifts back behind Kai while he walks forward, so nobody has to steer it
    if(!dragging){const fwd=Math.max(0,-iz)/mag; let c=(facing+Math.PI)-camYaw; c=Math.atan2(Math.sin(c),Math.cos(c)); camYaw+=c*Math.min(1,dt*1.1*fwd)}
  }
  if(swingTarget&&swingT>=0){ let d=Math.atan2(swingTarget.x-pos.x,swingTarget.z-pos.z)-facing; d=Math.atan2(Math.sin(d),Math.cos(d)); facing+=d*Math.min(1,dt*14) }
  let px=pos.x+Math.sin(facing)*speed*dt, pz=pos.z+Math.cos(facing)*speed*dt;
  for(const c of colliders){if(c.off) continue; const dx=px-c.x,dz=pz-c.z,d=Math.hypot(dx,dz),m=c.r+0.25; if(d<m&&d>1e-4){px=c.x+dx/d*m;pz=c.z+dz/d*m}}
  if(height(px,pz)<-0.45){px=pos.x;pz=pos.z}
  const maxRise=grounded?speed*dt*0.75+0.01:0.03;
  const blocked=(x,z)=>surface(x,z)>pos.y+maxRise;
  if(blocked(px,pz)){ if(!blocked(px,pos.z)) pz=pos.z; else if(!blocked(pos.x,pz)) px=pos.x; else {px=pos.x;pz=pos.z} }
  pos.x=px; pos.z=pz;
  const gy=Math.max(surface(pos.x,pos.z),-0.45);
  if((keys.has('Space')||jumpQueued)&&grounded&&!eating&&!crafting&&!storeOpen&&!sleep){vy=5.6;grounded=false} jumpQueued=false;
  if(sleep){ // lie on the bed, head on the pillow
    const b=sleep.bed, ax=Math.sin(b.yaw), az=Math.cos(b.yaw); sleep.t+=dt;
    pos.set(b.x+ax*0.55,b.y+0.33,b.z+az*0.55); facing=b.yaw; vy=0; grounded=true; speed=0;
    sleepFade.style.opacity=String(0.55*Math.min(1,sleep.t/0.6,Math.max(0,(3.8-sleep.t)/0.6)));
    if(sleep.t>1.9&&!sleep.zz){sleep.zz=1; toast('Zzz...')}
    if(sleep.t>3.8){ const sx=az, sz=-ax; pos.set(b.x+sx*0.85,0,b.z+sz*0.85); pos.y=surface(pos.x,pos.z); facing=Math.atan2(sx,sz); sleep=null; sleepFade.style.opacity='0'; toast('Kai feels rested') }
  }
  if(grounded&&vy<=0&&pos.y-gy<0.22){pos.y=gy;vy=0}
  else{vy-=14*dt; pos.y+=vy*dt; if(pos.y<=gy){pos.y=gy;vy=0;grounded=true} else grounded=false}

  // bushes rustle and regrow
  for(const b of bushes){const d=Math.hypot(pos.x-b.x,pos.z-b.z);
    if(d<0.75*b.s+0.2&&speed>0.4&&pos.y-height(b.x,b.z)<0.9*b.s) b.shake=Math.min(1,b.shake+dt*5);
    b.shake=Math.max(0,b.shake-dt*1.6);
    const k=reduced?0:b.shake; b.g.rotation.z=Math.sin(t*23+b.x)*0.09*k; b.g.rotation.x=Math.cos(t*19+b.z)*0.07*k; b.g.scale.setScalar(1+Math.sin(t*30)*0.03*k);
    for(const br of b.berries){ if(!br.ready){ br.regrow-=dt; if(br.regrow<=0){br.ready=true;br.mesh.visible=true;br.mesh.scale.setScalar(0.01)} } else if(br.mesh.scale.x<1) br.mesh.scale.setScalar(Math.min(1,br.mesh.scale.x+dt*2)) }
  }
  // palms sway when whacked, coconuts regrow
  for(const p of palms){
    if(p.state==='falling'){ p.fallT+=dt; const k=Math.min(1,p.fallT/1.2); fallAxis.set(p.fdz,0,-p.fdx);
      p.g.quaternion.copy(qFall.setFromAxisAngle(fallAxis,(Math.PI/2-0.12)*k*k)).multiply(qBase.setFromEuler(eul.set(0,p.rot,0))); if(k>=1) landPalm(p); continue }
    if(p.state==='down'){ p.regrow-=dt; if(p.regrow<=0){ p.state='up'; p.grow=0.05; p.g.visible=true; p.g.rotation.set(0,p.rot,0); p.g.scale.setScalar(0.05); p.stump.visible=false; p.col.off=false;
        p.nuts.forEach(n=>{n.ready=true;n.mesh.visible=true;n.mesh.scale.setScalar(1)}) } continue }
    if(p.grow<1){ p.grow=Math.min(1,p.grow+dt*0.25); p.g.scale.setScalar(p.grow) }
    p.shake=Math.max(0,p.shake-dt*1.8); const k=reduced?0:p.shake; p.g.rotation.x=Math.sin(t*16+p.x)*0.05*k; p.g.rotation.z=Math.cos(t*13+p.z)*0.05*k;
    for(const n of p.nuts){ if(!n.ready){ n.regrow-=dt; if(n.regrow<=0){n.ready=true;n.mesh.visible=true;n.mesh.scale.setScalar(0.01)} } else if(n.mesh.scale.x<1) n.mesh.scale.setScalar(Math.min(1,n.mesh.scale.x+dt)) } }
  // picked-up things come back after a while
  for(const p of pickups){ if(!p.active&&p.keep){ p.respawn-=dt; if(p.respawn<=0){p.active=true;p.obj.visible=true} } }
  // falling coconuts bounce, then become something to pick up
  for(let i=falling.length-1;i>=0;i--){const f=falling[i]; f.vy-=14*dt; f.m.position.x+=f.vx*dt; f.m.position.z+=f.vz*dt; f.m.position.y+=f.vy*dt; if(f.spin!==false) f.m.rotation.x+=dt*6;
    const g=surface(f.m.position.x,f.m.position.z)+f.r;
    if(f.m.position.y<=g){f.m.position.y=g; if(f.bounces<1&&f.vy<-2){f.vy*=-0.35;f.vx*=0.5;f.vz*=0.5;f.bounces++} else {falling.splice(i,1); scene.remove(f.m);
      const x=f.m.position.x, z=f.m.position.z, grp=new THREE.Group(); f.m.position.set(0,f.r,0); f.m.rotation.set(0,Math.random()*6,0); grp.add(f.m); placePickup(f.id,grp,x,z,{keep:false})}}}
  // logs wobble when chopped, dug holes fill back in
  for(const l of logs){ l.shake=Math.max(0,l.shake-dt*3); l.g.rotation.x=Math.sin(t*40)*0.06*l.shake }
  for(let i=holes.length-1;i>=0;i--){const h=holes[i]; h.t-=dt; h.m.material.opacity=0.6*Math.min(1,h.t/5); if(h.t<=0){scene.remove(h.m); holes.splice(i,1)}}
  // bugs wander, scurry off if Kai runs at them, and new ones turn up now and then
  for(const b of bugs){
    b.t-=dt; if(b.t<=0){ b.pause=Math.random()<0.35; b.dir+=(Math.random()-0.5)*2.4; b.t=0.6+Math.random()*1.6; b.flee=false }
    const dk=Math.hypot(pos.x-b.x,pos.z-b.z);
    if(dk<1.3&&speed>99){ b.dir=Math.atan2(b.x-pos.x,b.z-pos.z); b.pause=false; b.flee=true; b.t=0.8 }
    const v=b.pause?0:(b.flee?1.1:0.28), nx=b.x+Math.sin(b.dir)*v*dt, nz=b.z+Math.cos(b.dir)*v*dt;
    if(v>0){ if(height(nx,nz)<0.08||rockTop(nx,nz)>height(nx,nz)+0.05||!freeSpot(nx,nz,0.05)) b.dir+=Math.PI*(0.5+Math.random()); else {b.x=nx;b.z=nz} }
    b.g.position.set(b.x,height(b.x,b.z),b.z); b.g.rotation.y=b.dir;
    b.g.userData.legs.forEach((l,i)=>l.rotation.x=v>0?Math.sin(t*(b.flee?50:30)+i*2)*0.7:0);
  }
  if(bugs.length<BUG_COUNT){ bugSpawnT-=dt; if(bugSpawnT<=0){ bugSpawnT=30; const [x,z]=randomLand(); spawnBug(x,z,Math.floor(Math.random()*bugColors.length)) } }
  // things flying into Kai's pockets
  for(let i=flying.length-1;i>=0;i--){const f=flying[i]; f.t+=dt/0.35; const to=new THREE.Vector3(pos.x,pos.y+0.45,pos.z);
    f.obj.position.lerpVectors(f.from,to,Math.min(1,f.t)); f.obj.position.y+=Math.sin(Math.min(1,f.t)*Math.PI)*0.35; f.obj.scale.setScalar(1-Math.min(1,f.t)*0.5);
    if(f.t>=1){scene.remove(f.obj); flying.splice(i,1); f.onArrive()}}

  // walking over sticks, rocks and shells picks them up
  if(started&&!crafting&&!storeOpen&&!sleep) for(const p of pickups){ if(p.active&&Math.hypot(pos.x-p.x,pos.z-p.z)<0.6&&Math.abs(pos.y-p.obj.position.y)<0.8&&canAdd(p.id)){grab(p); break} }
  // context action: one big button that changes to fit what is nearby
  const act=(!started||crafting||storeOpen||sleep||eating||swingT>=0)?null:findAction();
  const label=act?act.label+'|'+(act.short||''):'';
  if(label!==lastPrompt){lastPrompt=label; promptEl.hidden=!act; if(act) promptText.textContent=act.label; setActBtn(act)}
  if(actionQueued&&swingT<0&&!eating){actionQueued=false; if(act&&act.short){ const k=act.kind; if(act.tool) equip(act.tool);
    if(k==='grab') grab(act.p); else if(k==='berry') pickBerry(act.b); else if(k==='swing') startSwing('swing'); else if(k==='dig') startSwing('dig');
    else if(k==='bug') catchBug(act.b); else if(k==='open') openStore(act.o); else if(k==='sleep') startSleep(act.o) }}
  if(swingT>=0){const before=swingT; swingT+=dt; if(before<0.2&&swingT>=0.2) onSwingHit(swingTarget); if(swingT>0.45){swingT=-1;swingTarget=null;swingTool=null}}

  // needs slowly drop
  if(started&&!sleep&&!crafting&&!storeOpen){ food=Math.max(0,food-dt*0.07); water=Math.max(0,water-dt*0.09) } renderMeters();
  if(saveT>0){saveT-=dt; if(saveT<=0) saveGame()}
  updateMood(dt);
  reach=Math.max(0,reach-dt); if(eating){eatT+=dt; if(eatT>0.9) eating=false}

  // animation
  if(ready){
    const moving=speed>0.2; phase+=dt*speed*3.4;
    const swing=moving?Math.sin(phase)*Math.min(0.75,speed*0.18):0;
    const ease=(o,v,k=14)=>o+(v-o)*Math.min(1,dt*k);
    const lying=!!sleep;
    rig.legL.rotation.x=ease(rig.legL.rotation.x,lying?0:grounded?swing:0.5);
    rig.legR.rotation.x=ease(rig.legR.rotation.x,lying?0:grounded?-swing:-0.3);
    rig.armL.rotation.x=ease(rig.armL.rotation.x,lying?0:grounded?-swing*0.9:-0.4);
    let armRx=grounded?swing*0.9:-0.4, armRz=null, k=14;
    const tool=held(); if((tool==='stick'||tool==='axe'||tool==='shovel')&&grounded) armRx=swing*0.5-0.35;
    if(reach>0) armRx=-1.1;
    if(swingT>=0){k=40; armRx=swingTarget&&swingTarget.kind==='dig'?(swingT<0.16?-1.4:0.75):(swingT<0.16?-2.7:0.35)}
    if(lying) armRx=0;
    if(eating){armRx=-2.3+Math.sin(eatT*18)*0.12; armRz=0.35}
    rig.armR.rotation.x=ease(rig.armR.rotation.x,armRx,k);
    rig.armL.rotation.z=ease(rig.armL.rotation.z,grounded?0:0.9); rig.armR.rotation.z=ease(rig.armR.rotation.z,armRz!==null?armRz:(grounded?0:-0.9));
    const bob=moving&&grounded?Math.abs(Math.sin(phase))*0.035:Math.sin(t*2.2)*0.006;
    // hungry or thirsty Kai hangs his head; at 0% he stares at the ground
    const droop=lying?0:mood==='empty'?0.5:mood==='low'?0.16:0;
    rig.head.rotation.x=ease(rig.head.rotation.x,droop,4);
    rig.upper.position.y=lying?0:bob*(mood==='empty'?0.5:1);
    rig.model.rotation.x=ease(rig.model.rotation.x,lying?-Math.PI/2:(moving?Math.min(0.12,speed*0.02):(reach>0?0.18:0)),lying?7:6);
    face.eyes.forEach(e=>e.visible=!lying); face.closed.forEach(e=>e.visible=lying);
    heldBerry.visible=eating&&eatingItem==='berry'&&eatT<0.6; heldNut.visible=eating&&eatingItem==='cwater';
    heldStick.visible=tool==='stick'&&!eating&&!lying; heldAxe.visible=tool==='axe'&&!eating&&!lying; heldShovel.visible=tool==='shovel'&&!eating&&!lying;
  }
  kai.position.copy(pos); kai.rotation.y=facing;
  blob.position.set(pos.x,Math.max(surface(pos.x,pos.z),0.0)+0.02,pos.z); blob.material.opacity=0.18*Math.max(0.2,1-(pos.y-gy)*0.6); blob.visible=height(pos.x,pos.z)>-0.02;

  // camera follow
  camTarget.lerp(new THREE.Vector3(pos.x,pos.y+0.75,pos.z),Math.min(1,dt*6));
  camPos.set(camTarget.x+Math.sin(camYaw)*Math.cos(camPitch)*camDist, camTarget.y+Math.sin(camPitch)*camDist, camTarget.z+Math.cos(camYaw)*Math.cos(camPitch)*camDist);
  camDir.subVectors(camPos,camTarget); const full=camDir.length(); camDir.normalize();
  ray.set(camTarget,camDir); ray.far=full; const hit=ray.intersectObjects(occluders,false).find(h=>{for(let o=h.object;o;o=o.parent) if(!o.visible) return false; return true});
  if(hit) camPos.copy(camTarget).addScaledVector(camDir,Math.max(0.5,hit.distance-0.25));
  camPos.y=Math.max(camPos.y,height(camPos.x,camPos.z)+0.4,0.4);
  camera.position.copy(camPos); camera.lookAt(camTarget);
  sun.position.set(pos.x+12,20,pos.z+8); sun.target.position.set(pos.x,0,pos.z);

  renderer.render(scene,camera);
  window.__frames=(window.__frames||0)+1;
  requestAnimationFrame(tick);
}
camTarget.set(pos.x,pos.y+0.75,pos.z);
requestAnimationFrame(tick);
window.__game={setNeeds(f,w){food=f;water=w},get mood(){return mood},keys,get pos(){return pos},get ready(){return ready},inv,get food(){return food},get water(){return water},get sel(){return sel},palms,pickups,bushes,surface,
  teleport(x,z,f){pos.set(x,surface(x,z),z);if(f!==undefined){facing=f;camYaw=f+Math.PI}},cam(yaw,pitch,dist){camYaw=yaw;camPitch=pitch;camDist=dist},addItem,
  bugs,logs,placed,get sleeping(){return !!sleep},get store(){return storeOpen},tapSlot,act(){actionQueued=true},get started(){return started}};
