// EMBERFALL — every sound is synthesized with WebAudio: no audio files,
// no network, just oscillators and filtered noise shaped into game sounds.
export function createSoundEngine() {
  let audioContext = null;
  let masterGain = null;
  let muted = false;

  function ensureContext() {
    if (audioContext) return audioContext;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(audioContext.destination);
    } catch (error) {
      audioContext = null;
    }
    return audioContext;
  }

  function unlockAudio() {
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function playTone(frequency, duration, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx || !masterGain) return;
    try {
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch (error) {
      // A sound that cannot play must never stop the game.
    }
  }

  function playNoiseBurst(duration, volume, filterFrequency) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx || !masterGain) return;
    try {
      const now = ctx.currentTime;
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFrequency;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(now);
    } catch (error) {
      // Silence on failure; the game continues.
    }
  }

  // Catch an ember: a bright two-note ding that rises with the combo.
  function playCatch(combo) {
    const step = Math.min(combo, 12);
    const base = 520 * Math.pow(1.059463, step);
    playTone(base, 0.12, 'sine', 0.5);
    playTone(base * 1.5, 0.18, 'sine', 0.35, base * 1.75);
  }

  // Catch a golden ember: a short rising arpeggio.
  function playGolden() {
    [660, 830, 990, 1320].forEach((frequency, index) => {
      setTimeout(() => playTone(frequency, 0.16, 'triangle', 0.45), index * 70);
    });
  }

  // Ice hits the fire: a cold crack of filtered noise plus a low thud.
  function playIceHit() {
    playNoiseBurst(0.22, 0.6, 900);
    playTone(140, 0.25, 'sawtooth', 0.3, 60);
  }

  // A power-up is collected: a warm major arpeggio.
  function playPowerup() {
    [440, 554, 659, 880].forEach((frequency, index) => {
      setTimeout(() => playTone(frequency, 0.2, 'triangle', 0.4), index * 80);
    });
  }

  // Level up: a confident two-note call.
  function playLevelUp() {
    playTone(392, 0.14, 'square', 0.22);
    setTimeout(() => playTone(587, 0.22, 'square', 0.22), 120);
  }

  // Game over: a slow low drone that fades out.
  function playGameOver() {
    playTone(220, 1.1, 'sawtooth', 0.3, 55);
    playTone(110, 1.3, 'triangle', 0.35, 40);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return { unlockAudio, playCatch, playGolden, playIceHit, playPowerup, playLevelUp, playGameOver, toggleMute };
}
