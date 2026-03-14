import { ENEMY_TYPES } from './EnemySystem.js';
import { getMapIdForLevel } from '../maps/MapConfig.js';

export class LevelSystem {
  /**
   * Beheert levels bovenop het wavesysteem.
   * Elk level bestaat uit een vast aantal regular waves,
   * gevolgd door een boss.
   * @param {Phaser.Scene} scene - De actieve scene.
   */
  constructor(scene) {
    this.scene = scene;

    /**
     * Huidig levelnummer.
     */
    this.currentLevel = 1;

    /**
     * Huidige regular wave binnen het level.
     */
    this.currentWaveInLevel = 0;

    /**
     * Aantal regular waves per level.
     */
    this.wavesPerLevel = 5;

    /**
     * Boss delay tussen laatste regular wave en boss spawn.
     */
    this.bossDelayMs = 5000;
    this.bossCountdownRemaining = 0;

    /**
     * Flags voor level flow.
     */
    this.waitingForBoss = false;
    this.isBossActive = false;
    this.isLevelTransitioning = false;

    /**
     * Referentie naar actieve levelboss.
     */
    this.activeBoss = null;

    /**
     * Overlay referentie.
     */
    this.levelCompleteOverlay = null;

    /**
     * Houdt bij welke map logischerwijs actief is voor het huidige level.
     */
    this.activeMapId = getMapIdForLevel(this.currentLevel);
  }

  /**
   * Geeft het huidige level terug.
   * @returns {number} Huidig level.
   */
  getCurrentLevel() {
    return this.currentLevel;
  }

  /**
   * Geeft de huidige wave binnen dit level terug.
   * @returns {number} Huidige wave binnen level.
   */
  getCurrentWaveInLevel() {
    return this.currentWaveInLevel;
  }

  /**
   * Geeft het aantal waves per level terug.
   * @returns {number} Aantal waves per level.
   */
  getWavesPerLevel() {
    return this.wavesPerLevel;
  }

  /**
   * Geeft terug of we wachten op een boss.
   * @returns {boolean} True als boss nog moet spawnen.
   */
  isWaitingForBoss() {
    return this.waitingForBoss;
  }

  /**
   * Wordt aangeroepen wanneer een nieuwe regular wave start.
   * @param {number} globalWaveNumber - Het globale wave nummer.
   */
  handleRegularWaveStarted(globalWaveNumber) {
    const waveInLevel = ((globalWaveNumber - 1) % this.wavesPerLevel) + 1;
    this.currentWaveInLevel = waveInLevel;
  }

  /**
   * Wordt aangeroepen wanneer een regular wave volledig geklaard is.
   * Geeft true terug als er nu een boss-fase moet starten.
   * @returns {boolean} True als een boss-fase start.
   */
  handleRegularWaveCleared() {
    if (this.currentWaveInLevel < this.wavesPerLevel) {
      return false;
    }

    this.waitingForBoss = true;
    this.bossCountdownRemaining = this.bossDelayMs;
    return true;
  }

  /**
   * Update de boss countdown.
   * @param {number} delta - Tijd sinds vorige frame in ms.
   */
  update(delta) {
    if (this.waitingForBoss) {
      this.bossCountdownRemaining -= delta;

      if (this.bossCountdownRemaining <= 0) {
        this.spawnBoss();
      }
    }
  }

  /**
   * Spawn de levelboss met scaling op basis van het level.
   */
  spawnBoss() {
    if (this.isBossActive || this.isLevelTransitioning) {
      return;
    }

    const baseBoss = ENEMY_TYPES.boss;
    const hpMultiplier = Math.pow(1.4, this.currentLevel - 1);
    const goldMultiplier = Math.pow(1.3, this.currentLevel - 1);

    const bossConfig = {
      type: 'boss',
      maxHealth: Math.round(baseBoss.maxHealth * hpMultiplier),
      speed: baseBoss.speed,
      goldReward: Math.round(baseBoss.goldReward * goldMultiplier),
      name: `Boss L${this.currentLevel}`,
    };

    const boss = this.scene.spawnEnemy(bossConfig);
    boss.isLevelBoss = true;
    boss.levelNumber = this.currentLevel;

    this.activeBoss = boss;
    this.waitingForBoss = false;
    this.isBossActive = true;

    if (this.scene && typeof this.scene.showBossHealthBar === 'function') {
      this.scene.showBossHealthBar(boss);
    }
  }

  /**
   * Verwerkt het verslaan van de levelboss.
   * Bepaalt ook of er een mapwissel of victory moet gebeuren.
   * @param {object} enemy - De verslagen boss.
   */
  handleBossKilled(enemy) {
    if (!enemy || !enemy.isLevelBoss) {
      return;
    }

    this.activeBoss = null;
    this.isBossActive = false;

    if (this.scene && typeof this.scene.hideBossHealthBar === 'function') {
      this.scene.hideBossHealthBar();
    }

    if (this.currentLevel >= 15) {
      if (this.scene && typeof this.scene.triggerVictory === 'function') {
        this.scene.triggerVictory();
      }
      return;
    }

    this.isLevelTransitioning = true;
    this.showLevelCompleteOverlay();

    this.scene.time.delayedCall(3000, () => {
      this.currentLevel += 1;
      this.currentWaveInLevel = 0;
      this.isLevelTransitioning = false;

      if (this.levelCompleteOverlay) {
        this.levelCompleteOverlay.destroy();
        this.levelCompleteOverlay = null;
      }

      const nextMapId = getMapIdForLevel(this.currentLevel);

      if (nextMapId !== this.activeMapId) {
        this.activeMapId = nextMapId;

        if (this.scene && typeof this.scene.onMapChange === 'function') {
          this.scene.onMapChange(nextMapId);
        }
      }

      this.scene.waveSystem.beginPreparationPhase();
    });
  }

  /**
   * Verwerkt een boss die ontsnapt of verdwijnt.
   */
  handleBossRemoved() {
    this.activeBoss = null;
    this.isBossActive = false;

    if (this.scene && typeof this.scene.hideBossHealthBar === 'function') {
      this.scene.hideBossHealthBar();
    }
  }

  /**
   * Tekent een level complete overlay in het midden van het speelveld.
   */
  showLevelCompleteOverlay() {
    if (this.levelCompleteOverlay) {
      this.levelCompleteOverlay.destroy();
      this.levelCompleteOverlay = null;
    }

    const centerX = this.scene.fieldW / 2;
    const centerY = this.scene.H / 2;

    const container = this.scene.add.container(0, 0);

    const bg = this.scene.add.rectangle(centerX, centerY, 360, 110, 0x000000, 0.72);
    bg.setStrokeStyle(3, 0xffffff, 0.18);

    const text = this.scene.add.text(centerX, centerY, 'Level Complete!', {
      fontSize: '34px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    container.add([bg, text]);

    this.scene.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      duration: 180,
    });

    this.levelCompleteOverlay = container;
  }

  /**
   * Geeft extra statusinformatie terug voor de HUD.
   * @returns {string} Levelstatus.
   */
  getLevelStatusText() {
    if (this.isBossActive) {
      return `Level ${this.currentLevel} — Boss`;
    }

    if (this.waitingForBoss) {
      const seconds = Math.ceil(this.bossCountdownRemaining / 1000);
      return `Boss verschijnt in: ${seconds}s`;
    }

    return `Level ${this.currentLevel} — Wave ${this.currentWaveInLevel}/${this.wavesPerLevel}`;
  }
}