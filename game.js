'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// ---- Skins ----
// Cada skin aporta su paleta (índices 1-8, null en 0) y su función de pintado de un bloque.
// El alpha, el reseteo de sombras y el índice vacío los gestiona drawBlock().
function roundedPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#64b5f6', // J - light blue
      '#ffb74d', // L - orange
      '#f06292', // R - pink (reto)
    ],
    drawBlock(context, x, y, color, size) {
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    },
  },
  neon: {
    label: 'Neon',
    colors: [
      null,
      '#00f0ff', '#ffee00', '#d500f9', '#39ff14',
      '#ff1744', '#2979ff', '#ff9100', '#ff4fa3',
    ],
    drawBlock(context, x, y, color, size) {
      const px = x * size + 3, py = y * size + 3, s = size - 6;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.fillStyle = 'rgba(0,0,0,0.85)';
      context.fillRect(px, py, s, s);
      context.fillStyle = color + '59'; // relleno tenue (alpha ~0.35)
      context.fillRect(px, py, s, s);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px, py, s, s);
    },
  },
  pastel: {
    label: 'Pastel',
    colors: [
      null,
      '#a8e6ef', '#fff1b0', '#d9b8f0', '#b8e8c0',
      '#f7b5b5', '#b3d4f7', '#fcd5a5', '#f8bbd0',
    ],
    drawBlock(context, x, y, color, size) {
      const r = size * 0.28;
      roundedPath(context, x * size + 2, y * size + 2, size - 4, size - 4, r);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.55)';
      context.lineWidth = 1.5;
      roundedPath(context, x * size + 4, y * size + 4, size - 8, size - 8, r * 0.6);
      context.stroke();
    },
  },
  pixel: {
    label: 'Pixel art',
    colors: [
      null,
      '#2bb5c9', '#e8b923', '#9b3fb5', '#3fa34d',
      '#d63c3c', '#3b78d8', '#e8892b', '#d9407f',
    ],
    drawBlock(context, x, y, color, size) {
      const bx = x * size + 1, by = y * size + 1, s = size - 2;
      const cell = s / 6; // textura de 6x6 "píxeles"
      context.fillStyle = color;
      context.fillRect(bx, by, s, s);
      // textura: damero de tonos claros y oscuros
      for (let r = 1; r < 5; r++) {
        for (let c = 1; c < 5; c++) {
          if ((r + c) % 2 === 0) continue;
          context.fillStyle = (r * 3 + c) % 3 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
          context.fillRect(bx + c * cell, by + r * cell, cell, cell);
        }
      }
      // bisel: claro arriba/izquierda, oscuro abajo/derecha
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fillRect(bx, by, s, cell);
      context.fillRect(bx, by, cell, s);
      context.fillStyle = 'rgba(0,0,0,0.45)';
      context.fillRect(bx, by + s - cell, s, cell);
      context.fillRect(bx + s - cell, by, cell, s);
    },
  },
};
const DEFAULT_SKIN = 'retro';

function readSkin() {
  let key = null;
  try { key = localStorage.getItem('skin'); } catch (e) { /* almacenamiento no disponible */ }
  return Object.prototype.hasOwnProperty.call(SKINS, key) ? key : DEFAULT_SKIN;
}

let skinKey = readSkin();
let COLORS = SKINS[skinKey].colors; // paleta de la skin activa
const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // R (reto: anillo 3x3)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const CHALLENGE_CHANCE = 0.1; // probabilidad de la pieza reto 3x3
const CLEAR_DELAY = 200; // ms que se iluminan las filas completas antes de borrarse

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, clearingRows, clearAccum;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.random() < CHALLENGE_CHANCE ? 8 : Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function findFullRows() {
  const rows = [];
  for (let r = 0; r < ROWS; r++)
    if (board[r].every(v => v !== 0)) rows.push(r);
  return rows;
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const full = findFullRows();
  if (full.length) {
    // fase de iluminado: el borrado y el spawn ocurren en loop() tras CLEAR_DELAY
    clearingRows = full;
    clearAccum = 0;
    current = null;
    return;
  }
  spawn();
}

function spawn() {
  current = next;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  next = randomPiece();
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  context.save();
  context.globalAlpha = alpha ?? 1;
  SKINS[skinKey].drawBlock(context, x, y, COLORS[colorIndex], size);
  context.restore(); // restaura globalAlpha, shadowBlur y shadowColor
}
function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (current) {
    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }

  // filas completas iluminadas antes de borrarse
  if (clearingRows) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const r of clearingRows)
      ctx.fillRect(0, r * BLOCK, COLS * BLOCK, BLOCK);
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (clearingRows) {
    clearAccum += dt;
    if (clearAccum >= CLEAR_DELAY) {
      clearingRows = null;
      clearLines();
      spawn();
    }
  } else {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  clearingRows = null;
  clearAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver || clearingRows) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

function updateThemeBtn() {
  themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch (e) { /* almacenamiento no disponible */ }
  updateThemeBtn();
  // con pausa o game over el rAF está cancelado: repintar manualmente
  draw();
  drawNext();
}

themeBtn.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  themeBtn.blur(); // evita que Space (hardDrop) active el botón enfocado
});

function applySkin(key) {
  if (!Object.prototype.hasOwnProperty.call(SKINS, key)) key = DEFAULT_SKIN;
  skinKey = key;
  COLORS = SKINS[key].colors;
  document.documentElement.dataset.skin = key;
  skinSelect.value = key;
  try { localStorage.setItem('skin', key); } catch (e) { /* almacenamiento no disponible */ }
  // con pausa o game over el rAF está cancelado: repintar manualmente
  draw();
  drawNext();
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  skinSelect.blur(); // evita que Space/flechas sigan actuando sobre el selector
});
// mientras el selector tiene el foco, sus teclas no llegan al juego
skinSelect.addEventListener('keydown', e => e.stopPropagation());

init();
updateThemeBtn();
document.documentElement.dataset.skin = skinKey;
skinSelect.value = skinKey;
