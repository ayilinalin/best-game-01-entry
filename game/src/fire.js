// EMBERFALL — the campfire meter and the lives. The fire drains every
// second, embers feed it, ice starves it; when it hits zero, or the last
// heart is lost, the night wins.
import { CONFIG } from './config.js';

export function createFireState() {
  return {
    fuel: CONFIG.fireMax,
    lives: CONFIG.livesStart,
    shieldSecondsLeft: 0,
    slowSecondsLeft: 0,
  };
}

export function drainFire(fire, deltaSeconds) {
  fire.fuel = Math.max(0, fire.fuel - CONFIG.fireDrainPerSecond * deltaSeconds);
  if (fire.shieldSecondsLeft > 0) fire.shieldSecondsLeft = Math.max(0, fire.shieldSecondsLeft - deltaSeconds);
  if (fire.slowSecondsLeft > 0) fire.slowSecondsLeft = Math.max(0, fire.slowSecondsLeft - deltaSeconds);
}

export function feedFire(fire, amount) {
  fire.fuel = Math.min(CONFIG.fireMax, fire.fuel + amount);
}

export function hitByIce(fire) {
  if (fire.shieldSecondsLeft > 0) {
    fire.shieldSecondsLeft = 0;
    return 'blocked';
  }
  fire.fuel = Math.max(0, fire.fuel - CONFIG.fireLossPerIce);
  fire.lives = Math.max(0, fire.lives - 1);
  return 'hit';
}

export function grantShield(fire) {
  fire.shieldSecondsLeft = CONFIG.shieldSeconds;
}

export function grantSlow(fire) {
  fire.slowSecondsLeft = CONFIG.slowSeconds;
}

export function isShieldActive(fire) {
  return fire.shieldSecondsLeft > 0;
}

export function isSlowActive(fire) {
  return fire.slowSecondsLeft > 0;
}

export function isFireOut(fire) {
  return fire.fuel <= 0 || fire.lives <= 0;
}
