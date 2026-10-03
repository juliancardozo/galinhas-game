export type Point = { x: number; z: number };
export type Cover = Point & { radius: number };
export type State = 'IDLE' | 'PATROL' | 'SUSPICIOUS' | 'CHASE' | 'TALK' | 'RETURN';
export const LEVELS = [
 {name:'PRAIA CENTRO',destination:'MAR',length:140,npcs:5,radius:12,speed:2.55,seed:12},
 {name:'PISCINAS NATURALES',destination:'PISCINAS',length:170,npcs:9,radius:13,speed:2.8,seed:24},
 {name:'ZONA DE EMBARQUE',destination:'EMBARQUE',length:195,npcs:13,radius:14,speed:3.05,seed:36},
];
export const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function blocksSight(a:Point,b:Point,cover:Cover[]):boolean{
 const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
 return cover.some(o=>{const t=((o.x-a.x)*dx+(o.z-a.z)*dz)/l;if(t<=0.04||t>=.96)return false;return Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z)<o.radius;});
}
export function canSee(a:Point,heading:number,b:Point,radius:number,cover:Cover[]):boolean{
 const distance=dist(a,b); if(distance>radius)return false;
 const dot=((b.x-a.x)*Math.sin(heading)+(b.z-a.z)*Math.cos(heading))/(distance||1);
 return (distance<2.4||dot>Math.cos(Math.PI/3.1))&&!blocksSight(a,b,cover);
}
export function seedRandom(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function conversationStep(progress:number,money:number,talking:boolean,sprinting:boolean,dt:number){
 const p=Math.max(0,Math.min(1,progress+(talking?(sprinting?.27:.48):-.9)*dt));
 return {progress:p,money:Math.max(0,money-(talking&&p>.55?16*dt:0))};
}
export function energyStep(energy:number,sprint:boolean,moving:boolean,dt:number){return Math.max(0,Math.min(100,energy+(sprint&&moving?-32:20)*dt));}
export function outcome(money:number,z:number,length:number):'lost'|'won'|null{if(money<=0)return'lost';if(z<=-length)return'won';return null;}
