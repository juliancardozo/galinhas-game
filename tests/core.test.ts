import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canSee,blocksSight,conversationStep,energyStep,outcome} from '../src/core.ts';
test('NPC vision obeys direction, range and cover',()=>{
 const npc={x:0,z:0};
 assert.equal(canSee(npc,0,{x:0,z:8},12,[]),true);
 assert.equal(canSee(npc,0,{x:0,z:-8},12,[]),false);
 assert.equal(canSee(npc,0,{x:0,z:13},12,[]),false);
 assert.equal(canSee(npc,0,{x:0,z:8},12,[{x:0,z:4,radius:1}]),false);
 assert.equal(blocksSight(npc,{x:0,z:8},[{x:3,z:4,radius:1}]),false);
});
test('Conversation has grace period; escaping stops charges and clears tension',()=>{
 let p=0,m=100;for(let i=0;i<10;i++){const c=conversationStep(p,m,true,false,.1);p=c.progress;m=c.money;}
 assert.equal(m,100);
 for(let i=0;i<20;i++){const c=conversationStep(p,m,true,false,.1);p=c.progress;m=c.money;}
 assert.ok(m<100&&m>0);const after=conversationStep(p,m,false,false,2);assert.equal(after.money,m);assert.equal(after.progress,0);
 assert.equal(conversationStep(1,1,true,false,1).money,0);
});
test('Sprint drains while moving and recovery is bounded',()=>{
 assert.equal(energyStep(100,true,true,1),68);assert.equal(energyStep(90,false,true,1),100);assert.equal(energyStep(0,true,true,1),0);
});
test('Finish line wins, empty wallet loses, route remains playable before goal',()=>{
 assert.equal(outcome(80,-140,140),'won');assert.equal(outcome(0,-140,140),'lost');assert.equal(outcome(100,-139,140),null);
});

import {constrainCouple,slideMove,pairOutcome,sharedConversation,sameDirection} from '../src/couple.ts';
import {dist,seedRandom} from '../src/core.ts';
test('Separation never moves a stationary partner and always allows reunion',()=>{
 const a={x:0,z:0},b={x:5,z:0};
 assert.deepEqual(constrainCouple(a,b,{x:-.3,z:0},b),[a,b]);
 assert.deepEqual(constrainCouple(a,b,{x:.3,z:0},b),[{x:.3,z:0},b]);
 const [p,q]=constrainCouple(a,b,{x:.3,z:0},{x:5.4,z:0});assert.deepEqual(p,{x:.3,z:0});assert.ok(dist(p,q)<=5);
 assert.deepEqual(constrainCouple(a,b,{x:0,z:-.3},{x:5,z:-.3}),[{x:0,z:-.3},{x:5,z:-.3}]);
});
test('Simultaneous movement remains within 5m, including tangents and reversals',()=>{
 const rnd=seedRandom(734);
 for(let i=0;i<10000;i++){
  const angle=rnd()*Math.PI*2,r=4+rnd(),a={x:0,z:0},b={x:Math.cos(angle)*r,z:Math.sin(angle)*r};
  const na={x:(rnd()-.5)*.72,z:(rnd()-.5)*.72},nb={x:b.x+(rnd()-.5)*.72,z:b.z+(rnd()-.5)*.72};
  const [pa,pb]=constrainCouple(a,b,na,nb);assert.ok(dist(pa,pb)<=5+1e-8);
  for(const [old,next,res] of [[a,na,pa],[b,nb,pb]]){assert.ok(dist(old,res)<=dist(old,next)+1e-8);}
 }
});
test('Obstacles allow backing out and reuniting; movement cannot tunnel through cover',()=>{
 const obstacles=[{x:0,z:0,radius:1}],a={x:-1.5,z:0},b={x:1.5,z:0};
 assert.deepEqual(slideMove(a,{x:.3,z:0},obstacles),a);
 assert.deepEqual(slideMove(a,{x:0,z:.3},obstacles),{x:-1.5,z:.3});
 const path=[{x:0,z:.3},{x:0,z:1.3},{x:1,z:0},{x:1,z:0},{x:0,z:-.3}];let p=a;
 for(const d of path){const next=slideMove(p,d,obstacles);[p]=constrainCouple(p,b,next,b);assert.ok(dist(p,b)<=5);assert.ok(dist(p,obstacles[0])>=1.42);}
 assert.ok(dist(p,b)<dist(a,b));
 assert.deepEqual(slideMove({x:-2,z:0},{x:4,z:0},obstacles),{x:-2,z:0});
});
test('Shared conversation caps drain and retains independent progress and energy',()=>{
 assert.deepEqual(sharedConversation([1,1],[true,true],[false,false],1),{progress:[1,1],drain:20});
 const r=sharedConversation([.5,1],[false,true],[false,true],.1);assert.ok(r.progress[0]<.5);assert.equal(r.progress[1],1);assert.ok(Math.abs(r.drain-1.6)<1e-8);
 assert.equal(pairOutcome(100,[{x:0,z:-140},{x:1,z:-139}],140),null);
 assert.equal(pairOutcome(100,[{x:0,z:-140},{x:1,z:-140}],140),'won');
 assert.equal(pairOutcome(0,[{x:0,z:-140},{x:1,z:-140}],140),'lost');
 assert.equal(sameDirection({x:1,z:-1},{x:1,z:-1}),true);assert.equal(sameDirection({x:1,z:-1},{x:-1,z:-1}),false);
});

