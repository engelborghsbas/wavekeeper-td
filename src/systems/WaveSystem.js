/**
 * Vaste wave-configuratie voor de eerste 10 waves.
 * Elke wave bevat een lijst van enemy groups met type + count.
 */
export const WAVE_CONFIG = [
  {
    wave: 1,
    enemies: [
      { type: 'basic', count: 6 },
    ],
    spawnInterval: 950,
  },
  {
    wave: 2,
    enemies: [
      { type: 'basic', count: 8 },
    ],
    spawnInterval: 900,
  },
  {
    wave: 3,
    enemies: [
      { type: 'basic', count: 10 },
    ],
    spawnInterval: 860,
  },
  {
    wave: 4,
    enemies: [
      { type: 'basic', count: 8 },
      { type: 'fast', count: 4 },
    ],
    spawnInterval: 820,
  },
  {
    wave: 5,
    enemies: [
      { type: 'basic', count: 10 },
      { type: 'fast', count: 6 },
    ],
    spawnInterval: 780,
  },
  {
    wave: 6,
    enemies: [
      { type: 'basic', count: 8 },
      { type: 'fast', count: 5 },
      { type: 'tank', count: 2 },
      { type: 'armored', count: 2 },
    ],
    spawnInterval: 760,
  },
  {
    wave: 7,
    enemies: [
      { type: 'basic', count: 8 },
      { type: 'tank', count: 4 },
      { type: 'armored', count: 4 },
    ],
    spawnInterval: 740,
  },
  {
    wave: 8,
    enemies: [
      { type: 'basic', count: 6 },
      { type: 'fast', count: 4 },
      { type: 'stealth', count: 4 },
      { type: 'armored', count: 3 },
    ],
    spawnInterval: 710,
  },
  {
    wave: 9,
    enemies: [
      { type: 'basic', count: 8 },
      { type: 'fast', count: 6 },
      { type: 'tank', count: 3 },
      { type: 'stealth', count: 3 },
      { type: 'armored', count: 4 },
    ],
    spawnInterval: 680,
  },
  {
    wave: 10,
    enemies: [
      { type: 'basic', count: 8 },
      { type: 'fast', count: 8 },
      { type: 'tank', count: 4 },
      { type: 'stealth', count: 4 },
      { type: 'armored', count: 5 },
      { type: 'boss', count: 1 },
    ],
    spawnInterval: 640,
  },
];

export class WaveSystem {
  /**
   * Beheert waves, countdowns tussen waves en spawnvolgorde.
   * Waves starten pas nadat de speler handmatig op Start klikt.
   * @param {Phaser.Scene} scene - De actieve scene.
   */
  constructor(scene) {
    this.scene = scene;

    /**
     * Huidige wave index voor de speler.
     */
    this.currentWave = 0;

    /**
     * Queue met individuele enemies die nog gespawned moeten worden.
     */
    this.spawnQueue = [];

    /**
     * Tijdaccumulator voor spawn-interval.
     */
    this.spawnTimer = 0;

    /**
     * Huidig interval tussen spawns in ms.
     */
    this.spawnInterval = 950;

    /**
     * Geeft aan of er momenteel een actieve wave bezig is.
     */
    this.isWaveActive = false;

    /**
     * Geeft aan of de countdown tussen twee waves loopt.
     */
    this.isInPreparation = false;

    /**
     * Resterende tijd voor de volgende wave in ms.
     */
    this.timeUntilNextWave = 8000;

    /**
     * Duur van de countdown tussen waves in ms.
     */
    this.preparationDuration = 8000;

    /**
     * Geeft aan of het wavesysteem al manueel gestart is.
     */
    this.hasStarted = false;

    /**
     * Referentie naar de actieve wave-config.
     */
    this.activeWaveConfig = null;
  }

  /**
   * Start het volledige wavesysteem handmatig.
   * Vanaf dan mogen waves en voorbereidingstimers lopen.
   */
  startManually() {
    if (this.hasStarted) {
      return;
    }

    this.hasStarted = true;
    this.beginPreparationPhase();
  }

  /**
   * Geeft de wave-config voor een opgegeven wave terug.
   * Als de vaste config op is, wordt de laatste wave dynamisch opgeschaald.
   * @param {number} waveNumber - 1-based wave nummer.
   * @returns {{wave:number,enemies:Array<{type:string,count:number}>,spawnInterval:number}}
   */
  getWaveConfig(waveNumber) {
    const predefined = WAVE_CONFIG.find((config) => config.wave === waveNumber);

    if (predefined) {
      return {
        wave: predefined.wave,
        enemies: predefined.enemies.map((entry) => ({ ...entry })),
        spawnInterval: predefined.spawnInterval,
      };
    }

    const extraWave = waveNumber - WAVE_CONFIG.length;
    const lastConfig = WAVE_CONFIG[WAVE_CONFIG.length - 1];

    const scaledEnemies = lastConfig.enemies.map((entry) => {
      let extraCount = Math.floor(extraWave / 2);

      if (entry.type === 'basic' || entry.type === 'fast') {
        extraCount += 1;
      }

      if (entry.type === 'tank' || entry.type === 'armored' || entry.type === 'stealth') {
        extraCount += Math.floor(extraWave / 3);
      }

      if (entry.type === 'boss') {
        extraCount = Math.min(2, 1 + Math.floor(extraWave / 6));
      }

      return {
        type: entry.type,
        count: entry.count + extraCount,
      };
    });

    return {
      wave: waveNumber,
      enemies: scaledEnemies,
      spawnInterval: Math.max(420, lastConfig.spawnInterval - extraWave * 18),
    };
  }

