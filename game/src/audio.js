// All sound is synthesized with WebAudio — no audio files, no network. Engine hum follows
// speed, the police siren is a two-tone wail, gunshots are filtered noise bursts, and a small
// bassline loop plays as background music. Everything is guarded so the game runs silent when
// the browser has not had a user gesture yet (screenshot mode).
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenOn = false;
  let musicTimer = null;
  let muted = false;
  const notes = [55, 0, 65.41, 0, 49, 0, 58.27, 0, 55, 0, 65.41, 0, 73.42, 65.41, 58.27, 49];

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      let beat = 0;
      musicTimer = window.setInterval(() => {
        if (muted || !ctx || ctx.state !== 'running') return;
        const freq = notes[beat % notes.length];
        beat += 1;
        if (!freq) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + 0.26);
      }, 250);
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function blip(freq, dur, type, vol) {
    if (!ensure() || muted || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(value) { muted = value; if (master) master.gain.value = value ? 0 : 0.5; },
    isMuted() { return muted; },
    setEngine(speed01, driving) {
      if (!ctx || muted) return;
      if (ctx.state !== 'running') return;
      engineOsc.frequency.value = 55 + speed01 * 140;
      engineGain.gain.value = driving ? 0.05 + speed01 * 0.06 : 0;
    },
    setSiren(on) {
      sirenOn = on;
      if (!ctx || muted) return;
      if (ctx.state !== 'running') return;
      sirenGain.gain.value = on ? 0.045 : 0;
      if (on) sirenOsc.frequency.setTargetAtTime(sirenOsc.frequency.value > 800 ? 700 : 950, ctx.currentTime, 0.3);
    },
    sirenActive() { return sirenOn; },
    shoot() {
      if (!ensure() || muted || ctx.state !== 'running') return;
      const len = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    },
    punch() { blip(120, 0.08, 'square', 0.25); },
    pickup() { blip(880, 0.12, 'sine', 0.2); setTimeout(() => blip(1320, 0.14, 'sine', 0.2), 90); },
    missionDone() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.22), i * 110)); },
    wantedUp() { blip(220, 0.2, 'sawtooth', 0.2); setTimeout(() => blip(180, 0.25, 'sawtooth', 0.2), 130); },
    crash() { blip(70, 0.25, 'square', 0.3); },
    scrape(intensity = 0.5) {
      // Friction rasp for a wall scrape: filtered noise, always quieter than
      // a gunshot (0.5) but the same length at a full slide (0.12s), so the
      // scrape and the shot sit in one consistent sound world. Louder and
      // longer the faster the slide; the caller passes the slide intensity.
      if (!ensure() || muted || ctx.state !== 'running') return;
      const slide = Math.max(0, Math.min(1, intensity));
      const len = ctx.sampleRate * (0.09 + 0.03 * slide);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900 + 300 * slide;
      const gain = ctx.createGain();
      gain.gain.value = 0.14 + 0.14 * slide;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    },
  };
}