import {completeStage} from '../src/story.ts';
test('Story carries wallet, score and time; each intermediate reward is earned once',()=>{
 let journey={money:80,score:1200,seconds:45,completed:0};
 journey=completeStage(journey,0);assert.deepEqual(journey,{money:110,score:1200,seconds:45,completed:1});
 assert.throws(()=>completeStage(journey,0));assert.throws(()=>completeStage(journey,2));
 journey=completeStage({...journey,money:90,score:2500,seconds:100},1);assert.equal(journey.money,120);
 journey=completeStage({...journey,money:105,score:4800,seconds:180},2);assert.deepEqual(journey,{money:105,score:4800,seconds:180,completed:3});
});

import {DIFFICULTIES,difficultyLevel,difficultyConversation,difficultyEnergy} from '../src/difficulty.ts';
test('Calm preserves original rules; exciting raises pressure without unavoidable sprint catches',()=>{
 for(let i=0;i<3;i++){const a=difficultyLevel(i,'calm'),b=difficultyLevel(i,'exciting');assert.ok(b.npcs>a.npcs);assert.ok(b.radius>a.radius);assert.ok(b.speed>a.speed&&b.speed<7.2*DIFFICULTIES.exciting.penalty);}
 assert.deepEqual(difficultyConversation([1,1],[true,true],[false,false],1,'calm'),{progress:[1,1],drain:20});
 assert.equal(difficultyConversation([1,1],[true,true],[false,false],1,'exciting').drain,22);
 assert.equal(difficultyEnergy(50,false,true,1,'calm'),70);assert.equal(difficultyEnergy(50,false,true,1,'exciting'),68);
});

