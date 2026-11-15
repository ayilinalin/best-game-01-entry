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
    flash: 0,
  };
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
  } else if (outcome.type === 'golden') {
    feedFire(game.fire, CONFIG.firePerGoldenEmber);
    sound.playGolden();
    addFloatingText(game, item.x, item.y - 14, `GOLD +${outcome.score}`, '#ffd700');
  } else if (outcome.type === 'shield') {
    grantShield(game.fire);
    sound.playPowerup();
    addFloatingText(game, item.x, item.y - 14, 'ICE SHIELD!', '#7fd4ff');
  } else if (outcome.type === 'slow') {
    grantSlow(game.fire);
    sound.playPowerup();
    addFloatingText(game, item.x, item.y - 14, 'TIME SLOWS!', '#c9a7ff');
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
    game.world.combo = 5;
    game.world.bestCombo = 9;
    game.world.caught = 41;
    game.fire.fuel = 72;
    game.fire.lives = 3;
    game.player.x = 470;
    game.world.items = [
      { kind: 'ember', x: 300, y: 180, speed: 180, drift: 8, radius: 11, wobble: 0.5 },
      { kind: 'ember', x: 470, y: 320, speed: 180, drift: -6, radius: 11, wobble: 1.2 },
      { kind: 'ember', x: 620, y: 120, speed: 180, drift: 10, radius: 11, wobble: 2.1 },
      { kind: 'ice', x: 720, y: 240, speed: 190, drift: -8, radius: 13, wobble: 0.9 },
      { kind: 'ice', x: 180, y: 300, speed: 190, drift: 6, radius: 13, wobble: 2.6 },
      { kind: 'ember', x: 820, y: 90, speed: 180, drift: -10, radius: 11, wobble: 1.7 },
    ];
    addFloatingText(game, 470, 300, '+20', '#ffe9a8');
    return;
  }
  if (mode === 'powerup') {
    game.world.elapsed = 96;
    game.world.level = 4;
    game.world.score = 1240;
    game.world.combo = 12;
    game.world.bestCombo = 12;
    game.world.caught = 88;
    game.world.goldenCaught = 3;
    game.fire.fuel = 88;
    game.fire.lives = 2;
    game.fire.shieldSecondsLeft = 6;
    game.player.x = 520;
    game.world.items = [
      { kind: 'golden', x: 520, y: 300, speed: 170, drift: 0, radius: 13, wobble: 0.4 },
      { kind: 'golden', x: 380, y: 150, speed: 170, drift: 8, radius: 13, wobble: 1.9 },
      { kind: 'ember', x: 660, y: 200, speed: 180, drift: -8, radius: 11, wobble: 1.1 },
      { kind: 'ice', x: 760, y: 320, speed: 190, drift: -6, radius: 13, wobble: 2.2 },
      { kind: 'ember', x: 240, y: 260, speed: 180, drift: 6, radius: 11, wobble: 0.7 },
    ];
    addFloatingText(game, 520, 280, 'GOLD +90', '#ffd700');
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
  ctx.font = 'bold 18px sans-serif';
  for (const text of game.floatingTexts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, text.life));
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
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
      drawFloatingTexts(ctx, game);
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
