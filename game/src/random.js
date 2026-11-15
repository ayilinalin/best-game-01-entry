// EMBERFALL — deterministic seeded random numbers. The live game seeds
// from the clock; the screenshot modes seed from a fixed number, so the
// same shot always renders the same sky of falling embers.
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function nextRandom() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export function pickFrom(random, items) {
  return items[Math.floor(random() * items.length)];
}

export function randomRange(random, min, max) {
  return min + random() * (max - min);
}
