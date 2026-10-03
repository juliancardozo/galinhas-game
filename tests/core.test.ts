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
