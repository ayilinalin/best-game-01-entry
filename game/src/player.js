// EMBERFALL — the torch-bearer: keyboard (arrows / WASD) and mouse
// movement, clamped to the camp clearing, with a smooth glide.
import { CONFIG } from './config.js';

export function createPlayer() {
  return {
    x: CONFIG.canvasWidth / 2,
    targetX: CONFIG.canvasWidth / 2,
    usingMouse: false,
    movingLeft: false,
    movingRight: false,
    flicker: 0,
  };
}

export function attachPlayerInput(player, canvas, onFirstGesture) {
  function noteGesture() {
    if (onFirstGesture) onFirstGesture();
  }
  window.addEventListener('keydown', (event) => {
    noteGesture();
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') player.movingLeft = true;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') player.movingRight = true;
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') player.movingLeft = false;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') player.movingRight = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    noteGesture();
    const rect = canvas.getBoundingClientRect();
    const scale = CONFIG.canvasWidth / rect.width;
    player.targetX = (event.clientX - rect.left) * scale;
    player.usingMouse = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    noteGesture();
    const rect = canvas.getBoundingClientRect();
    const scale = CONFIG.canvasWidth / rect.width;
    player.targetX = (event.clientX - rect.left) * scale;
    player.usingMouse = true;
  });
}

export function updatePlayer(player, deltaSeconds) {
  const half = CONFIG.playerWidth / 2;
  if (player.usingMouse) {
    const distance = player.targetX - player.x;
    player.x += distance * Math.min(1, deltaSeconds * 14);
  } else {
    if (player.movingLeft) player.x -= CONFIG.playerSpeed * deltaSeconds;
    if (player.movingRight) player.x += CONFIG.playerSpeed * deltaSeconds;
  }
  player.x = Math.max(half, Math.min(CONFIG.canvasWidth - half, player.x));
  player.flicker += deltaSeconds;
}

export function playerCatches(player, item, radius) {
  const dx = Math.abs(item.x - player.x);
  const verticalGap = Math.abs(item.y - CONFIG.playerY);
  return dx < CONFIG.playerWidth / 2 + radius * 0.6 && verticalGap < 34;
}
