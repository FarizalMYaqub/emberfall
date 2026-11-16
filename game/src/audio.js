// Synthesized sound: every effect and the music loop are built from oscillators
// and filtered noise at run time, so the game ships no audio files at all.
// Audio starts only after a user gesture; until then every call is a no-op.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  // A dark synthwave pulse: root bass on the beat, a minor arpeggio over it.
  const BASS = [55, 55, 65.41, 49];
  const ARP = [220, 261.63, 329.63, 261.63, 220, 196, 246.94, 293.66];
  function startMusic() {
    if (musicTimer || !ctx) return;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx || ctx.state !== 'running') return;
      const bar = Math.floor(step / 8) % BASS.length;
      if (step % 8 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = BASS[bar];
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.95);
      }
      const note = ARP[step % ARP.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
      step += 1;
    }, 190);
  }

  return {
    unlock() { ensure(); },
    get isMuted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() { tone(720 + Math.random() * 120, 0.07, 'square', 0.10, 240); },
    enemyHit() { tone(180, 0.05, 'square', 0.08, 120); },
    enemyDie() { noise(0.28, 0.32, 900); tone(160, 0.22, 'sawtooth', 0.16, 40); },
    playerHit() { noise(0.18, 0.4, 700); tone(110, 0.25, 'sawtooth', 0.22, 55); },
    dash() { noise(0.16, 0.20, 2400); },
    pickup() { tone(880, 0.09, 'sine', 0.16, 1320); },
    heart() { tone(523, 0.12, 'sine', 0.18); tone(784, 0.16, 'sine', 0.18, null, 0.09); },
    overdrive() { tone(660, 0.1, 'square', 0.14, 990); tone(990, 0.12, 'square', 0.14, 1320, 0.08); },
    waveHorn() { tone(196, 0.35, 'sawtooth', 0.18, 294); tone(294, 0.35, 'sawtooth', 0.14, 392, 0.05); },
    bossAlarm() { tone(98, 0.5, 'sawtooth', 0.24, 65); tone(98, 0.5, 'sawtooth', 0.24, 65, 0.55); },
    upgrade() { tone(523, 0.1, 'sine', 0.16); tone(659, 0.1, 'sine', 0.16, null, 0.08); tone(784, 0.18, 'sine', 0.18, null, 0.16); },
    click() { tone(1200, 0.05, 'sine', 0.14, 900); },
    gameOver() { tone(220, 0.5, 'sawtooth', 0.2, 110); tone(165, 0.7, 'sawtooth', 0.18, 82, 0.4); },
    victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.18, null, i * 0.13)); },
  };
}
