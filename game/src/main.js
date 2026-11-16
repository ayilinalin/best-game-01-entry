// EMBERFALL — the main loop and the fixed-step simulation. Game states:
// 'start' (title screen), 'playing', 'gameover'. Screenshot modes
// (?shot=start|play|powerup|gameover) stage a deterministic scene with
// a fixed seed so the cover images are reproducible.
import { CONFIG } from './config.js';
import { createSeededRandom } from './random.js';
import { createSoundEngine } from './audio.js';
import { createFireState, drainFire, feedFire, hitByIce, grantShield, grantSlow, isFireOut } from './fire.js';
import { createPlayer, attachPlayerInput, updatePlayer, playerCatches } from './player.js';
import { createWorld, updateWorld, resolveCatch, resolveMiss } from './world.js';
import { renderWorld, renderStartScreen, renderGameOverScreen } from './hud.js';

const FIXED_STEP = 1 / 60;

function readShotMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('shot');
  } catch (error) {
    return null;
  }
}

function buildGame(seed) {
  const random = createSeededRandom(seed);
  return {
    random,
    player: createPlayer(),
    fire: createFireState(),
    world: createWorld(random),
    state: 'start',
    time: 0,
    floatingTexts: [],
    particles: [],
    banner: null,
    stormWarning: 0,
    flash: 0,
  };
}

function spawnBurst(game, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + game.time;
    const speed = 60 + ((i * 37) % 90);
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      life: 0.7,
      maxLife: 0.7,
      color,
      size: 3 + ((i * 13) % 4),
    });
  }
  if (game.particles.length > 120) game.particles.splice(0, game.particles.length - 120);
}

function addFloatingText(game, x, y, text, color) {
  game.floatingTexts.push({ x, y, text, color, life: 1 });
  if (game.floatingTexts.length > 12) game.floatingTexts.shift();
}

function applyCatch(game, item, sound) {
  const outcome = resolveCatch(game.world, item, game.fire);
  if (outcome.type === 'ember') {
    feedFire(game.fire, CONFIG.firePerEmber);
    sound.playCatch(outcome.combo);
    addFloatingText(game, item.x, item.y - 14, `+${outcome.score}`, '#ffe9a8');
    spawnBurst(game, item.x, item.y, '#ffb347', 10);
  } else if (outcome.type === 'golden') {
    feedFire(game.fire, CONFIG.firePerGoldenEmber);
    sound.playGolden();
    addFloatingText(game, item.x, item.y - 14, `GOLD +${outcome.score}`, '#ffd700');
    spawnBurst(game, item.x, item.y, '#ffd700', 16);
  } else if (outcome.type === 'shield') {
    grantShield(game.fire);
    sound.playPowerup();
    addFloatingText(game, item.x, item.y - 14, 'ICE SHIELD!', '#7fd4ff');
    spawnBurst(game, item.x, item.y, '#7fd4ff', 12);
  } else if (outcome.type === 'slow') {
    grantSlow(game.fire);
    sound.playPowerup();
    addFloatingText(game, item.x, item.y - 14, 'TIME SLOWS!', '#c9a7ff');
    spawnBurst(game, item.x, item.y, '#c9a7ff', 12);
  } else if (outcome.type === 'ice') {
    const result = hitByIce(game.fire);
    if (result === 'blocked') {
      sound.playPowerup();
      addFloatingText(game, item.x, item.y - 14, 'BLOCKED!', '#7fd4ff');
    } else {
      sound.playIceHit();
      game.flash = 0.35;
      addFloatingText(game, item.x, item.y - 14, 'ICE HIT! -1 HEART', '#9fd8ff');
    }
  }
}