import {DoubleTap,defenceTarget,defenceEffect,DEFENCE,proximityVolume,voiceInterval} from '../src/verbal.ts';
test('Double tap requires release, ignores repeats, expires and resets across pause',()=>{
 const taps=new DoubleTap();assert.equal(taps.press('KeyW',false,0),false);assert.equal(taps.press('KeyW',true,100),false);assert.equal(taps.press('KeyW',false,150),false);taps.release('KeyW');assert.equal(taps.press('KeyW',false,300),true);
 taps.clear();assert.equal(taps.press('ArrowUp',false,1000),false);taps.release('ArrowUp');assert.equal(taps.press('ArrowUp',false,1400),false);taps.release('ArrowUp');assert.equal(taps.press('ArrowUp',false,1700),true);
 taps.clear();taps.press('KeyW',false,2000);taps.release('KeyW');taps.clear();assert.equal(taps.press('KeyW',false,2200),false);
});
test('Defence prioritizes a nearby partner; shared resistance blocks alternating farming',()=>{
 const people=[{x:0,z:0},{x:1,z:0}],threats=[{position:{x:0,z:1},state:'CHASE' as const,targetPlayer:0,resistUntil:0},{position:{x:1,z:2},state:'TALK' as const,targetPlayer:1,resistUntil:0}];
 assert.deepEqual(defenceTarget(0,people,threats,0),{index:1,defended:1});threats[1].resistUntil=10;assert.equal(defenceTarget(1,people,threats,1),null);assert.deepEqual(defenceTarget(0,people,threats,1),{index:0,defended:0});
 threats[0].resistUntil=10;assert.equal(defenceTarget(0,people,threats,2),null);assert.equal(defenceTarget(0,[people[0],{x:6,z:0}],threats,11)?.defended,0);
 assert.ok(defenceEffect(1,'exciting')>defenceEffect(1,'calm'));assert.ok(defenceEffect(1,'calm')>0);assert.ok(DEFENCE.calm.resistance>DEFENCE.calm.cooldown);
});
test('Proximity volume is bounded, continuous and increases as vendor approaches',()=>{
 assert.equal(proximityVolume(14),0);assert.equal(proximityVolume(20),0);assert.equal(proximityVolume(2),1);assert.equal(proximityVolume(0),1);
 assert.ok(proximityVolume(5)>proximityVolume(10));let previous=1;for(let d=0;d<=15;d+=.01){const volume=proximityVolume(d);assert.ok(volume>=0&&volume<=1);assert.ok(volume<=previous+1e-8);assert.ok(Math.abs(volume-previous)<.01);previous=volume;}
 assert.ok(voiceInterval('TALK','exciting',.5)<voiceInterval('PATROL','exciting',.5));assert.ok(voiceInterval('CHASE','calm',.5)>voiceInterval('CHASE','exciting',.5));
});
import {BeachVoices} from '../src/voices.ts';
test('Audio updates an ongoing clip, caps concurrency and clears playback on pause/mute/failure',async()=>{
 const params:any[]=[];const param=()=>{const p={value:0,last:0,setTargetAtTime(v:number){this.last=v;}};params.push(p);return p;};
 const sources:any[]=[];const node=()=>({connect(){return this;},disconnect(){}});
 const ctx:any={state:'running',currentTime:1,destination:{},decodeAudioData:async()=>({}),createGain:()=>({...node(),gain:param()}),createStereoPanner:()=>({...node(),pan:param()}),createBufferSource:()=>{const source={...node(),playbackRate:{value:1},onended:null,stopped:false,start(){},stop(){this.stopped=true;}};sources.push(source);return source;}};
 const voices=new BeachVoices();voices.attach(ctx);await new Promise(resolve=>setTimeout(resolve,0));voices.configure(true,.6,true);
 const at=(id:number,distance:number,state:any='PATROL')=>({id,distance,pan:.4,state});assert.equal(voices.play(0,at(0,10)),true);const gain=params[0];assert.ok(gain.value<.2);voices.update([at(0,2)]);assert.equal(gain.last,.6);
 assert.equal(voices.play(1,at(1,5)),true);assert.equal(voices.play(2,at(2,5)),false);assert.equal(voices.play(2,at(2,4,'TALK')),true);assert.equal(voices.count,2);assert.equal(sources[0].stopped,true);
 voices.configure(true,.6,false);assert.equal(voices.count,0);assert.equal(voices.play(0,at(0,2)),false);voices.configure(true,.6,true);voices.play(0,at(0,2));voices.configure(false,.6,true);assert.equal(voices.count,0);
 const broken=new BeachVoices();broken.attach({...ctx,decodeAudioData:async()=>{throw Error('unsupported');}});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(broken.failed,true);assert.equal(broken.count,0);
});
