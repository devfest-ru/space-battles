// Sound effects using Web Audio API
// All sounds are synthesized - no external files needed!

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.backgroundOscillators = [];
    this.beatInterval = null;
    this.isPlaying = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
      
      // Music gain
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.masterGain);
      
      // SFX gain
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);
      
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // PEW - Rocket fire (short laser-like sound)
  playShoot() {
    if (!this.initialized) return;
    this.resume();
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Main tone - descending pitch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
    
    // Add some noise for texture
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(1200, now);
    noise.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  // BANG - Damage hit (impact sound)
  playHit() {
    if (!this.initialized) return;
    this.resume();
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Impact thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.15);
    
    // Crackle
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'square';
    noise.frequency.setValueAtTime(200, now);
    noise.frequency.setValueAtTime(100, now + 0.05);
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.1);
  }

  // BAH - Ship destroyed (explosion)
  playDestroy() {
    if (!this.initialized) return;
    this.resume();
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Low rumble
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(80, now);
    bass.frequency.exponentialRampToValueAtTime(20, now + 0.4);
    bassGain.gain.setValueAtTime(0.6, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    bass.connect(bassGain);
    bassGain.connect(this.sfxGain);
    bass.start(now);
    bass.stop(now + 0.4);
    
    // Mid explosion
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.type = 'sawtooth';
    mid.frequency.setValueAtTime(200, now);
    mid.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    midGain.gain.setValueAtTime(0.3, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    mid.connect(midGain);
    midGain.connect(this.sfxGain);
    mid.start(now);
    mid.stop(now + 0.3);
    
    // High crackle
    const high = ctx.createOscillator();
    const highGain = ctx.createGain();
    high.type = 'square';
    high.frequency.setValueAtTime(400, now);
    high.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    highGain.gain.setValueAtTime(0.2, now);
    highGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    high.connect(highGain);
    highGain.connect(this.sfxGain);
    high.start(now);
    high.stop(now + 0.2);
  }

  // Victory fanfare
  playVictory() {
    if (!this.initialized) return;
    this.resume();
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Triumphant ascending notes
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const durations = [0.15, 0.15, 0.15, 0.4];
    
    let time = now;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.setValueAtTime(0.3, time + durations[i] * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(time);
      osc.stop(time + durations[i]);
      
      time += durations[i];
    });
    
    // Add harmony
    setTimeout(() => {
      const chord = [523.25, 659.25, 783.99];
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      });
    }, 600);
  }

  // Background battle music - rhythmic "tuc tuc" beat
  startBackgroundMusic() {
    if (!this.initialized || this.isPlaying) return;
    // Don't start if page is hidden/backgrounded
    if (document.hidden) return;
    this.resume();
    
    const ctx = this.audioContext;
    this.isPlaying = true;
    
    // BPM for the beat
    const bpm = 120;
    const beatInterval = 60000 / bpm; // ms per beat
    
    // Kick drum sound (tuc)
    const playKick = () => {
      if (!this.isPlaying) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    };
    
    // Hi-hat sound (lighter tuc)
    const playHat = () => {
      if (!this.isPlaying) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'square';
      osc.frequency.value = 800;
      
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    };
    
    // Bass line
    const playBass = (note = 55) => {
      if (!this.isPlaying) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = note;
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    };
    
    // Beat pattern: tuc-tuc (kick-hat)
    let beatCount = 0;
    const bassNotes = [55, 55, 73.4, 55]; // A, A, D, A
    
    const playBeat = () => {
      if (!this.isPlaying) return;
      
      const beatInBar = beatCount % 4;
      
      // Kick on 1 and 3
      if (beatInBar === 0 || beatInBar === 2) {
        playKick();
        playBass(bassNotes[beatCount % bassNotes.length]);
      }
      
      // Hat on all beats (tuc tuc tuc tuc)
      playHat();
      
      beatCount++;
    };
    
    // Start immediately
    playBeat();
    
    // Continue the beat
    this.beatInterval = setInterval(playBeat, beatInterval / 2); // 8th notes
  }

  stopBackgroundMusic() {
    // Stop the beat interval
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    
    // Stop any lingering oscillators
    this.backgroundOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
        setTimeout(() => osc.stop(), 500);
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    this.backgroundOscillators = [];
    this.isPlaying = false;
  }

  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  setMusicVolume(value) {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  setSfxVolume(value) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();
export default soundManager;