  /**
   * Zet de enemy groups van een wave om naar een individuele spawnqueue.
   * @param {{enemies:Array<{type:string,count:number}>}} waveConfig - Config van de wave.
   * @returns {Array<{type:string}>} Queue met enemies in spawnvolgorde.
   */
  buildSpawnQueue(waveConfig) {
    const queue = [];

    for (const group of waveConfig.enemies) {
      for (let i = 0; i < group.count; i++) {
        queue.push({ type: group.type });
      }
    }

    return queue;
  }

  /**
   * Start de volgende wave op basis van de config.
   * Meldt ook aan het levelsystem welke regular wave gestart is.
   */
  startNextWave() {
    this.currentWave += 1;
    this.activeWaveConfig = this.getWaveConfig(this.currentWave);
    this.spawnQueue = this.buildSpawnQueue(this.activeWaveConfig);
    this.spawnInterval = this.activeWaveConfig.spawnInterval;
    this.spawnTimer = 0;
    this.isWaveActive = true;
    this.isInPreparation = false;

    if (this.scene.levelSystem) {
      this.scene.levelSystem.handleRegularWaveStarted(this.currentWave);
    }
  }

  /**
   * Controleert of de huidige wave volledig afgewerkt is.
   * @returns {boolean} True als de wave klaar is.
   */
  isWaveCleared() {
    return (
      this.isWaveActive &&
      this.spawnQueue.length === 0 &&
      this.scene.enemies.length === 0
    );
  }

  /**
   * Start een countdown-timer voor de volgende wave.
   */
  beginPreparationPhase() {
    this.isWaveActive = false;
    this.isInPreparation = true;
    this.timeUntilNextWave = this.preparationDuration;
  }

  /**
   * Slaat de actieve preparation countdown over en start meteen de volgende wave.
   */
  skipPreparation() {
    if (!this.hasStarted || !this.isInPreparation) {
      return;
    }

    this.timeUntilNextWave = 0;
    this.startNextWave();
  }

  /**
   * Geeft terug hoeveel enemies nog gespawned moeten worden in de huidige wave.
   * @returns {number} Aantal enemies nog in de spawnqueue.
   */
  getRemainingSpawns() {
    return this.spawnQueue.length;
  }

  /**
   * Geeft tekst terug die de huidige wave-status beschrijft.
   * @returns {string} Statusregel voor de HUD.
   */
  getStatusText() {
    if (!this.hasStarted) {
      return 'Press Start to begin';
    }

    if (this.scene.isPaused) {
      return 'Game paused';
    }

    if (this.scene.levelSystem?.isBossActive) {
      return 'Boss actief';
    }

    if (this.scene.levelSystem?.isWaitingForBoss()) {
      const seconds = Math.ceil(this.scene.levelSystem.bossCountdownRemaining / 1000);
      return `Boss verschijnt in: ${seconds}s`;
    }

    if (this.isInPreparation) {
      const seconds = Math.ceil(this.timeUntilNextWave / 1000);
      return `Volgende wave in: ${seconds}s`;
    }

    return `Enemies left to spawn: ${this.getRemainingSpawns()}`;
  }

  /**
   * Update de wave flow: countdown, spawns en wave-einde.
   * Doet niets zolang het spel nog niet gestart is.
   * @param {number} delta - Tijd sinds vorige frame in ms.
   * @param {boolean} isStarted - Geeft aan of het spel gestart is.
   */
  update(delta, isStarted) {
    if (!isStarted || !this.hasStarted) {
      return;
    }

    if (this.isInPreparation) {
      this.timeUntilNextWave -= delta;

      if (this.timeUntilNextWave <= 0) {
        this.startNextWave();
      }

      return;
    }

    if (this.isWaveActive && this.spawnQueue.length > 0) {
      this.spawnTimer += delta;

      if (this.spawnTimer >= this.spawnInterval) {
        const nextEnemy = this.spawnQueue.shift();

        if (nextEnemy) {
          this.scene.spawnEnemy({
            type: nextEnemy.type,
          });
        }

        this.spawnTimer = 0;
      }
    }

    if (this.isWaveCleared()) {
      this.isWaveActive = false;

      if (this.scene.levelSystem) {
        const bossPhaseStarts = this.scene.levelSystem.handleRegularWaveCleared();

        if (bossPhaseStarts) {
          return;
        }
      }

      this.beginPreparationPhase();
    }
  }
}