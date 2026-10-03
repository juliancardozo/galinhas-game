import * as THREE from 'three';
import './style.css';
import {STORY,completeStage} from './story';
import {constrainCouple, slideMove, pairOutcome, sharedConversation, sameDirection, MAX_DISTANCE, WARNING_DISTANCE} from './couple';
import {arcade} from './arcade';
import {LEVELS, dist, canSee, blocksSight, seedRandom, conversationStep, energyStep, outcome, type State, type Cover, type Point} from './core';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const toggle=(id:string,show:boolean)=>$(id).classList.toggle('hidden',!show);
const keys=new Set<string>();
let gameMode:'solo'|'coop'|'story'='solo';
const coop=()=>gameMode!=='solo';
const story=()=>gameMode==='story';
let journey={money:100,score:0,seconds:0,completed:0},stageStartedAt=0;
let sprintCodes=['ShiftLeft','ShiftRight'];
type Agent={person:Person,energy:number,talk:number,locked:boolean,velocity:Point,sprint:boolean,side:number,turnAt:number,reversedAt:number};
let agents:Agent[]=[];let link:THREE.Line;
let selected=0,mode:'menu'|'play'|'pause'|'won'|'lost'='menu',energy=100,money=100,score=0,elapsed=0,talk=0,combo=0,comboTime=-100,toastUntil=0,sprintLocked=false,soundOn=false;
let rnd=seedRandom(12),clock=new THREE.Clock(),lastTurn=0,lastSide=0,feintCooldown=0;
let audio:AudioContext|undefined,waveGain:GainNode|undefined;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xa9e4e4);
$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa9e4e4);scene.fog=new THREE.Fog(0xb5e6df,65,180);
const camera=new THREE.PerspectiveCamera(51,innerWidth/innerHeight,.1,250);
scene.add(new THREE.HemisphereLight(0xe1faff,0xd5b986,2.8));
const sun=new THREE.DirectionalLight(0xffedd0,3.2);sun.position.set(-30,65,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;sun.shadow.camera.far=160;sun.shadow.bias=-.0007;scene.add(sun,sun.target);
let world=new THREE.Group();scene.add(world);
const materials=new Map<string,THREE.MeshStandardMaterial>();
function mat(color:number,roughness=.85){const key=color+':'+roughness;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,flatShading:true}));return materials.get(key)!;}
function mesh(geo:THREE.BufferGeometry,color:number,parent:THREE.Object3D,x=0,y=0,z=0):THREE.Mesh<THREE.BufferGeometry,THREE.Material>{const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const boxGeo=new THREE.BoxGeometry(1,1,1),ballGeo=new THREE.SphereGeometry(1,10,8),cylinderGeo=new THREE.CylinderGeometry(1,1,1,9);
function box(parent:THREE.Object3D,color:number,x:number,y:number,z:number,sx:number,sy:number,sz:number){const m=mesh(boxGeo,color,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function ball(parent:THREE.Object3D,color:number,x:number,y:number,z:number,r:number){const m=mesh(ballGeo,color,parent,x,y,z);m.scale.setScalar(r);return m;}
function cylinder(parent:THREE.Object3D,color:number,x:number,y:number,z:number,r:number,h:number){const m=mesh(cylinderGeo,color,parent,x,y,z);m.scale.set(r,h,r);return m;}
function labelTexture(text:string,bg:string,fg:string,w=256,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.font=`900 ${h*.55}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2,w*.9);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const vendorBrand={text:'PITÚ',background:'#efc12e',color:'#9a201d'};
const shirtLabel=new THREE.MeshBasicMaterial({map:labelTexture(vendorBrand.text,vendorBrand.background,vendorBrand.color),side:THREE.DoubleSide});
type Person={group:THREE.Group,legs:THREE.Group[],arms:THREE.Group[],phase:number};
function person(x:number,z:number,vendor=false,shirt=0x56a7bf):Person{
 const g=new THREE.Group();g.position.set(x,0,z);world.add(g);const skin=[0xc5885b,0xe0ae7e,0xa96c49][Math.floor(rnd()*3)];
 box(g,vendor?0x171d20:shirt,0,1.4,0,.68,.74,.38);box(g,vendor?0xeacd55:0x244659,0,.9,0,.62,.28,.35);ball(g,skin,0,2,0,.27);
 const hat=cylinder(g,vendor?0xffd264:0xf4efdb,0,2.19,0,.35,.055);hat.scale.z*=1.1;cylinder(g,vendor?0xf0ba47:0xe9dfbe,0,2.27,0,.23,.16);
 const legs:THREE.Group[]=[],arms:THREE.Group[]=[];
 for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.18,.87,0);g.add(leg);box(leg,skin,0,-.28,0,.18,.56,.2);box(leg,0x30444a,0,-.58,.05,.22,.09,.36);legs.push(leg);const arm=new THREE.Group();arm.position.set(s*.44,1.66,0);g.add(arm);box(arm,skin,0,-.29,0,.17,.62,.19);arms.push(arm);}
 if(vendor){const logo=new THREE.Mesh(new THREE.PlaneGeometry(.49,.26),shirtLabel);logo.position.set(0,1.45,.196);g.add(logo);const back=logo.clone();back.position.z=-.196;back.rotation.y=Math.PI;g.add(back);}else{box(g,0xec8351,0,1.4,-.28,.42,.5,.22);}
 return{group:g,legs,arms,phase:rnd()*6};
}
function animatePerson(p:Person,moving:boolean,t:number,sprint=false){const phase=t*(sprint?14:8)+p.phase,amp=moving?(sprint?.7:.4):.025;p.legs[0].rotation.x=Math.sin(phase)*amp;p.legs[1].rotation.x=-Math.sin(phase)*amp;p.arms[0].rotation.x=-Math.sin(phase)*amp;p.arms[1].rotation.x=Math.sin(phase)*amp;p.group.position.y=moving?Math.abs(Math.sin(phase))*.035:0;}
let player:Person;let velocity={x:0,z:0};
interface NPC{person:Person,state:State,home:Point,target:Point,heading:number,timer:number,seen:number,lastSeen:Point,cone:THREE.Mesh,bubble:HTMLDivElement,phraseAt:number,phrase:string,dodged:boolean,near:boolean,blind:number,targetPlayer:number,lockedUntil:number,encounter:boolean}
let npcs:NPC[]=[],covers:Cover[]=[],solids:Cover[]=[],walkers:{person:Person,home:Point,dir:number}[]=[],waves:THREE.Mesh[]=[],goal:THREE.Group;
const sayings=['Sombrinha para os dois?','Tem chuveiro!','Tem banheiro!','Tem WiFi!','Caipirinha grátis, casal!'];
function addCover(x:number,z:number,r:number,solid=true){covers.push({x,z,radius:r});if(solid)solids.push({x,z,radius:r});}
function umbrella(x:number,z:number,color:number){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);cylinder(g,0xebdfc0,0,1.55,0,.055,3.1);const canopy=mesh(new THREE.ConeGeometry(1.9,.65,12,1,true),color,g,0,3.2,0);canopy.material=mat(color);const trim=mesh(new THREE.CylinderGeometry(1.9,1.9,.12,12,1,true),color,g,0,2.9,0);trim.castShadow=true;addCover(x,z,1.55,false);solids.push({x,z,radius:.25});for(const offset of [-1,1]){const c=new THREE.Group();c.position.set(offset*.95,0,.65);g.add(c);box(c,0xf8f1da,0,.38,0,.68,.09,1.75);const back=box(c,color,0,.74,-.69,.65,.8,.08);back.rotation.x=-.35;for(const a of [-1,1])box(c,0xe8d9bc,a*.29,.19,0,.05,.38,1.2);solids.push({x:x+offset*.95,z:z+.65,radius:.6});}}
function palm(x:number,z:number){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);const trunk=cylinder(g,0x907149,0,3.5,0,.24,7);trunk.rotation.z=.12;for(let i=0;i<7;i++){const leaf=mesh(new THREE.ConeGeometry(.78,4.4,4),i%2?0x359568:0x257953,g);const a=i/7*Math.PI*2;leaf.position.set(Math.sin(a)*1.6,7.15,Math.cos(a)*1.6);leaf.rotation.set(Math.cos(a)*1.15,0,-Math.sin(a)*1.15);}for(let i=0;i<3;i++)ball(g,0x695137,Math.sin(i*2)*.35,6.7,Math.cos(i*2)*.35,.23);}
function cart(x:number,z:number){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);box(g,0xf4b745,0,.9,0,2.2,1.3,1.4);box(g,0xffe2a0,0,1.65,0,2.5,.12,1.7);for(const s of [-1,1]){const w=cylinder(g,0x344448,s*1.12,.35,0,.35,.15);w.rotation.z=Math.PI/2;box(g,0xd6e4cc,s,.0+2.3,0,.08,1.3,.08);}box(g,0xf1704e,0,3,0,2.7,.16,1.9);for(let i=0;i<5;i++)ball(g,0x64a74c,(i-2)*.36,1.85,0,.23);const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.55),new THREE.MeshBasicMaterial({map:labelTexture('COCOS','#17685b','#ffe5a3')}));sign.position.set(0,1,.711);g.add(sign);addCover(x,z,1.35);}
function surfboard(x:number,z:number,color:number){const g=new THREE.Group();g.position.set(x,.14,z);g.rotation.y=rnd()*3;world.add(g);const b=ball(g,color,0,0,0,1);b.scale.set(.45,.12,1.7);box(g,0xfff8e7,0,.11,0,.08,.025,2.4);solids.push({x,z,radius:.6});}
function boat(x:number,z:number){const g=new THREE.Group();g.position.set(x,.2,z);world.add(g);box(g,0xa36f41,0,.45,0,2.3,.5,4.5);for(let i=-1;i<=1;i++)cylinder(g,0xb48152,i*.66,.6,0,.22,4.7).rotation.x=Math.PI/2;cylinder(g,0xede1ba,0,3,0,.065,6);const sail=mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,5.6,0,0,1.4,0,2.1,1.4,0],3)),0xffede2,g);sail.geometry.computeVertexNormals();sail.material=new THREE.MeshStandardMaterial({color:0xffede2,side:THREE.DoubleSide});addCover(x,z,2);}
function coneGeometry(radius:number){const verts=[0,.055,0];const n=26;for(let i=0;i<=n;i++){const a=-Math.PI/3.1+i/n*(Math.PI/3.1*2);verts.push(Math.sin(a)*radius,.055,Math.cos(a)*radius);}const indices=[];for(let i=1;i<=n;i++)indices.push(0,i,i+1);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;}
function setupLevel(level:number){
 selected=level;rnd=seedRandom(LEVELS[level].seed);
 scene.remove(world);world.traverse(o=>{if(o instanceof THREE.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof THREE.Line){o.geometry.dispose();(o.material as THREE.Material).dispose();}if(o instanceof THREE.Mesh&&o.geometry!==boxGeo&&o.geometry!==ballGeo&&o.geometry!==cylinderGeo)o.geometry.dispose();if(o instanceof THREE.Mesh&&!Array.isArray(o.material)&&!([...materials.values()] as THREE.Material[]).includes(o.material)&&o.material!==shirtLabel){const m=o.material as THREE.MeshStandardMaterial;m.map?.dispose();m.dispose();}});
 world=new THREE.Group();scene.add(world);$('bubbles').replaceChildren();npcs=[];covers=[];solids=[];waves=[];walkers=[];
 const L=LEVELS[level].length;
 box(world,0xefddb3,-1,-.25,-L/2,56,.5,L+100);box(world,0x28bbbf,80,-.4,-L/2,110,.4,L+240);box(world,0x6ed5cf,26,-.15,-L/2,8,.12,L+90);box(world,0xd0e4c0,21.5,-.05,-L/2,2,.08,L+80);
 for(let i=0;i<13;i++){const w=box(world,0xb5f1df,26+i*3,-.03,-L/2,.2,.035,L+110);w.material=new THREE.MeshBasicMaterial({color:0xd9fff2,transparent:true,opacity:.4-i*.015});waves.push(w);}
 for(let z=10;z>-L-25;z-=15){palm(-24-rnd()*5,z);if(rnd()>.25)palm(-30,z-7);}
 const colorSet=[0xf48461,0xfac750,0x5dafa5,0xe9ebda,0x629bbb];
 for(let i=0;i<Math.floor(L/7);i++){let z=-9-i*6.7;let x=(i%2===0?-1:1)*(5+rnd()*10);if(level===2)x=coop()?(i%2===0?-1:1)*(7+rnd()*5):(i%3-1)*9;umbrella(x,z,colorSet[i%5]);if(i%4===1){cart(x>0?-15:15,z-2);}}
 for(let i=0;i<20+level*8;i++){const x=(rnd()-.5)*37,z=-10-rnd()*(L-17);if((coop()&&Math.abs(x)<3.1)||solids.some(o=>dist(o,{x,z})<o.radius+1))continue;const p=person(x,z,false,[0xee895b,0x449fbb,0xedca55,0xe2e9d3][i%4]);p.group.rotation.y=rnd()*Math.PI*2;const walking=i%4===0;walkers.push({person:p,home:{x,z},dir:walking?(rnd()>.5?1:-1):0});addCover(x,z,.62,!walking);if(i%5===0){const child=person(x+.9,z+.3,false,0xefbc51);child.group.scale.setScalar(.7);walkers.push({person:child,home:{x:x+.9,z:z+.3},dir:0});addCover(x+.9,z+.3,.4);}}
 for(let i=0;i<8;i++){surfboard(18-rnd()*4,-20-rnd()*(L-35),colorSet[i%5]);ball(world,0xf48358,(rnd()-.5)*35,.3,-rnd()*L,.3);}
 for(let i=0;i<3;i++){const x=-16+rnd()*32,z=-25-rnd()*(L-35);const dog=new THREE.Group();dog.position.set(x,0,z);world.add(dog);box(dog,0xf9efdd,0,.4,0,.42,.42,.8);box(dog,0x313f3e,0,.58,.46,.38,.36,.4);for(const s of [-1,1])for(const t of [-1,1])box(dog,0xd7b98a,s*.16,.15,t*.26,.1,.3,.1);}
 if(level>0){for(let i=0;i<12;i++){const rock=ball(world,0x6c8275,24+rnd()*7,.06,-30-rnd()*L,1+rnd());rock.scale.y=.35;}if(level===2){for(let i=0;i<7;i++)boat(i%2?18:-18,-35-i*21);}}
 agents=[];
 for(let i=0;i<(coop()?2:1);i++){
  const tourist=person(coop()?(i===0?-1:1):0,3,false,i===0?0x65b9d8:0xf18476);tourist.group.rotation.y=Math.PI;
  if(coop()){const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(String(i+1),i===0?'#247a9b':'#bf594b','#ffffff',64,64),depthTest:false}));marker.position.set(0,2.9,0);marker.scale.set(.65,.65,.65);tourist.group.add(marker);}
  agents.push({person:tourist,energy:100,talk:0,locked:false,velocity:{x:0,z:0},sprint:false,side:0,turnAt:-10,reversedAt:-10});
 }
 player=agents[0].person;
 link=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffce55,transparent:true,opacity:.65}));world.add(link);link.visible=false;
 if(coop()){camera.position.set(0,15,22);camera.lookAt(0,0,-10);}

 for(let i=0;i<LEVELS[level].npcs;i++){const z=-18-i*(L-38)/LEVELS[level].npcs;const x=(i%2===0?-1:1)*(3+rnd()*9);const p=person(x,z,true);const heading=i%2===0?Math.PI/2:-Math.PI/2;p.group.rotation.y=heading;const cone=new THREE.Mesh(coneGeometry(LEVELS[level].radius),new THREE.MeshBasicMaterial({color:0xffce61,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide}));cone.position.set(x,0,z);cone.rotation.y=heading;world.add(cone);const bubble=document.createElement('div');bubble.className='bubble';bubble.style.display='none';$('bubbles').appendChild(bubble);npcs.push({person:p,state:'PATROL',home:{x,z},target:{x:x+(i%2===0?6:-6),z:z-2},heading,timer:rnd()*2,seen:0,lastSeen:{x,z},cone,bubble,phraseAt:0,phrase:'',dodged:false,near:false,blind:0,targetPlayer:0,lockedUntil:0,encounter:false});}
 if(level<2){box(world,0x35c5c6,0,-.04,-L-30,50,.14,58);box(world,0xb8efda,0,.045,-L-1.5,49,.03,1.6);if(level===1){for(let i=0;i<14;i++){const reef=ball(world,0x738576,(rnd()-.5)*44,.1,-L-5-rnd()*28,1+rnd());reef.scale.y=.3;}}}else{for(let i=0;i<3;i++)boat(8+i*5,-L-6-i*3);}
 goal=new THREE.Group();goal.position.set(0,0,-L);world.add(goal);const goalMat=new THREE.MeshBasicMaterial({color:0xffce55,transparent:true,opacity:.5});const g=new THREE.Mesh(new THREE.PlaneGeometry(42,2),goalMat);g.rotation.x=-Math.PI/2;g.position.y=.09;goal.add(g);
 for(const s of [-1,1]){cylinder(goal,0xf8f1dc,s*6,2.2,0,.1,4.4);const flag=mesh(new THREE.PlaneGeometry(2,1.2),0xffca55,goal,s*6+(s===-1?1:-1),3.6,0);flag.material=new THREE.MeshStandardMaterial({color:0xffce55,side:THREE.DoubleSide});}
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.4),new THREE.MeshBasicMaterial({map:labelTexture(level===0?'AO MAR!':level===1?'PISCINAS':'EMBARQUE','#085258','#ffdb65',512,128),side:THREE.DoubleSide}));sign.position.set(0,4.5,0);goal.add(sign);
 if(!coop()||mode==='menu'){camera.position.set(24,26,29);camera.lookAt(-2,0,-30);}
 money=100;energy=100;score=0;elapsed=0;talk=0;combo=0;comboTime=-100;feintCooldown=0;sprintLocked=false;velocity={x:0,z:0};keys.clear();
 $('levelname').textContent=`${story()?'HISTORIA · ':''}0${level+1} / ${LEVELS[level].name}`;$('destination').textContent=LEVELS[level].destination;updateHUD();
}
function sound(freq=440,duration=.12,type:OscillatorType='sine',volume=.04){if(!soundOn||!audio)return;const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function initAudio(){if(!audio){audio=new AudioContext();const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate);const data=buffer.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){v=(v+(Math.random()*2-1)*.04)/1.02;data[i]=v*3;}const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=480;waveGain=audio.createGain();waveGain.gain.value=0;source.connect(filter).connect(waveGain).connect(audio.destination);source.start();}void audio.resume();if(waveGain)waveGain.gain.value=soundOn?.17:0;}
function toast(text:string){$('toast').textContent=text;toastUntil=elapsed+1.9;}
function start(continuing=false){
 if(coop()&&!continuing&&!arcade.savePairName()){toggle('menu',true);toggle('result',false);return;}
 if(story()&&!continuing){
  selected=0;journey={money:100,score:0,seconds:0,completed:0};
 }
 setupLevel(selected);
 if(story()&&continuing){money=journey.money;score=journey.score;elapsed=journey.seconds;}
 stageStartedAt=elapsed;
 if(!continuing)arcade.begin(selected+1,gameMode);
mode='play';if(coop()){camera.position.set(0,15,21);camera.lookAt(0,0,-8);}initAudio();toggle('menu',false);toggle('result',false);toggle('start-tip',false);toggle('hud',true);toggle('bottomhud',true);toggle('touch',!coop());toggle('guide',false);$('shade').style.background='linear-gradient(180deg,#03454b33,transparent 30%,transparent 70%,#03454b55)';$('pause').style.display='block';toast(coop()?'AL MAR. JUNTOS.':'AL MAR. SIN ESCALAS.');(document.activeElement as HTMLElement)?.blur();$('hint').textContent='Las sombrillas y carritos cortan la visión.';sound(600,.14);clock.getDelta();updateLevelButtons();if(story()){mode='pause';keys.clear();$('chapter-title').textContent=STORY[selected].title;$('chapter-copy').textContent=STORY[selected].intro;toggle('chapter',true);}}
function finish(won:boolean){mode=won?'won':'lost';keys.clear();if(won){score+=Math.round(money)*12+Math.max(0,Math.round((180-(elapsed-stageStartedAt))*8));sound(880,.4,'triangle');}else sound(160,.5,'sawtooth');toggle('result',true);toggle('bottomhud',false);toggle('touch',false);toggle('start-tip',false);toggle('conversation',false);$('pause').style.display='none';$('shade').style.background='linear-gradient(90deg,#033d42ed,#033d4266 55%,transparent)';$('resulttag').textContent=won?'MISIÓN COMPLETA':'TE VENDIERON HASTA EL WIFI';$('resulttitle').textContent=won?(coop()?'CHEGAMOS!':'CHEGOU!'):'SIN REAIS.';$('resultcopy').textContent=won?(coop()?'JUNTOS Y CON REAIS.':'Ahora sí, vacaciones. Te ganaste ese chapuzón.'):(coop()?'Les vendieron hasta el WiFi.':'Gastaste todos los reais antes de llegar al destino.');$('resultmoney').textContent=`R$${Math.ceil(money)}`;$('resultscore').textContent=String(score);$('resulttime').textContent=formatTime(elapsed);const intermediate=story()&&won&&selected<2;
 toggle('next',won&&selected<2);$('next').textContent=story()?'CONTINUAR EL VIAJE':'SIGUIENTE PLAYA';
 if(story()){
  $('resulttag').textContent=intermediate?'ETAPA COMPLETADA · +R$30':won?'HISTORIA COMPLETA':'EL VIAJE TERMINÓ';
  $('resultcopy').textContent=won?STORY[selected].ending:`Nos quedamos sin reais en ${LEVELS[selected].name}. Una más: esta vez nos esperamos.`;
  if(won){arcade.checkpoint({score,money:Math.ceil(money),seconds:elapsed,outcome:'won',stage:selected+1},intermediate);journey=completeStage({money,score,seconds:elapsed,completed:journey.completed},selected);money=journey.money;$('resultmoney').textContent=`R$${Math.ceil(money)}`;}
 }
$('retry').textContent=won?'VOLVER A JUGAR':(coop()?'UNA MÁS. JUNTOS.':'UNA MÁS. POR LA IZQUIERDA.');updateHUD();if(!intermediate)void arcade.finish({score,money:Math.ceil(money),seconds:elapsed,outcome:won?'won':'lost',...(story()?{stage:selected+1}:{})});if(won)confetti();}
function pause(){if(!$('chapter').classList.contains('hidden'))return;if(mode==='play'){mode='pause';keys.clear();toggle('paused',true);}else if(mode==='pause'){mode='play';toggle('paused',false);clock.getDelta();}}
function showMenu(){toggle('chapter',false);arcade.menu();mode='menu';toggle('menu',true);toggle('result',false);toggle('hud',false);toggle('bottomhud',false);toggle('touch',false);toggle('guide',true);toggle('start-tip',true);$('pause').style.display='none';$('shade').style.background='linear-gradient(90deg,rgba(2,45,47,.85),rgba(2,45,47,.42) 35%,transparent 67%)';setupLevel(selected);}
function formatTime(t:number){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function updateHUD(){
 energy=agents[0].energy;talk=agents[0].talk;sprintLocked=agents[0].locked;
 $('money').textContent=`R$${Math.ceil(money)}`;$('score').textContent=String(score).padStart(5,'0');$('clock').textContent=formatTime(elapsed);
 $('wallet-label').textContent=coop()?'REALES COMPARTIDOS':'TUS REALES';$('points-label').textContent=coop()?'PUNTOS DE PAREJA':'PUNTOS';
 $('energy').style.width=energy+'%';$('energylabel').textContent=sprintLocked?'RECUPERANDO':Math.round(energy)+'%';
 $('progress').style.width=Math.min(100,Math.max(0,-Math.max(...agents.map(a=>a.person.group.position.z))/LEVELS[selected].length*100))+'%';
 $('talk').style.width=talk*100+'%';toggle('conversation',mode==='play'&&talk>.05);
 $('bottomhud').classList.toggle('cooperative',coop());toggle('partner-hud',coop());toggle('distance-hud',coop());
 if(coop()){
  const a=agents[1];$('energy2').style.width=a.energy+'%';$('energylabel2').textContent=a.locked?'RECUPERANDO':Math.round(a.energy)+'%';$('talk2').style.width=a.talk*100+'%';toggle('conversation2',mode==='play'&&a.talk>.05);
  const d=dist(player.group.position,a.person.group.position);$('distance').textContent=d.toFixed(1)+' m / 5 m';$('distance-fill').style.width=Math.min(100,d/MAX_DISTANCE*100)+'%';$('separation').textContent=d>WARNING_DISTANCE?'¡NO TE SEPARES!': 'CAMINAMOS JUNTOS';$('distance-hud').classList.toggle('warning',d>WARNING_DISTANCE);
  link.visible=mode==='play'&&d>WARNING_DISTANCE;link.geometry.setFromPoints(agents.map(a=>new THREE.Vector3(a.person.group.position.x,.18,a.person.group.position.z)));
 }
 $('money').parentElement!.classList.toggle('danger',money<30);$('moneyhint').textContent=agents.some(a=>a.talk>.55)?'¡Les están cobrando!':'No los regales.';
}
function collide(p:THREE.Vector3,radius=.42){p.x=THREE.MathUtils.clamp(p.x,-21,20.5);p.z=Math.min(p.z,8);for(const o of solids){const dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz),r=o.radius+radius;if(d<r){p.x=o.x+(dx/(d||1))*r;p.z=o.z+(dz/(d||1))*r;}}}
function moveNPC(n:NPC,target:Point,speed:number,dt:number){const p=n.person.group.position;const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d>.3){const desired=Math.atan2(dx,dz);let angle=Math.atan2(Math.sin(desired-n.heading),Math.cos(desired-n.heading));n.heading+=angle*Math.min(1,dt*5);p.x+=Math.sin(n.heading)*speed*dt;p.z+=Math.cos(n.heading)*speed*dt;collide(p,.4);}return d>.3;}
function updateNPC(n:NPC,dt:number){const p=n.person.group.position;
 if(elapsed>=n.lockedUntil&&(n.state==='PATROL'||n.state==='IDLE'||n.state==='RETURN')){
  let choice=-1,best=Infinity;
  agents.forEach((a,i)=>{const d=dist(p,a.person.group.position);if(d<best&&canSee(p,n.heading,a.person.group.position,LEVELS[selected].radius,covers)){choice=i;best=d;}});
  if(choice>=0){n.targetPlayer=choice;n.lockedUntil=elapsed+2.5;}
 }
 const targetAgent=agents[n.targetPlayer]??agents[0],pp=targetAgent.person.group.position,d=dist(p,pp);n.timer+=dt;n.blind=Math.max(0,n.blind-dt);const visible=n.blind===0&&canSee(p,n.heading,pp,LEVELS[selected].radius,covers);
 if(d<3.9)n.near=true;
 if(n.near&&!n.dodged&&d>7&&n.state!=='TALK'&&(!coop()||(n.encounter&&agents.every(a=>dist(p,a.person.group.position)>7)&&!npcs.some(other=>other.state==='TALK')&&dist(agents[0].person.group.position,agents[1].person.group.position)<=MAX_DISTANCE))){n.dodged=true;combo=elapsed-comboTime<5?combo+1:1;comboTime=elapsed;const bonus=(coop()?200:100)*Math.min(combo,5);score+=bonus;toast(coop()?`ESQUIVE EN PAREJA +${bonus}${combo>1?' / COMBO ×'+combo:''}`:combo>1?`ESQUIVE +${bonus} / COMBO ×${combo}`:'ESQUIVE +100');sound(780+combo*70,.15,'triangle');}
 let moving=false;
 switch(n.state){
 case 'IDLE': n.heading+=dt*.3;if(visible){n.state='SUSPICIOUS';n.timer=0;}else if(n.timer>1.6){n.state='PATROL';n.timer=0;}break;
 case 'PATROL':moving=moveNPC(n,n.target,.85,dt);if(dist(p,n.target)<.9||n.timer>9){n.state='IDLE';n.timer=0;n.target={x:n.home.x+(rnd()-.5)*10,z:n.home.z+(rnd()-.5)*7};}if(visible){n.state='SUSPICIOUS';n.timer=0;n.seen=0;sound(490,.08);}break;
 case 'SUSPICIOUS':n.heading=Math.atan2(pp.x-p.x,pp.z-p.z);if(visible)n.seen+=dt;else n.seen-=dt*2;if(n.seen>.42){n.state='CHASE';n.encounter=true;n.timer=0;n.lastSeen={x:pp.x,z:pp.z};}else if(n.seen<-.3){n.state='RETURN';n.timer=0;}break;
 case 'CHASE':if(visible){n.lastSeen={x:pp.x+targetAgent.velocity.x*.65,z:pp.z+targetAgent.velocity.z*.65};n.timer=0;}moving=moveNPC(n,n.lastSeen,LEVELS[selected].speed,dt);if(d<2.25&&!blocksSight(p,pp,covers)){n.state='TALK';n.timer=0;n.phraseAt=-10;}else if(n.timer>1.7||n.blind>0){n.state='RETURN';n.timer=0;}break;
 case 'TALK':moving=moveNPC(n,pp,LEVELS[selected].speed*.75,dt);if(d>3.15||blocksSight(p,pp,covers)){n.state='CHASE';n.timer=0;}if(elapsed-n.phraseAt>2){n.phrase=sayings[Math.floor(n.timer/2)%sayings.length];n.phraseAt=elapsed;sound(290,.08,'triangle');}break;
 case 'RETURN':moving=moveNPC(n,n.home,1.15,dt);if(n.timer>1.7&&visible){n.state='SUSPICIOUS';n.timer=0;n.seen=0;}else if(dist(p,n.home)<1){n.state='PATROL';n.timer=0;}break;
 }
 n.person.group.rotation.y=n.heading;animatePerson(n.person,moving,elapsed);n.cone.position.set(p.x,.01,p.z);n.cone.rotation.y=n.heading;const material=n.cone.material as THREE.MeshBasicMaterial;material.color.set(n.state==='CHASE'||n.state==='TALK'?0xf5784f:0xffd264);material.opacity=n.state==='RETURN'?.06:n.state==='CHASE'?.19:.12;
}
function tick(dt:number){
 elapsed+=dt;feintCooldown=Math.max(0,feintCooldown-dt);
 const intent=agents.map((a,i)=>{
  const right=i===0?keys.has('KeyD')||(!coop()&&keys.has('ArrowRight')):keys.has('ArrowRight');
  const left=i===0?keys.has('KeyA')||(!coop()&&keys.has('ArrowLeft')):keys.has('ArrowLeft');
  const back=i===0?keys.has('KeyS')||(!coop()&&keys.has('ArrowDown')):keys.has('ArrowDown');
  const forward=i===0?keys.has('KeyW')||(!coop()&&keys.has('ArrowUp')):keys.has('ArrowUp');
  return {x:Number(right)-Number(left),z:Number(back)-Number(forward)};
 });
 const activeTalk=agents.map((a,i)=>npcs.some(n=>n.state==='TALK'&&n.targetPlayer===i&&dist(n.person.group.position,a.person.group.position)<3.15));
 const close=coop()&&dist(agents[0].person.group.position,agents[1].person.group.position)<2.6;
 const help=close&&sameDirection(intent[0],intent[1]);
 const old=agents.map(a=>({x:a.person.group.position.x,z:a.person.group.position.z}));
 let proposed=agents.map((a,i)=>{
  const {x,z}=intent[i],moving=x!==0||z!==0;
  if(x!==0&&x!==a.side){if(a.side!==0&&elapsed-a.turnAt<.7)a.reversedAt=elapsed;a.side=x;a.turnAt=elapsed;}
  if(a.energy<1)a.locked=true;if(a.energy>30)a.locked=false;
  a.sprint=moving&&!a.locked&&a.energy>0&&(keys.has(sprintCodes[i])||(!coop()&&keys.has('ShiftRight'))||keys.has('TouchSprint'));
  a.energy=energyStep(a.energy,a.sprint,moving,dt);
  const norm=Math.hypot(x,z)||1;let speed=a.sprint?7.2:3.65;
  if(activeTalk[i])speed*=help?.86:.72;
  a.velocity={x:x/norm*speed,z:z/norm*speed};return slideMove(old[i],{x:a.velocity.x*dt,z:a.velocity.z*dt},solids);
 });
 if(coop())proposed=constrainCouple(old[0],old[1],proposed[0],proposed[1]);
 agents.forEach((a,i)=>{
  a.person.group.position.x=proposed[i].x;a.person.group.position.z=proposed[i].z;
  a.velocity={x:(proposed[i].x-old[i].x)/dt,z:(proposed[i].z-old[i].z)/dt};
  const moving=dist(proposed[i],old[i])>.001;
  if(moving){const desired=Math.atan2(a.velocity.x,a.velocity.z),angle=Math.atan2(Math.sin(desired-a.person.group.rotation.y),Math.cos(desired-a.person.group.rotation.y));a.person.group.rotation.y+=angle*Math.min(1,dt*14);}
  animatePerson(a.person,moving,elapsed,a.sprint);
 });
 const coordinated=coop()?agents.every(a=>elapsed-a.reversedAt<.3)&&Math.sign(intent[0].x)===Math.sign(intent[1].x)&&intent[0].x!==0:elapsed-agents[0].reversedAt<.2;
 if(coordinated&&feintCooldown===0){let tricked=false;for(const n of npcs){if(n.state==='CHASE'&&agents.some(a=>dist(n.person.group.position,a.person.group.position)<10)){n.blind=1.5;n.state='RETURN';n.timer=0;tricked=true;}}
  if(tricked){if(!coop())score+=75;toast(coop()?'¡POR EL OTRO LADO!':'¡LOS ENGAÑASTE! +75');sound(950,.12);feintCooldown=1.4;agents.forEach(a=>a.reversedAt=-10);}}
 for(const n of npcs)updateNPC(n,dt);
 const talkingNow=agents.map((a,i)=>npcs.some(n=>n.state==='TALK'&&n.targetPlayer===i&&dist(n.person.group.position,a.person.group.position)<3.15));
 const conversation=sharedConversation(agents.map(a=>a.talk),talkingNow,agents.map(a=>a.sprint),dt);agents.forEach((a,i)=>a.talk=conversation.progress[i]);money=Math.max(0,money-conversation.drain);
 for(const w of walkers){if(w.dir){w.person.group.position.x=w.home.x+Math.sin(elapsed*.25+w.home.z)*2;w.person.group.rotation.y=Math.cos(elapsed*.25+w.home.z)>0?Math.PI/2:-Math.PI/2;}animatePerson(w.person,w.dir!==0,elapsed);}
 const mid=agents.reduce((p,a)=>({x:p.x+a.person.group.position.x/agents.length,z:p.z+a.person.group.position.z/agents.length}),{x:0,z:0});
 const separation=coop()?dist(agents[0].person.group.position,agents[1].person.group.position):0;
 const portrait=Math.max(1,1.3/camera.aspect),zoom=coop()?separation*.7:0;
 camera.position.lerp(new THREE.Vector3(mid.x*(coop()?1:.65),(15+zoom)*portrait,mid.z+(18+zoom)*portrait),1-Math.exp(-dt*4));camera.lookAt(mid.x*(coop()?1:.6),0,mid.z-11);camera.fov=THREE.MathUtils.lerp(camera.fov,agents.some(a=>a.sprint)?58:51,dt*4);camera.updateProjectionMatrix();
 sun.position.set(mid.x-30,65,mid.z+22);sun.target.position.set(mid.x,0,mid.z-15);sun.target.updateMatrixWorld();
 if(elapsed>toastUntil)$('toast').textContent='';updateHUD();
 const end=pairOutcome(money,agents.map(a=>a.person.group.position),LEVELS[selected].length);if(end)finish(end==='won');
 else if(coop()&&agents.some(a=>a.person.group.position.z<=-LEVELS[selected].length))$('hint').textContent='¡Esperá! Los dos tienen que llegar.';
}
function updateBubbles(){let speechCount=0;const placed:{left:number,top:number,width:number,height:number}[]=[];for(const n of npcs){const p=n.person.group.position.clone();p.y=3.1;p.project(camera);const active=(mode==='play'||mode==='pause')&&p.z<1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.9;let text='',cls='bubble';if(n.state==='TALK'&&speechCount<2){text=n.phrase;speechCount++;}else if(n.state==='CHASE'||n.state==='SUSPICIOUS'){text='!';cls+=' alert';}else if(n.state==='RETURN'&&n.timer<2.2){text='?';cls+=' lost';}n.bubble.style.display=active&&text?'block':'none';n.bubble.textContent=text;n.bubble.className=cls;let left=(p.x*.5+.5)*innerWidth,top=(-p.y*.5+.5)*innerHeight;
 if(active&&text&&n.state==='TALK'){
  const width=n.bubble.offsetWidth||text.length*8+24,height=n.bubble.offsetHeight||34;left=Math.max(width/2+8,Math.min(innerWidth-width/2-8,left));
  for(const other of placed)if(Math.abs(left-other.left)<(width+other.width)/2+8&&Math.abs(top-other.top)<Math.max(height,other.height)+8)top=other.top-other.height-10;
  top=Math.max(height+85,top);placed.push({left,top,width,height});
 }
 n.bubble.style.left=left+'px';n.bubble.style.top=top+'px';}}
let confettiParts:{mesh:THREE.Mesh,v:THREE.Vector3,life:number}[]=[];
function confetti(){for(let i=0;i<65;i++){const p=player.group.position;const m=box(world,[0xffce55,0xf78261,0x6dcfcd,0xffffff][i%4],p.x+(Math.random()-.5)*6,3+Math.random()*4,p.z+(Math.random()-.5)*5,.12,.12,.12);confettiParts.push({mesh:m,v:new THREE.Vector3((Math.random()-.5)*4,2+Math.random()*3,(Math.random()-.5)*4),life:3});}}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(mode==='play')tick(dt);else if(mode==='menu'){for(const n of npcs){n.person.group.rotation.y=n.heading+Math.sin(clock.elapsedTime*.5)*.3;animatePerson(n.person,false,clock.elapsedTime);}camera.position.lerp(new THREE.Vector3(24+Math.sin(clock.elapsedTime*.12)*2,26,29),dt);camera.lookAt(-2,0,-30);}for(let i=0;i<waves.length;i++){waves[i].position.x=26+i*3+Math.sin(clock.elapsedTime*.7+i*.6)*.75;}goal.position.y=Math.sin(clock.elapsedTime*2)*.03;for(const p of confettiParts){p.life-=dt;p.v.y-=dt*3;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=dt*3;}const expired=confettiParts.filter(p=>p.life<=0);expired.forEach(p=>world.remove(p.mesh));confettiParts=confettiParts.filter(p=>p.life>0);updateBubbles();renderer.render(scene,camera);}
$('play').onclick=()=>start();$('retry').onclick=()=>start();$('next').onclick=()=>{selected=Math.min(selected+1,2);updateLevelButtons();start(story());};$('back').onclick=showMenu;$('pause').onclick=pause;$('resume').onclick=pause;
$('chapter-go').onclick=()=>{toggle('chapter',false);mode='play';keys.clear();clock.getDelta();};
function updateLevelButtons(){document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.level)===selected);b.disabled=story();});}
document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.level);updateLevelButtons();setupLevel(selected);});
$('sound').onclick=()=>{soundOn=!soundOn;initAudio();$('sound').textContent=soundOn?'SONIDO ON':'SONIDO OFF';$('sound').setAttribute('aria-label',soundOn?'Desactivar sonido':'Activar sonido');if(soundOn)sound(650);};
window.addEventListener('keydown',e=>{
 if((e.target as HTMLElement)?.closest('input,select,textarea')||document.querySelector('dialog[open]'))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 if(e.repeat&&['Escape','KeyR','Enter'].includes(e.code))return;
 if(e.code==='Escape')pause();else if(e.code==='KeyR'&&mode!=='menu'){toggle('paused',false);start();}else if(e.code==='Enter'&&['menu','won','lost'].includes(mode)){e.preventDefault();start();}else if(mode==='play')keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(mode==='play')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause();});
const touchCodes:Record<string,string>={arrowup:'ArrowUp',arrowdown:'ArrowDown',arrowleft:'ArrowLeft',arrowright:'ArrowRight',shift:'TouchSprint'};
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(mode==='play'&&!coop())keys.add(touchCodes[b.dataset.key!]);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(touchCodes[b.dataset.key!]));});
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>{
 gameMode=b.dataset.mode as 'solo'|'coop'|'story';document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(v=>v.classList.toggle('selected',v===b));toggle('coop-controls',coop());toggle('story-description',story());toggle('pair-identity',coop());if(story())selected=0;updateLevelButtons();$('play').textContent=story()?'EMPEZAR NUESTRA HISTORIA':coop()?'¡AL AGUA, LOS DOS!':'¡AL AGUA!';$('menu-note').textContent=story()?'Tres etapas seguidas. +R$30 en las dos primeras. Billetera, puntos y tiempo acumulados.':coop()?'Hasta 5 m juntos. R$100 compartidos. Lleguen los dos.':'Llegá al destino. Esquivá las charlas. Conservá tus reais.';$('guide-controls').textContent=coop()?'1: WASD + Shift izq. · 2: Flechas + Shift der.':'WASD o flechas · Shift: sprint';setupLevel(selected);
});
['sprint1','sprint2'].forEach((id,i)=>$(id).onchange=()=>{sprintCodes[i]=$<HTMLSelectElement>(id).value;});
if(matchMedia('(pointer:coarse)').matches&&!matchMedia('(any-pointer:fine)').matches){$<HTMLButtonElement>('choose-coop').disabled=true;$<HTMLButtonElement>('choose-story').disabled=true;$('desktop-note').textContent='Pareja: requiere computadora y teclado compartido.';}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(mode==='play')pause();$('loading').textContent='Se interrumpió la imagen. Recargá para volver a la playa.';toggle('loading',true);});
setupLevel(0);toggle('loading',false);frame();
// Shared actions for browsers with WebMCP support.
const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options?:unknown)=>void|Promise<void>}}).modelContext;
if(context){const lifecycle=new AbortController();const snapshot=()=>({level:selected+1,state:mode,completedStages:journey.completed,money:Math.ceil(money),score,elapsed:Math.round(elapsed),gameMode,players:agents.map((a,i)=>({number:i+1,x:a.person.group.position.x,z:a.person.group.position.z,energy:a.energy,conversation:a.talk})),progress:Math.max(0,Math.round(-Math.max(...agents.map(a=>a.person.group.position.z))/LEVELS[selected].length*100))});for(const tool of [{name:'read_game_state',description:'Read the current level, game state, reais, score and route progress.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>snapshot()},{name:'start_beach_level',description:'Start or restart the specified beach level, resetting money and score.',inputSchema:{type:'object',properties:{level:{type:'integer',minimum:1,maximum:3}},required:['level'],additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{const l=(input as {level:number}).level;if(!Number.isInteger(l)||l<1||l>3)throw new Error('Level must be 1, 2, or 3.');selected=l-1;toggle('paused',false);updateLevelButtons();start();return snapshot();}}])try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
