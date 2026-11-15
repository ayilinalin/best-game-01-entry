// EMBERFALL — the falling sky: spawning embers, ice and power-ups, the
// difficulty ramp (faster and denser every 30 seconds), scoring and the
// combo chain. One falling thing, one job: fall, be caught, or be missed.
import { CONFIG } from './config.js';
import { randomRange } from './random.js';

export function createWorld(random) {
  return {
    random,
    items: [],
    spawnTimer: 0.4,
    elapsed: 0,
    level: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    caught: 0,
    missed: 0,
    goldenCaught: 0,
    slowFactor: 1,
  };
}

export function levelOf(elapsedSeconds) {
  return 1 + Math.floor(elapsedSeconds / CONFIG.levelSeconds);
}

export function spawnIntervalFor(level) {
  return Math.max(
    CONFIG.spawnIntervalMin,
    CONFIG.spawnIntervalStart - (level - 1) * 0.09,
  );
}

export function fallSpeedFor(level) {
  return CONFIG.fallSpeedStart + (level - 1) * CONFIG.fallSpeedPerLevel;
}

export function iceChanceFor(level) {
  return Math.min(
    CONFIG.iceChanceCap,
    CONFIG.iceChanceStart + (level - 1) * CONFIG.iceChancePerLevel,
  );
}

function spawnFallingItem(world) {
  const random = world.random;
  const roll = random();
  const x = randomRange(random, 30, CONFIG.canvasWidth - 30);
  const speed = fallSpeedFor(world.level) * randomRange(random, 0.85, 1.2);
  const drift = randomRange(random, -24, 24);
  if (roll < CONFIG.powerupChance) {
    const kind = random() < CONFIG.goldenChance ? 'golden' : random() < 0.5 ? 'shield' : 'slow';
    world.items.push({ kind, x, y: -20, speed: speed * 0.8, drift, radius: CONFIG.powerupRadius, wobble: random() * Math.PI * 2 });
    return;
  }
  if (roll < CONFIG.powerupChance + iceChanceFor(world.level)) {
    world.items.push({ kind: 'ice', x, y: -20, speed: speed * 1.05, drift, radius: CONFIG.iceRadius, wobble: random() * Math.PI * 2 });
    return;
  }
  world.items.push({ kind: 'ember', x, y: -20, speed, drift, radius: CONFIG.emberRadius, wobble: random() * Math.PI * 2 });
}

export function comboMultiplier(combo) {
  return 1 + Math.min(CONFIG.comboMultiplierCap - 1, Math.floor(combo / CONFIG.comboStep));
}

// Advance the world one fixed step. Returns events the main loop turns
// into sounds, fire changes and floating text.
export function updateWorld(world, deltaSeconds, fire) {
  const events = [];
  world.elapsed += deltaSeconds;
  const nextLevel = levelOf(world.elapsed);
  if (nextLevel > world.level) {
    world.level = nextLevel;
    events.push({ type: 'levelup', level: world.level });
  }
  world.slowFactor = fire.slowSecondsLeft > 0 ? CONFIG.slowFactor : 1;
  const scaledDelta = deltaSeconds * world.slowFactor;
  world.spawnTimer -= scaledDelta;
  if (world.spawnTimer <= 0) {
    spawnFallingItem(world);
    world.spawnTimer = spawnIntervalFor(world.level) * (0.7 + world.random() * 0.6);
  }
  for (const item of world.items) {
    item.y += item.speed * scaledDelta;
    item.x += item.drift * scaledDelta;
    item.wobble += scaledDelta * 3;
  }
  world.items = world.items.filter((item) => item.y < CONFIG.canvasHeight + 40);
  return events;
}

// What happens when a falling item reaches the torch-bearer or the
// ground. The caller passes the catch test; this keeps the score honest.
export function resolveCatch(world, item, fire) {
  if (item.kind === 'ember') {
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    world.caught += 1;
    const gained = CONFIG.emberScore * comboMultiplier(world.combo);
    world.score += gained;
    return { type: 'ember', score: gained, combo: world.combo };
  }
  if (item.kind === 'golden') {
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    world.caught += 1;
    world.goldenCaught += 1;
    const gained = CONFIG.goldenEmberScore * comboMultiplier(world.combo);
    world.score += gained;
    return { type: 'golden', score: gained, combo: world.combo };
  }
  if (item.kind === 'shield') {
    return { type: 'shield' };
  }
  if (item.kind === 'slow') {
    return { type: 'slow' };
  }
  // Ice reaching the player hurts; the fire module decides blocked vs hit.
  return { type: 'ice' };
}

export function resolveMiss(world, item) {
  if (item.kind === 'ember' || item.kind === 'golden') {
    world.missed += 1;
    if (world.combo > 0) {
      const broken = world.combo;
      world.combo = 0;
      return { type: 'combo-broken', combo: broken };
    }
  }
  return null;
}
