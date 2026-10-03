export const STAGE_REWARD=30;
export const STORY=[
 {title:'01 · EL PRIMER CHAPUZÓN',intro:'Llegamos a Porto con R$100. El mar está cerca, pero cada sombrillero tiene un plan para nuestra billetera.',ending:'Encontramos la orilla y ayudamos a ordenar unas tablas de surf. Nos dieron R$30. ¡Vamos a las piscinas!',reward:30},
 {title:'02 · ENTRE PECES Y SOMBRILLAS',intro:'Las piscinas naturales nos esperan. Elegimos el mismo lado, usamos las coberturas y cuidamos los reais del paseo.',ending:'Llegamos a las piscinas y ayudamos con las fotos de un paseo. Ganamos R$30 para seguir hasta el embarque.',reward:30},
 {title:'03 · EL ÚLTIMO PASEO',intro:'Una última caminata hasta las jangadas. Hay más vendedores y menos tiempo para discutir. ¡Juntos hasta el final!',ending:'Llegamos al embarque. Nos llevamos las fotos, los recuerdos y los reais que supimos cuidar. ¡Vacaciones completas!',reward:0},
] as const;
export type Journey={money:number,score:number,seconds:number,completed:number};
export function completeStage(journey:Journey,stage:number):Journey{
 if(!Number.isInteger(stage)||stage!==journey.completed||stage<0||stage>2)throw Error('Etapa fuera de orden.');
 return {...journey,money:journey.money+STORY[stage].reward,completed:stage+1};
}