function stepSimulation(game, sound) {
  const { world, fire, player } = game;
  updatePlayer(player, FIXED_STEP);
  const events = updateWorld(world, FIXED_STEP, fire);
  for (const event of events) {
    if (event.type === 'levelup') {
      sound.playLevelUp();
      addFloatingText(game, CONFIG.canvasWidth / 2, 200, `LEVEL ${event.level} — THE NIGHT DEEPENS`, '#ffb347');
      game.banner = { text: `LEVEL ${event.level} — THE NIGHT DEEPENS`, life: 2.4 };
      if (event.level >= 3) game.stormWarning = 2.4;
    }
  }
  drainFire(fire, FIXED_STEP);
  const remaining = [];
  for (const item of world.items) {
    if (item.y >= CONFIG.playerY - 6 && item.y <= CONFIG.playerY + 30 && playerCatches(player, item, item.radius)) {
      applyCatch(game, item, sound);
      continue;
    }
    if (item.y > CONFIG.groundY + 10) {
      const miss = resolveMiss(world, item);
      if (miss && miss.type === 'combo-broken') {
        addFloatingText(game, item.x, CONFIG.groundY - 20, `COMBO ${miss.combo} LOST`, '#8fa0c8');
      }
      continue;
    }
    remaining.push(item);
  }
  world.items = remaining;
  for (const text of game.floatingTexts) {
    text.y -= 28 * FIXED_STEP;
    text.life -= FIXED_STEP * 0.9;
  }
  game.floatingTexts = game.floatingTexts.filter((text) => text.life > 0);
  for (const p of game.particles) {
    p.x += p.vx * FIXED_STEP;
    p.y += p.vy * FIXED_STEP;
    p.vy += 260 * FIXED_STEP;
    p.life -= FIXED_STEP;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
  if (game.banner) {
    game.banner.life -= FIXED_STEP;
    if (game.banner.life <= 0) game.banner = null;
  }
  if (game.stormWarning > 0) game.stormWarning = Math.max(0, game.stormWarning - FIXED_STEP);
  if (game.flash > 0) game.flash = Math.max(0, game.flash - FIXED_STEP);
  if (isFireOut(fire)) {
    game.state = 'gameover';
    sound.playGameOver();
  }
}

function startGame(game, sound) {
  const fresh = buildGame((Date.now() % 2147483647) || 12345);
  game.player = fresh.player;
  game.fire = fresh.fire;
  game.world = fresh.world;
  game.floatingTexts = [];
  game.particles = [];
  game.banner = null;
  game.stormWarning = 0;
  game.flash = 0;
  game.state = 'playing';
  sound.unlockAudio();
}

function stageShotScene(game, mode) {
  // Deterministic staged scenes for the screenshots, all from one seed.
  const random = createSeededRandom(20261116);
  game.random = random;
  game.world.random = random;
  game.state = 'playing';
  if (mode === 'play') {
    game.world.elapsed = 47;
    game.world.level = 2;
    game.world.score = 480;
    game.world.combo = 18;
    game.world.bestCombo = 18;
    game.world.caught = 41;
    game.fire.fuel = 72;
    game.fire.lives = 3;
    game.player.x = 470;
    // A dense action moment: embers everywhere, a golden one dropping in,
    // ice closing from both sides, the bearer mid-catch.
    game.world.items = [
      { kind: 'ember', x: 300, y: 180, speed: 180, drift: 8, radius: 16, wobble: 0.5 },
      { kind: 'ember', x: 470, y: 320, speed: 180, drift: -6, radius: 16, wobble: 1.2 },
      { kind: 'ember', x: 620, y: 120, speed: 180, drift: 10, radius: 16, wobble: 2.1 },
      { kind: 'ember', x: 820, y: 90, speed: 180, drift: -10, radius: 16, wobble: 1.7 },
      { kind: 'ember', x: 380, y: 90, speed: 180, drift: 6, radius: 16, wobble: 0.3 },
      { kind: 'ember', x: 540, y: 210, speed: 180, drift: -8, radius: 16, wobble: 2.8 },
      { kind: 'ember', x: 700, y: 380, speed: 180, drift: 4, radius: 16, wobble: 1.5 },
      { kind: 'ember', x: 220, y: 420, speed: 180, drift: -4, radius: 16, wobble: 2.4 },
      { kind: 'golden', x: 580, y: 60, speed: 170, drift: 0, radius: 18, wobble: 0.8 },
      { kind: 'ice', x: 720, y: 240, speed: 190, drift: -8, radius: 17, wobble: 0.9 },
      { kind: 'ice', x: 180, y: 300, speed: 190, drift: 6, radius: 17, wobble: 2.6 },
      { kind: 'ice', x: 860, y: 300, speed: 190, drift: -6, radius: 17, wobble: 1.1 },
    ];
    addFloatingText(game, 470, 300, '+40', '#ffe9a8');
    addFloatingText(game, 380, 130, '+40', '#ffe9a8');
    spawnBurst(game, 470, 330, '#ffb347', 10);
    spawnBurst(game, 540, 220, '#ffb347', 8);
    return;
  }
  if (mode === 'powerup') {
    game.world.elapsed = 96;
    game.world.level = 4;
    game.world.score = 1240;
    game.world.combo = 24;
    game.world.bestCombo = 24;
    game.world.caught = 88;
    game.world.goldenCaught = 3;
    game.fire.fuel = 88;
    game.fire.lives = 2;
    game.fire.shieldSecondsLeft = 6;
    game.fire.slowSecondsLeft = 5;
    game.player.x = 520;
    game.banner = { text: 'LEVEL 4 — THE NIGHT DEEPENS', life: 99 };
    game.stormWarning = 0;
    // Shield + slow-time active together, golden embers raining, storm warning up.
    game.world.items = [
      { kind: 'golden', x: 520, y: 300, speed: 170, drift: 0, radius: 18, wobble: 0.4 },
      { kind: 'golden', x: 380, y: 150, speed: 170, drift: 8, radius: 18, wobble: 1.9 },
      { kind: 'golden', x: 660, y: 90, speed: 170, drift: -6, radius: 18, wobble: 2.5 },
      { kind: 'ember', x: 660, y: 200, speed: 180, drift: -8, radius: 16, wobble: 1.1 },
      { kind: 'ember', x: 240, y: 260, speed: 180, drift: 6, radius: 16, wobble: 0.7 },
      { kind: 'ember', x: 440, y: 110, speed: 180, drift: -6, radius: 16, wobble: 1.6 },
      { kind: 'ember', x: 760, y: 170, speed: 180, drift: 8, radius: 16, wobble: 0.2 },
      { kind: 'ice', x: 760, y: 320, speed: 190, drift: -6, radius: 17, wobble: 2.2 },
      { kind: 'ice', x: 180, y: 360, speed: 190, drift: 6, radius: 17, wobble: 1.4 },
      { kind: 'slow', x: 860, y: 430, speed: 150, drift: 4, radius: 18, wobble: 0.6 },
    ];
    addFloatingText(game, 520, 280, 'GOLD +150', '#ffd700');
    addFloatingText(game, 380, 130, 'GOLD +150', '#ffd700');
    spawnBurst(game, 520, 310, '#ffd700', 16);
    spawnBurst(game, 380, 160, '#ffd700', 12);
    return;
  }
  if (mode === 'gameover') {
    game.state = 'gameover';
    game.world.elapsed = 134;
    game.world.level = 5;
    game.world.score = 1870;
    game.world.combo = 0;
    game.world.bestCombo = 14;
    game.world.caught = 122;
    game.world.goldenCaught = 4;
    game.world.missed = 31;
    game.fire.fuel = 0;
    game.fire.lives = 0;
  }
}

function drawFloatingTexts(ctx, game) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px sans-serif';
  for (const text of game.floatingTexts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, text.life));
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(text.text, text.x, text.y);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBanners(ctx, game) {
  // Level-up banner: big gold strip across the middle of the sky.
  if (game.banner) {
    const alpha = Math.min(1, game.banner.life);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 26px sans-serif';
    const width = ctx.measureText(game.banner.text).width + 48;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(CONFIG.canvasWidth / 2 - width / 2, 210, width, 44);
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.strokeRect(CONFIG.canvasWidth / 2 - width / 2, 210, width, 44);
    ctx.fillStyle = '#ffb347';
    ctx.textAlign = 'center';
    ctx.fillText(game.banner.text, CONFIG.canvasWidth / 2, 241);
    ctx.restore();
  }
  // Ice-storm warning: flashing red-white strip above the banner.
  if (game.stormWarning > 0) {
    const blink = Math.sin(game.time * 8) > 0 ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ff5a6e';
    ctx.textAlign = 'center';
    ctx.fillText('⚠  ICE STORM INCOMING  ⚠', CONFIG.canvasWidth / 2, 200);
    ctx.restore();
  }
}

