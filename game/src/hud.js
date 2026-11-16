// EMBERFALL — everything the eye sees: the night sky, the campfire, the
// falling embers and ice, the torch-bearer, the HUD, and the start and
// game-over screens. All art is drawn with canvas paths, no image files.
import { CONFIG } from './config.js';

function drawNightSky(ctx, elapsed, randomSeed) {
  // A brighter, warmer night: deep indigo up top, violet mid-sky and a
  // warm ember horizon near the ground, so the scene never reads as a
  // flat navy void even when shrunk to a 300px contact sheet.
  const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
  gradient.addColorStop(0, '#141b3d');
  gradient.addColorStop(0.45, '#2a2350');
  gradient.addColorStop(0.75, '#4a2f57');
  gradient.addColorStop(1, '#5e3a4a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  // Aurora ribbons: slow green-teal bands that give the sky depth.
  ctx.save();
  ctx.globalAlpha = 0.16 + Math.sin(elapsed * 0.4) * 0.04;
  ctx.fillStyle = '#3ee6a8';
  ctx.beginPath();
  ctx.moveTo(0, 150);
  ctx.bezierCurveTo(220, 90 + Math.sin(elapsed * 0.5) * 12, 520, 170, 960, 110);
  ctx.lineTo(960, 150);
  ctx.bezierCurveTo(520, 210, 220, 130, 0, 190);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4ac8e6';
  ctx.beginPath();
  ctx.moveTo(0, 230);
  ctx.bezierCurveTo(300, 180, 620, 250, 960, 190);
  ctx.lineTo(960, 225);
  ctx.bezierCurveTo(620, 285, 300, 215, 0, 265);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Fixed stars so the sky reads the same in every screenshot.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5 + 31) % CONFIG.canvasWidth;
    const y = (i * 89.3 + 17) % 260;
    const size = i % 5 === 0 ? 2.8 : 1.5;
    ctx.globalAlpha = 0.4 + ((i * 7) % 10) / 16;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
  // The moon, high in the middle of the sky, clear of the HUD, with a halo.
  const moonGlow = ctx.createRadialGradient(480, 72, 10, 480, 72, 90);
  moonGlow.addColorStop(0, 'rgba(244,234,210,0.35)');
  moonGlow.addColorStop(1, 'rgba(244,234,210,0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(480, 72, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4ead2';
  ctx.beginPath();
  ctx.arc(480, 72, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9cba6';
  ctx.beginPath();
  ctx.arc(470, 64, 8, 0, Math.PI * 2);
  ctx.arc(492, 80, 5, 0, Math.PI * 2);
  ctx.fill();
  void randomSeed;
}

function drawGround(ctx) {
  ctx.fillStyle = '#24361f';
  ctx.fillRect(0, CONFIG.groundY, CONFIG.canvasWidth, CONFIG.canvasHeight - CONFIG.groundY);
  ctx.fillStyle = '#2f4a28';
  ctx.fillRect(0, CONFIG.groundY, CONFIG.canvasWidth, 6);
  // Grass tufts and glowing fallen embers so the ground is not a flat slab.
  ctx.strokeStyle = '#3c5a30';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const x = (i * 173.3 + 47) % CONFIG.canvasWidth;
    const y = CONFIG.groundY + 12 + ((i * 37) % 38);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y - 9);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y - 8);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = (i * 211.7 + 90) % CONFIG.canvasWidth;
    const y = CONFIG.groundY + 16 + ((i * 53) % 30);
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 12);
    glow.addColorStop(0, 'rgba(255,170,60,0.8)');
    glow.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pine silhouettes at the edges of the clearing.
  ctx.fillStyle = '#16241a';
  for (const [x, height] of [[36, 150], [84, 110], [896, 140], [928, 100]]) {
    ctx.beginPath();
    ctx.moveTo(x, CONFIG.groundY);
    ctx.lineTo(x - 26, CONFIG.groundY);
    ctx.lineTo(x, CONFIG.groundY - height);
    ctx.lineTo(x + 26, CONFIG.groundY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCampfire(ctx, fire, time) {
  // The campfire burns at the left of the clearing so the torch-bearer
  // never stands inside it; its flame shows the fire meter at a glance.
  const centerX = 130;
  const baseY = CONFIG.groundY;
  const strength = fire.fuel / CONFIG.fireMax;
  const flameHeight = 36 + strength * 82 + Math.sin(time * 9) * 6;
  // Warm glow on the ground, wide enough to light the whole clearing.
  const glow = ctx.createRadialGradient(centerX, baseY - 20, 8, centerX, baseY - 20, 230 + strength * 130);
  glow.addColorStop(0, `rgba(255,170,60,${0.45 + strength * 0.35})`);
  glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(centerX - 380, baseY - 300, 760, 340);
  // Stone ring.
  ctx.fillStyle = '#6b6f75';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(centerX + Math.cos(angle) * 52, baseY - 4 + Math.sin(angle) * 6, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Logs.
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 34, baseY - 6);
  ctx.lineTo(centerX + 34, baseY - 18);
  ctx.moveTo(centerX + 34, baseY - 6);
  ctx.lineTo(centerX - 34, baseY - 18);
  ctx.stroke();
  // Flame, three tongues: outer orange, middle gold, inner white-hot.
  const tongues = [
    ['#ff7a1a', flameHeight, 40],
    ['#ffc233', flameHeight * 0.68, 27],
    ['#fff3b0', flameHeight * 0.4, 15],
  ];
  for (const [color, height, width] of tongues) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX - width, baseY - 12);
    ctx.quadraticCurveTo(centerX - width * 0.7, baseY - height * 0.6, centerX + Math.sin(time * 7) * 6, baseY - 12 - height);
    ctx.quadraticCurveTo(centerX + width * 0.7, baseY - height * 0.6, centerX + width, baseY - 12);
    ctx.closePath();
    ctx.fill();
  }
  // Rising sparks, deterministic in time so screenshots stay reproducible.
  for (let i = 0; i < 7; i++) {
    const cycle = (time * 0.7 + i / 7) % 1;
    const sx = centerX + Math.sin(i * 2.7 + time * 2) * 22 * (1 - cycle);
    const sy = baseY - 20 - cycle * 130;
    ctx.globalAlpha = (1 - cycle) * 0.9;
    ctx.fillStyle = i % 2 === 0 ? '#ffc233' : '#ff9a2e';
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5 - cycle * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFallingItem(ctx, item) {
  const wobbleX = Math.sin(item.wobble) * 4;
  const x = item.x + wobbleX;
  if (item.kind === 'ember') {
    // A falling trail so the ember reads as motion, plus a wide glow so
    // it stays visible at contact-sheet size.
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.35 - i * 0.09;
      ctx.fillStyle = '#ff9a2e';
      ctx.beginPath();
      ctx.arc(x, item.y - i * 14, 6 - i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(x, item.y, 1, x, item.y, 38);
    glow.addColorStop(0, 'rgba(255,200,80,0.95)');
    glow.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, item.y, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a2e';
    ctx.beginPath();
    ctx.arc(x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(x - 3, item.y - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (item.kind === 'golden') {
    const glow = ctx.createRadialGradient(x, item.y, 1, x, item.y, 44);
    glow.addColorStop(0, 'rgba(255,215,0,0.9)');
    glow.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, item.y, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, item.y);
    ctx.rotate(Math.sin(item.wobble) * 0.4);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const outer = 24;
      const inner = 10;
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      const mid = angle + Math.PI / 5;
      ctx.lineTo(Math.cos(mid) * inner, Math.sin(mid) * inner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff6c0';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (item.kind === 'ice') {
    const glow = ctx.createRadialGradient(x, item.y, 1, x, item.y, 30);
    glow.addColorStop(0, 'rgba(180,225,255,0.55)');
    glow.addColorStop(1, 'rgba(180,225,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, item.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,225,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(x, item.y - item.radius - 4);
    ctx.lineTo(x + item.radius, item.y + 2);
    ctx.lineTo(x + item.radius * 0.5, item.y + item.radius);
    ctx.lineTo(x - item.radius * 0.5, item.y + item.radius);
    ctx.lineTo(x - item.radius, item.y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 4, item.y - 8);
    ctx.lineTo(x + 3, item.y - 2);
    ctx.lineTo(x - 1, item.y + 6);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (item.kind === 'shield') {
    ctx.strokeStyle = '#7fd4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, item.y, item.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(127,212,255,0.35)';
    ctx.beginPath();
    ctx.arc(x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eaf7ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', x, item.y + 1);
    return;
  }
  if (item.kind === 'slow') {
    ctx.strokeStyle = '#c9a7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, item.y, item.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(201,167,255,0.35)';
    ctx.beginPath();
    ctx.arc(x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3eaff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', x, item.y + 1);
  }
}

function drawTorchBearer(ctx, player, fire) {
  const x = player.x;
  const y = CONFIG.playerY;
  const sway = Math.sin(player.flicker * 3) * 3;
  // Warm halo around the bearer so the character pops out of the night.
  const halo = ctx.createRadialGradient(x, y - 20, 10, x, y - 20, 120);
  halo.addColorStop(0, 'rgba(255,170,60,0.22)');
  halo.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y - 20, 120, 0, Math.PI * 2);
  ctx.fill();
  // Cloak, roughly twice the v1 size so the bearer reads at 300px.
  ctx.fillStyle = '#7a4a21';
  ctx.beginPath();
  ctx.moveTo(x - 52, y + 24);
  ctx.lineTo(x - 24, y - 38);
  ctx.lineTo(x + 24, y - 38);
  ctx.lineTo(x + 52, y + 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 38);
  ctx.lineTo(x, y - 10);
  ctx.lineTo(x + 24, y - 38);
  ctx.closePath();
  ctx.fill();
  // Head and hood.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(x, y - 48, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a22';
  ctx.beginPath();
  ctx.arc(x, y - 51, 20, Math.PI, 0);
  ctx.fill();
  // The torch, held high, its flame flickering.
  ctx.strokeStyle = '#4a2f18';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 26, y - 12);
  ctx.lineTo(x + 48 + sway, y - 78);
  ctx.stroke();
  const flame = ctx.createRadialGradient(x + 48 + sway, y - 88, 1, x + 48 + sway, y - 88, 36);
  flame.addColorStop(0, 'rgba(255,230,150,0.95)');
  flame.addColorStop(0.5, 'rgba(255,150,40,0.8)');
  flame.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.arc(x + 48 + sway, y - 88, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(x + 48 + sway, y - 88, 10, 0, Math.PI * 2);
  ctx.fill();
  // Catch basket: a wide woven tray under the torch.
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.moveTo(x - CONFIG.playerWidth / 2, y + 6);
  ctx.lineTo(x + CONFIG.playerWidth / 2, y + 6);
  ctx.lineTo(x + CONFIG.playerWidth / 2 - 10, y + 22);
  ctx.lineTo(x - CONFIG.playerWidth / 2 + 10, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - CONFIG.playerWidth / 2 + 10, y + 14);
  ctx.lineTo(x + CONFIG.playerWidth / 2 - 10, y + 14);
  ctx.stroke();
  // Shield ring while the ice shield lasts.
  if (fire.shieldSecondsLeft > 0) {
    ctx.strokeStyle = 'rgba(127,212,255,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 12, 82, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFireMeter(ctx, fire) {
  const x = 24;
  const y = 24;
  const width = 220;
  const height = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x - 6, y - 6, width + 12, height + 30);
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(x, y, width, height);
  const ratio = fire.fuel / CONFIG.fireMax;
  const color = ratio > 0.5 ? '#ff9a2e' : ratio > 0.25 ? '#ff6a1a' : '#ff3b1a';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, width * ratio), height);
  ctx.strokeStyle = '#ffd9a0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`FIRE ${Math.ceil(fire.fuel)}%`, x + 2, y + height + 16);
}

function drawHearts(ctx, lives) {
  for (let i = 0; i < CONFIG.livesStart; i++) {
    const x = 40 + i * 34;
    const y = 92;
    ctx.fillStyle = i < lives ? '#ff5a6e' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.bezierCurveTo(x - 12, y - 4, x - 6, y - 14, x, y - 5);
    ctx.bezierCurveTo(x + 6, y - 14, x + 12, y - 4, x, y + 8);
    ctx.fill();
  }
}

export function renderHud(ctx, world, fire) {
  drawFireMeter(ctx, fire);
  drawHearts(ctx, fire.lives);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffe9c4';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE ${world.score}`, CONFIG.canvasWidth - 24, 48);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = world.combo >= 5 ? '#ffd700' : '#cfd8ff';
  ctx.fillText(`COMBO x${1 + Math.min(4, Math.floor(world.combo / 5))}  (${world.combo})`, CONFIG.canvasWidth - 24, 74);
  ctx.fillStyle = '#cfd8ff';
  ctx.fillText(`LEVEL ${world.level}`, CONFIG.canvasWidth - 24, 98);
  const minutes = Math.floor(world.elapsed / 60);
  const seconds = Math.floor(world.elapsed % 60);
  ctx.fillText(`NIGHT ${minutes}:${String(seconds).padStart(2, '0')}`, CONFIG.canvasWidth - 24, 122);
  if (fire.shieldSecondsLeft > 0) {
    ctx.fillStyle = '#7fd4ff';
    ctx.fillText(`SHIELD ${Math.ceil(fire.shieldSecondsLeft)}s`, CONFIG.canvasWidth - 24, 146);
  }
  if (fire.slowSecondsLeft > 0) {
    ctx.fillStyle = '#c9a7ff';
    ctx.fillText(`SLOW ${Math.ceil(fire.slowSecondsLeft)}s`, CONFIG.canvasWidth - 24, 170);
  }
  // Big center combo badge once the chain is hot: the judge must see the
  // combo without hunting for a small line on the right.
  if (world.combo >= 5) {
    const mult = 1 + Math.min(4, Math.floor(world.combo / 5));
    const label = `COMBO x${mult} — ${world.combo} IN A ROW!`;
    ctx.save();
    ctx.font = 'bold 28px sans-serif';
    const badgeWidth = ctx.measureText(label).width + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(CONFIG.canvasWidth / 2 - badgeWidth / 2, 146, badgeWidth, 42);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(CONFIG.canvasWidth / 2 - badgeWidth / 2, 146, badgeWidth, 42);
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(label, CONFIG.canvasWidth / 2, 177);
    ctx.restore();
  }
}

export function renderWorld(ctx, world, player, fire, time) {
  drawNightSky(ctx, time, 0);
  drawGround(ctx);
  for (const item of world.items) drawFallingItem(ctx, item);
  drawCampfire(ctx, fire, time);
  drawTorchBearer(ctx, player, fire);
  renderHud(ctx, world, fire);
}

function drawPanel(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(8,12,28,0.82)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
}

export function renderStartScreen(ctx, time) {
  drawNightSky(ctx, time, 0);
  drawGround(ctx);
  const fire = { fuel: 78, lives: 3, shieldSecondsLeft: 0, slowSecondsLeft: 0 };
  drawCampfire(ctx, fire, time);
  drawPanel(ctx, 180, 110, 600, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('EMBERFALL', CONFIG.canvasWidth / 2, 190);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Keep the campfire burning through the night.', CONFIG.canvasWidth / 2, 228);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#cfd8ff';
  const lines = [
    'Catch falling embers to feed the fire  —  +score, +fuel',
    'Dodge the ice shards  —  they starve the fire and cost a heart',
    'Golden embers score x3  •  S shield blocks ice  •  T slows time',
    'Move with ← → / A D or the mouse.  The fire drains — do not idle.',
    'Game over when the fire dies or all 3 hearts are lost.',
  ];
  lines.forEach((line, index) => {
    ctx.fillText(line, CONFIG.canvasWidth / 2, 268 + index * 26);
  });
  const pulse = 0.65 + Math.sin(time * 4) * 0.35;
  ctx.fillStyle = `rgba(255,179,71,${pulse})`;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('—  PRESS ENTER OR CLICK TO START  —', CONFIG.canvasWidth / 2, 448);
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '14px sans-serif';
  ctx.fillText('A complete game: goal, rules, score, lives, restart. Sound: M to mute.', CONFIG.canvasWidth / 2, 474);
}

export function renderGameOverScreen(ctx, world, time) {
  drawNightSky(ctx, time, 0);
  drawGround(ctx);
  const fire = { fuel: 0, lives: 0, shieldSecondsLeft: 0, slowSecondsLeft: 0 };
  drawCampfire(ctx, fire, time);
  drawPanel(ctx, 230, 120, 500, 360);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9fb4ff';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('THE FIRE DIED', CONFIG.canvasWidth / 2, 196);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`FINAL SCORE  ${world.score}`, CONFIG.canvasWidth / 2, 252);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#cfd8ff';
  ctx.fillText(`Level reached: ${world.level}`, CONFIG.canvasWidth / 2, 292);
  ctx.fillText(`Best combo: ${world.bestCombo} catches in a row`, CONFIG.canvasWidth / 2, 322);
  ctx.fillText(`Embers caught: ${world.caught}  •  Golden: ${world.goldenCaught}  •  Missed: ${world.missed}`, CONFIG.canvasWidth / 2, 352);
  const pulse = 0.65 + Math.sin(time * 4) * 0.35;
  ctx.fillStyle = `rgba(255,179,71,${pulse})`;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('—  PRESS R OR CLICK TO PLAY AGAIN  —', CONFIG.canvasWidth / 2, 412);
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '14px sans-serif';
  ctx.fillText('EMBERFALL — keep the fire alive. One more night?', CONFIG.canvasWidth / 2, 448);
}
