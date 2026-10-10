# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Tetris en JavaScript vanilla + HTML5 Canvas. Sin `package.json`, sin build, sin linter, sin tests. La UI y el README están en español.

## Ejecutar

Abrir `index.html` directamente en el navegador, o servir la carpeta con cualquier servidor estático (`python -m http.server 8000`, `npx serve .`). No hay comandos de build, lint ni test.

## Arquitectura

Tres archivos cooperan: `index.html` (DOM + canvas), `style.css` (tema oscuro), `game.js` (toda la lógica, script clásico con `'use strict'`, sin módulos).

Puntos de `game.js` que requieren entender el conjunto:

- **Estado global mutable** (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`…) declarado con `let` y reinicializado en `init()`. El botón de reinicio simplemente llama a `init()`.
- **Codificación del tablero y piezas**: `board` es una matriz `ROWS × COLS` con `0` = vacío o un índice 1–7 que sirve a la vez de tipo de pieza e índice en `COLORS`/`PIECES` (ambos con `null` en la posición 0). Las formas de `PIECES` ya contienen su propio índice en vez de `1`, por lo que `drawBlock` y `merge` usan directamente el valor de la celda.
- **Ciclo de una pieza**: `loop` (rAF con acumulador `dropAccum`) o las teclas llaman a `lockPiece()` → `merge()` → `clearLines()` (actualiza puntuación, nivel y `dropInterval`) → `spawn()` (que llama a `endGame()` si la nueva pieza ya colisiona y redibuja la vista previa).
- **Pausa/game over**: ambos cancelan el rAF (`cancelAnimationFrame(animId)`) y muestran el mismo `#overlay`; reanudar reinicia `lastTime` y vuelve a invocar `loop` manualmente. Cualquier cambio en el bucle debe conservar esta gestión de `animId` para no duplicar frames.
- **Rotación**: `rotateCW` + `tryRotate` con wall kicks simples horizontales `[0, -1, 1, -2, 2]` (no es SRS).
- **Puntuación**: `LINE_SCORES × level`; soft drop +1/fila, hard drop +2/celda. Velocidad: `max(100, 1000 − (level−1)·90)` ms.

## Sincronización necesaria

Las dimensiones del canvas `#board` (`300×600`) en `index.html` están fijadas a mano y deben coincidir con `COLS×BLOCK` × `ROWS×BLOCK` de `game.js`. El canvas `#next-canvas` (`120×120`) asume una cuadrícula de 4×4 bloques de 30 px en `drawNext`. Los IDs de DOM se obtienen por `getElementById` al inicio de `game.js`, así que renombrarlos en el HTML rompe el script.
