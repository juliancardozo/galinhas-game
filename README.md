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

## Voces y defensa verbal

Activar **SONIDO ON**. Las cinco frases de vendedores, “Mas tem WiFi!” y “Ya tenemos sombrilla, gracias.” se incluyen como clips MP3 sintetizados previamente con eSpeak NG 1.51 (pt-br y es). Es una voz sintética provisional, no una grabación de actor. Web Audio decodifica los clips al primer gesto; GainNode actualiza el volumen durante cada frase y StereoPannerNode sigue la posición respecto de la cámara. Sin StereoPannerNode se reproduce en mono; si falta Web Audio o falla la decodificación, quedan los globos y el juego sigue. No hay solicitudes a un servicio de voz durante la partida.

Volumen: máximo configurado hasta 2 m, 68% a 5 m, 18% a 10 m y silencio a 14 m. Curvas suaves y paneo limitado a ±0,65. Máximo dos voces, prioridad de conversación/persecución y ninguna cola. **AJUSTES** permite regular voces y ambiente por separado; pausa, desenfoque, capítulos, resultados y reinicios cortan las voces.

Respuesta: **1: W,W o Q; 2: ↑,↑ o punto**. Dos pulsaciones con liberación en 350 ms; mantener la tecla no dispara respuestas. Alternativas configurables sin conflictos con sprint. En individual también hay un botón táctil. A menos de 4 m se prioriza al vendedor que conversa con el compañero, siempre que la pareja esté a menos de 2,5 m. La respuesta reduce tensión y provoca una breve duda, conservando la conversación y la vulnerabilidad frente a otros vendedores. Cooldown 8 s; resistencia del vendedor compartida 10/11 s; sin puntos por hablar. Sin emoción: duda 1,15 s, reducción 0,30. Con emoción: duda 0,8 s, reducción 0,20.

Validación: pruebas de doble toque, resistencia compartida, límite de dos voces, volumen continuo y limpieza en pausa/fallo, más integración del módulo real con DOM/WebGL simulado. Los siete clips se decodificaron con ffmpeg y duran entre 0,86 y 2,12 s. Falta escucha y prueba visual en los navegadores de los jugadores para ajustar naturalidad, mezcla y ritmo.
