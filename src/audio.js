/** Original, locally synthesized Diwali soundscape. No network or audio files required. */
export class GameAudio {
  constructor() {
    this.musicEnabled = true;
    this.soundEnabled = true;
    this.context = null;
    this.timer = null;
    this.destroyed = false;
    this.lastCrumble = 0;
  }

  unlock() {
    if (this.destroyed) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.context) {
      try {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.68;
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -19;
        compressor.knee.value = 18;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.22;
        this.master.connect(compressor);
        compressor.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = this.musicEnabled ? 0.24 : 0;
        this.musicGain.connect(this.master);
        this.effectsGain = this.context.createGain();
        this.effectsGain.gain.value = this.soundEnabled ? 0.74 : 0;
        this.effectsGain.connect(this.master);
        this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
        const samples = this.noiseBuffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < samples.length; i++) {
          const white = Math.random() * 2 - 1;
          previous = (previous + white * 0.13) / 1.13;
          samples[i] = previous * 3.8;
        }
        this.beat = 0;
        this.nextBeat = this.context.currentTime + 0.08;
      } catch { this.context = null; return; }
    }
    this.context.resume().catch(() => {});
    if (this.musicEnabled && !this.timer) this.startMusic();
  }

  setMusic(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (!this.context) return;
    this.musicGain.gain.setTargetAtTime(enabled ? 0.24 : 0, this.context.currentTime, 0.12);
    if (enabled && !this.timer) this.startMusic();
    if (!enabled && this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  setSound(enabled) {
    this.soundEnabled = Boolean(enabled);
    if (this.context) this.effectsGain.gain.setTargetAtTime(enabled ? 0.74 : 0, this.context.currentTime, 0.015);
  }

  startMusic() {
    if (!this.context || this.destroyed || !this.musicEnabled) return;
    this.nextBeat = Math.max(this.nextBeat, this.context.currentTime + 0.04);
    this.scheduleMusic();
    this.timer = setInterval(() => this.scheduleMusic(), 120);
  }

  scheduleMusic() {
    if (!this.context || !this.musicEnabled || this.context.state !== 'running') return;
    const beatLength = 60 / 104;
    // D-major pentatonic: a playful eight-bar phrase, plucked strings over tabla and drone.
    const phrase = [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 12, 9, 7, 4, 2, 4, 7, 4, 2, 0, -3, 0, 2, 4, 9, 7, 4, 2, 0, -3];
    while (this.nextBeat < this.context.currentTime + 0.32) {
      const i = this.beat % phrase.length;
      const t = this.nextBeat;
      const midi = 62 + phrase[i];
      this.pluck(440 * 2 ** ((midi - 69) / 12), t, 0.38, 0.19, this.musicGain);
      if (i % 4 === 2) this.pluck(440 * 2 ** ((midi + 12 - 69) / 12), t + beatLength / 2, 0.22, 0.1, this.musicGain);
      if (i % 8 === 0) {
        this.tone(146.83, t, beatLength * 7.8, 0.024, this.musicGain, 'sine');
        this.tone(220, t, beatLength * 7.8, 0.013, this.musicGain, 'sine');
      }
      if (i % 2 === 0) this.drum(t, 115, 0.11, 0.11, this.musicGain);
      else this.drum(t, 215, 0.065, 0.073, this.musicGain);
      if (i % 4 === 3) this.drum(t + beatLength / 2, 290, 0.045, 0.045, this.musicGain);
      this.nextBeat += beatLength;
      this.beat++;
    }
  }

  tone(frequency, time, duration, volume, destination, shape = 'sine', endFrequency = null) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(Math.max(1, frequency), time);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + Math.min(0.012, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain); gain.connect(destination);
    osc.start(time); osc.stop(time + duration + 0.015);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  pluck(frequency, time, duration, volume, destination) {
    this.tone(frequency, time, duration, volume, destination, 'triangle');
    this.tone(frequency * 2.01, time, duration * 0.58, volume * 0.16, destination, 'sine');
    this.tone(frequency * 3.98, time, duration * 0.23, volume * 0.055, destination, 'sine');
  }

  noise(time, duration, volume, filterFrequency, destination, filterType = 'lowpass') {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, time);
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, volume), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(destination);
    source.start(time); source.stop(time + duration + 0.02);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  drum(time, frequency, duration, volume, destination) {
    this.tone(frequency, time, duration, volume, destination, 'sine', frequency * 0.48);
    this.noise(time, duration * 0.55, volume * 0.31, 1650, destination, 'bandpass');
  }

  explosion(time, strength = 1, pitch = 74, length = 0.5) {
    this.tone(pitch, time, length * 0.72, 0.31 * strength, this.effectsGain, 'sine', 24);
    this.noise(time, length, 0.42 * strength, 900 + 1200 * strength, this.effectsGain);
    this.noise(time + 0.02, length * 0.7, 0.1 * strength, 160, this.effectsGain);
  }

  play(name) {
    if (!this.context || this.context.state !== 'running' || !this.soundEnabled || this.destroyed) return;
    const t = this.context.currentTime + 0.005;
    switch (name) {
      case 'launch':
        this.tone(380, t, 0.47, 0.17, this.effectsGain, 'sine', 1450);
        this.noise(t, 0.19, 0.17, 1100, this.effectsGain, 'highpass');
        break;
      case 'rocket':
        this.noise(t, 0.42, 0.28, 2800, this.effectsGain, 'highpass');
        this.tone(210, t, 0.3, 0.16, this.effectsGain, 'sawtooth', 640);
        this.explosion(t + 0.03, 0.55, 115, 0.33);
        break;
      case 'sutli': this.explosion(t, 1.32, 63, 0.85); break;
      case 'chakri':
        this.tone(870, t, 0.72, 0.1, this.effectsGain, 'triangle', 260);
        for (let i = 0; i < 7; i++) this.noise(t + i * 0.07, 0.1, 0.1, 2300, this.effectsGain, 'highpass');
        this.explosion(t + 0.02, 0.43, 148, 0.28);
        break;
      case 'ladi':
        [0, 0.09, 0.21, 0.32, 0.43].forEach((delay, i) => this.explosion(t + delay, 0.52 + i * 0.035, 180 - i * 17, 0.16));
        break;
      case 'crumble':
        if (t - this.lastCrumble < 0.16) return;
        this.lastCrumble = t;
        this.noise(t, 0.23, 0.19, 1250, this.effectsGain);
        for (let i = 0; i < 4; i++) this.tone(160 + Math.random() * 380, t + i * 0.032, 0.07, 0.045, this.effectsGain, 'triangle');
        break;
      case 'combo':
        [587.33, 739.99, 880].forEach((note, i) => this.pluck(note, t + i * 0.073, 0.26, 0.2, this.effectsGain));
        break;
      case 'win':
        [587.33, 659.25, 739.99, 880, 987.77, 880, 1174.66].forEach((note, i) => this.pluck(note, t + i * 0.115, 0.62, 0.24, this.effectsGain));
        this.drum(t + 0.78, 135, 0.23, 0.18, this.effectsGain);
        break;
      default: this.explosion(t, 0.8, 82, 0.45);
    }
  }

  destroy() {
    this.destroyed = true;
    clearInterval(this.timer);
    this.timer = null;
    this.context?.close().catch(() => {});
  }
}
