import {dist,conversationStep,type Point} from './core.ts';
export const MAX_DISTANCE=5;
export const WARNING_DISTANCE=3;
// Reduce only each person's requested movement. Never move the other person.
// Inward moves are kept in full; outward moves share the available distance.
export function constrainCouple(a:Point,b:Point,nextA:Point,nextB:Point):[Point,Point]{
 if(dist(nextA,nextB)<=MAX_DISTANCE)return [nextA,nextB];
 const da={x:nextA.x-a.x,z:nextA.z-a.z},db={x:nextB.x-b.x,z:nextB.z-b.z};
 let outA=dist(nextA,b)>dist(a,b),outB=dist(a,nextB)>dist(a,b);
 const at=(t:number):[Point,Point]=>[{x:a.x+da.x*(outA?t:1),z:a.z+da.z*(outA?t:1)},{x:b.x+db.x*(outB?t:1),z:b.z+db.z*(outB?t:1)}];
 const base=at(0);if(dist(base[0],base[1])>MAX_DISTANCE){outA=true;outB=true;}
 let lo=0,hi=1;
 for(let i=0;i<32;i++){const mid=(lo+hi)/2,[pa,pb]=at(mid);if(dist(pa,pb)<=MAX_DISTANCE)lo=mid;else hi=mid;}
 return at(lo);
}
export function sameDirection(a:Point,b:Point){const norm=Math.hypot(a.x,a.z)*Math.hypot(b.x,b.z);return norm>.01&&(a.x*b.x+a.z*b.z)/norm>.7;}

export function slideMove(from:Point,delta:Point,solids:{x:number,z:number,radius:number}[]):Point{
 const legal=(p:Point)=>{
  if(p.x< -21||p.x>20.5||p.z>8)return false;
  const dx=p.x-from.x,dz=p.z-from.z,length=dx*dx+dz*dz;
  return !solids.some(o=>{const t=length?Math.max(0,Math.min(1,((o.x-from.x)*dx+(o.z-from.z)*dz)/length)):0;return Math.hypot(from.x+t*dx-o.x,from.z+t*dz-o.z)<o.radius+.42-.00001;});
 };
 const full={x:from.x+delta.x,z:from.z+delta.z};if(legal(full))return full;
 const x={x:full.x,z:from.z},z={x:from.x,z:full.z};
 if(legal(x))return x;if(legal(z))return z;return {...from};
}
export function pairOutcome(money:number,positions:Point[],length:number){return money<=0?'lost':positions.every(p=>p.z<=-length)?'won':null;}
export function sharedConversation(progress:number[],talking:boolean[],sprinting:boolean[],dt:number){
 let drain=0;const next=progress.map((p,i)=>{const r=conversationStep(p,100,talking[i],sprinting[i],dt);drain+=100-r.money;return r.progress;});
 return {progress:next,drain:Math.min(drain,(progress.length===2?20:16)*dt)};
}
