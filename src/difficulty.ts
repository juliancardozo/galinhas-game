import {LEVELS} from './core.ts';
export type Difficulty='calm'|'exciting';
export const DIFFICULTIES={
 calm:{label:'SIN EMOCIÓN',version:'calm-v1',counts:[5,9,13],speed:1,radius:1,suspicion:.42,memory:1.7,talkSpeed:.75,penalty:.72,help:.86,charge:16,cap:20,tension:.48,sprintTension:.27,recovery:20,energyDrain:32},
 exciting:{label:'CON EMOCIÓN',version:'exciting-v1',counts:[7,12,17],speed:1.22,radius:1.12,suspicion:.3,memory:2.5,talkSpeed:.82,penalty:.68,help:.84,charge:18,cap:22,tension:.54,sprintTension:.3,recovery:18,energyDrain:32},
} as const;
export function difficultyLevel(level:number,difficulty:Difficulty){const p=DIFFICULTIES[difficulty],base=LEVELS[level];return {...base,npcs:p.counts[level],radius:base.radius*p.radius,speed:base.speed*p.speed};}
export function difficultyConversation(progress:number[],talking:boolean[],sprint:boolean[],dt:number,difficulty:Difficulty){
 const rules=DIFFICULTIES[difficulty];let drain=0;
 const next=progress.map((p,i)=>{const v=Math.max(0,Math.min(1,p+(talking[i]?(sprint[i]?rules.sprintTension:rules.tension):-.9)*dt));if(talking[i]&&v>.55)drain+=rules.charge*dt;return v;});
 return {progress:next,drain:Math.min(drain,(progress.length===2?rules.cap:rules.charge)*dt)};
}
export function difficultyEnergy(energy:number,sprint:boolean,moving:boolean,dt:number,difficulty:Difficulty){const p=DIFFICULTIES[difficulty];return Math.max(0,Math.min(100,energy+(sprint&&moving?-p.energyDrain:p.recovery)*dt));}
