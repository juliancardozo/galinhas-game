import {dist,type Point,type State} from './core.ts';
import type {Difficulty} from './difficulty.ts';
export const DEFENCE_PHRASE='Ya tenemos sombrilla, gracias.';
export const DEFENCE={calm:{duration:1.15,reduction:.3,cooldown:8,resistance:10},exciting:{duration:.8,reduction:.2,cooldown:8,resistance:11}} as const;
export class DoubleTap {
 private held=new Set<string>();private taps=new Map<string,number>();
 press(code:string,repeat:boolean,now:number){if(repeat||this.held.has(code))return false;this.held.add(code);const previous=this.taps.get(code);this.taps.set(code,now);if(previous!==undefined&&now-previous<=350&&now>=previous){this.taps.delete(code);return true;}return false;}
 release(code:string){this.held.delete(code);}
 clear(){this.held.clear();this.taps.clear();}
}
export type Threat={position:Point,state:State,targetPlayer:number,resistUntil:number};
export function defenceTarget(player:number,players:Point[],threats:Threat[],now:number){
 const other=player===0?1:0,friend=players[other];
 const canHelp=friend&&dist(players[player],friend)<2.5;
 const candidates=threats.map((n,index)=>({n,index,distance:dist(players[player],n.position)})).filter(({n,distance})=>distance<4&&n.resistUntil<=now&&['SUSPICIOUS','CHASE','TALK'].includes(n.state));
 const partner=candidates.filter(({n})=>canHelp&&n.targetPlayer===other&&n.state==='TALK').sort((a,b)=>a.distance-b.distance)[0];
 const self=candidates.filter(({n})=>n.targetPlayer===player).sort((a,b)=>Number(b.n.state==='TALK')-Number(a.n.state==='TALK')||a.distance-b.distance)[0];
 const chosen=partner??self;return chosen?{index:chosen.index,defended:partner?other:player}:null;
}
export function defenceEffect(progress:number,difficulty:Difficulty){return Math.max(0,progress-DEFENCE[difficulty].reduction);}
export function proximityVolume(distance:number){
 if(distance>=14)return 0;if(distance<=2)return 1;
 const points=[[2,1],[5,.68],[10,.18],[14,0]];
 for(let i=1;i<points.length;i++){const [x1,y1]=points[i-1],[x2,y2]=points[i];if(distance<=x2){const t=(distance-x1)/(x2-x1),smooth=t*t*(3-2*t);return y1+(y2-y1)*smooth;}}return 0;
}
export function voiceInterval(state:State,difficulty:Difficulty,random:number){
 const range=state==='TALK'?[1.5,2.2]:state==='CHASE'?[2,3]:[6,10];
 return (range[0]+Math.max(0,Math.min(1,random))*(range[1]-range[0]))*(difficulty==='calm'?1.3:1);
}
export const voicePriority=(state:State)=>state==='TALK'?3:state==='CHASE'?2:state==='SUSPICIOUS'?1:0;
