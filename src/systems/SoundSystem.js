export class SoundSystem {
  /**
   * Beheert eenvoudige synthesizer-SFX via de Web Audio context van Phaser.
   * @param {Phaser.Scene} scene - De actieve scene.
   */
  constructor(scene) {
    this.scene = scene;
    this.muted = false;
  }

  /**
   * Geeft de actieve audio context terug indien beschikbaar.
   * @returns {AudioContext|null} De audio context of null.
   */
  getAudioContext() {
    const audioContext = this.scene?.sound?.context;

    if (!audioContext) {
      return null;
    }

    return audioContext;
  }

  /**
   * Probeert de audio context te hervatten indien die nog suspended is.
   */
  resumeContextIfNeeded() {
    const context = this.getAudioContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }
  }

  /**
   * Speelt een oscillator-geluid af met eenvoudige ADSR-achtige fade.
   * @param {{
   *  type: OscillatorType,
   *  startFrequency: number,
   *  endFrequency?: number,
   *  durationMs: number,
   *  volume?: number
   * }} config - Synthconfiguratie.
   */
  playTone(config) {
    if (this.muted) {
      return;
    }

    const context = this.getAudioContext();

    if (!context) {
      return;
    }

    this.resumeContextIfNeeded();

    const now = context.currentTime;
    const durationSeconds = config.durationMs / 1000;
    const endFrequency = config.endFrequency ?? config.startFrequency;
    const volume = config.volume ?? 0.05;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.startFrequency, now);
    oscillator.frequency.linearRampToValueAtTime(endFrequency, now + durationSeconds);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.01);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  }

  /**
   * Speelt een korte hoge blip af voor een aanval.
   */
  playAttack() {
    this.playTone({
      type: 'square',
      startFrequency: 880,
      durationMs: 80,
      volume: 0.035,
    });
  }

  /**
   * Speelt een dalende toon af wanneer een enemy sterft.
   */
  playEnemyDeath() {
    this.playTone({
      type: 'sawtooth',
      startFrequency: 440,
      endFrequency: 220,
      durationMs: 150,
      volume: 0.045,
    });
  }

  /**
   * Speelt een lage buzz af wanneer een leven verloren gaat.
   */
  playLifeLost() {
    this.playTone({
      type: 'sine',
      startFrequency: 120,
      durationMs: 300,
      volume: 0.06,
    });
  }

  /**
   * Zet mute aan of uit.
   */
  toggleMute() {
    this.muted = !this.muted;
  }

  /**
   * Geeft terug of het geluid momenteel gemute is.
   * @returns {boolean} True als muted.
   */
  isMuted() {
    return this.muted;
  }
}