export function bootEmberfall() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const sound = createSoundEngine();
  const game = buildGame((Date.now() % 2147483647) || 12345);
  const shotMode = readShotMode();

  attachPlayerInput(game.player, canvas, () => sound.unlockAudio());

  function beginFrom(state) {
    if (state === 'start' || state === 'gameover') startGame(game, sound);
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && game.state !== 'playing') beginFrom(game.state);
    if ((event.key === 'r' || event.key === 'R') && game.state === 'gameover') beginFrom(game.state);
    if (event.key === 'm' || event.key === 'M') sound.toggleMute();
    if (event.key === ' ') event.preventDefault();
  });
  canvas.addEventListener('click', () => {
    if (game.state !== 'playing') beginFrom(game.state);
  });

  if (shotMode === 'start') {
    game.state = 'start';
  } else if (shotMode === 'play' || shotMode === 'powerup' || shotMode === 'gameover') {
    stageShotScene(game, shotMode);
  }

  let lastTime = performance.now();
  let accumulator = 0;
  function frame(now) {
    const frameDelta = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    game.time += frameDelta;
    if (game.state === 'playing' && !shotMode) {
      accumulator += frameDelta;
      while (accumulator >= FIXED_STEP) {
        stepSimulation(game, sound);
        accumulator -= FIXED_STEP;
        if (game.state !== 'playing') {
          accumulator = 0;
          break;
        }
      }
    } else if (game.state === 'playing' && shotMode) {
      // Staged screenshot scenes render one frozen, readable moment.
      game.player.flicker += frameDelta;
    }
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    if (game.state === 'start') {
      renderStartScreen(ctx, game.time);
    } else if (game.state === 'gameover') {
      renderGameOverScreen(ctx, game.world, game.time);
    } else {
      renderWorld(ctx, game.world, game.player, game.fire, game.time);
      drawParticles(ctx, game);
      drawFloatingTexts(ctx, game);
      drawBanners(ctx, game);
      if (game.flash > 0) {
        ctx.fillStyle = `rgba(160,210,255,${game.flash * 0.5})`;
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return game;
}

bootEmberfall();
