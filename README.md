# Sombrilleros: Escape de Porto

MVP arcade web 3D de evasión en Porto de Galinhas. TypeScript, Vite y Three.js, sin backend.

## Ejecutar

```sh
npm install
npm run dev
```

Abrir la dirección que indica Vite. `npm run build` genera `dist/`; `npm test` verifica reglas de visión, cobertura, conversación, energía y resultado.

## Jugar

WASD o flechas: movimiento. Shift: sprint. Escape: pausa. R: reiniciar. Enter: iniciar o repetir. También incluye botones táctiles.

Llegar a la bandera amarilla conservando reais. Los conos amarillos muestran visión; los rojos indican persecución. Sombrillas, grupos y carritos bloquean visión. Una conversación llena tensión y luego descuenta reales; sprint ayuda a salir. Cambiar rápido de lado puede despistar a los perseguidores. Pasar cerca y escapar da puntos y combos.

Tres niveles con geometría procedural: Praia centro (5 vendedores), piscinas naturales (9), embarque (13). Personajes animados con geometría simple. Audio sintético y ambiente opcional. Sin modelos o muestras externos. El logo del vendedor se configura en `vendorBrand` dentro de `src/main.ts`.

## Alcance y validación

Pruebas automatizadas de las reglas principales y compilación TypeScript. La infraestructura de vista previa visual no estaba disponible durante la primera entrega: faltan comprobación visual en navegador y medición de FPS. Se recomienda validar el equilibrio de rutas, los controles móviles y el ritmo de los tres niveles con partidas reales. Es un prototipo, con modelos y audio provisionales.

## Estructura

- `src/core.ts`: reglas y configuración de niveles.
- `src/main.ts`: escena, personajes, IA, movimiento, audio, cámara, interfaz.
- `src/style.css`: interfaz adaptable.
- `tests/core.test.ts`: pruebas de reglas.

## GitHub Pages

URL de publicación: https://juliancardozo.github.io/galinhas-game/

En el repositorio, activar **Settings → Pages → Build and deployment → Source: GitHub Actions**. El workflow `Publish game to GitHub Pages` prueba, compila y publica cada push a `main`. También se puede ejecutar desde **Actions → Publish game to GitHub Pages → Run workflow**.

La ruta de los assets se configura con `base: '/galinhas-game/'` en `vite.config.ts`. Para otro repositorio o un dominio propio, ajustar esa ruta.

## Ranking arcade y analíticas

Todas las partidas iniciadas y finalizadas de esta versión se guardan en un servicio global con D1. Al superar el mejor puntaje registrado en el mismo navegador y playa, el jugador puede ingresar un nombre de 2 a 12 caracteres. No hace falta iniciar sesión para jugar. La tabla pública muestra los 50 mejores registros, con filtros por playa y por puntos, tiempo (solo victorias) o reales finales.

Backend y ranking: https://galinhas-arcade-service.juli-ai.chatgpt.site/

Dashboard privado: https://galinhas-arcade-service.juli-ai.chatgpt.site/admin

El dashboard exige Sign in with ChatGPT y una cuenta autorizada en `ADMIN_EMAIL`. Muestra iniciadas, finalizadas, victorias, derrotas, promedios, actividad diaria, país aproximado, dispositivo y sitio de origen. No guarda IPs en los registros. Las partidas anteriores a esta versión no se pueden recuperar. Las iniciadas sin resultado incluyen abandonos y partidas en curso.

El servicio se publica por separado y su código se mantiene fuera de este repositorio público; GitHub Pages solo publica el juego. Las claves administrativas y de rate limiting son secretas del servidor. Los resultados se validan y el guardado es idempotente, pero el gameplay calculado por el cliente aún permite manipular valores plausibles: no es antitrampa completo.
