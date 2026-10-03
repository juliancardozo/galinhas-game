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
