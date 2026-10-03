import {VOICE_CLIPS} from './voice-clips.ts';
import {proximityVolume,voicePriority} from './verbal.ts';
import type {State} from './core';
export type VoicePosition={id:number,distance:number,pan:number,state:State};
type Playing={id:number,source:AudioBufferSourceNode,gain:GainNode,pan?:StereoPannerNode,priority:number};
// Clips are synthesized ahead of time so volume/panning keep updating mid-word.
// No browser speech queue or external service is needed during gameplay.
export class BeachVoices {
 private context?:AudioContext;private buffers:AudioBuffer[]=[];private loading?:Promise<void>;
 private playing:Playing[]=[];private enabled=false;private active=false;private level=.6;
 failed=false;
 attach(context:AudioContext){
  if(this.context===context)return;this.context=context;
  this.loading=Promise.all(VOICE_CLIPS.map(async clip=>{
   const bytes=Uint8Array.from(atob(clip.data),c=>c.charCodeAt(0));return context.decodeAudioData(bytes.buffer);
  })).then(buffers=>{this.buffers=buffers;}).catch(()=>{this.failed=true;this.stopAll();});
 }
 configure(enabled:boolean,level:number,active:boolean){this.enabled=enabled;this.level=Math.max(0,Math.min(1,level));this.active=active;if(!enabled||!active||this.level===0)this.stopAll();}
 get ready(){return this.buffers.length===VOICE_CLIPS.length;}
 busy(id:number){return this.playing.some(p=>p.id===id);}
 get count(){return this.playing.length;}
 canPlay(){return this.enabled&&this.active&&this.level>0&&this.context?.state==='running'&&this.ready;}
 play(clip:number,position:VoicePosition,rate=1){
  const ctx=this.context;if(!ctx||!this.canPlay()||this.busy(position.id)||position.distance>=14||!this.buffers[clip])return false;
  const priority=position.id<0?4:voicePriority(position.state);
  if(this.playing.length>=2){
   const lower=this.playing.filter(p=>p.priority<priority).sort((a,b)=>a.priority-b.priority)[0];
   if(!lower)return false;this.stop(lower);
  }
  try{
   const source=ctx.createBufferSource(),gain=ctx.createGain();
   const pan=typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():undefined;
   source.buffer=this.buffers[clip];source.playbackRate.value=Math.max(.95,Math.min(1.16,rate));
   gain.gain.value=this.level*proximityVolume(position.distance);
   source.connect(gain);if(pan){pan.pan.value=Math.max(-.65,Math.min(.65,position.pan));gain.connect(pan).connect(ctx.destination);}else gain.connect(ctx.destination);
   const playing={id:position.id,source,gain,pan,priority};this.playing.push(playing);
   source.onended=()=>this.cleanup(playing);source.start();return true;
  }catch{this.failed=true;this.stopAll();return false;}
 }
 update(positions:VoicePosition[]){
  if(!this.canPlay()){this.stopAll();return;}
  const now=this.context!.currentTime;
  for(const p of [...this.playing]){
   const position=positions.find(v=>v.id===p.id);if(!position||position.distance>=14){this.stop(p);continue;}
   p.priority=p.id<0?4:voicePriority(position.state);
   p.gain.gain.setTargetAtTime(this.level*proximityVolume(position.distance),now,.08);
   p.pan?.pan.setTargetAtTime(Math.max(-.65,Math.min(.65,position.pan)),now,.1);
  }
 }
 stopAll(){for(const p of [...this.playing])this.stop(p);}
 private stop(p:Playing){try{p.source.stop();}catch{}this.cleanup(p);}
 private cleanup(p:Playing){this.playing=this.playing.filter(v=>v!==p);p.source.onended=null;try{p.source.disconnect();p.gain.disconnect();p.pan?.disconnect();}catch{}}
}
