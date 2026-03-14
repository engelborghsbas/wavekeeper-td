export class UpgradeSystem {
  /**
   * Beheert alle speler-upgrades.
   * @param {Phaser.Scene} scene - De actieve scene.
   */
  constructor(scene) {
    this.scene = scene;

    /**
     * Damage upgrade.
     */
    this.damageLevel = 0;
    this.damageCosts = [40, 70, 110, 170, 260, 380, 540];
    this.damagePerLevel = 3;

    /**
     * Attack speed upgrade.
     */
    this.attackSpeedLevel = 0;
    this.attackSpeedCosts = [50, 85, 130, 200, 300, 430];
    this.attackSpeedFactorPerLevel = 0.92;

    /**
     * Passive income upgrade.
     */
    this.passiveIncomeLevel = 0;
    this.passiveIncomeCosts = [35, 60, 95, 140, 210, 300, 420];
    this.passiveIncomePerLevel = 0.6;

    /**
     * Tower range upgrade.
     */
    this.towerRangeLevel = 0;
    this.towerRangeCosts = [45, 80, 130, 210, 320];
    this.towerRangePerLevel = 18;

    /**
     * Freeze duration upgrade.
     */
    this.freezeLevel = 0;
    this.freezeCosts = [60, 100, 150, 220, 300];
    this.freezeDurationBase = 2000;
    this.freezeDurationPerLevel = 500;
  }

  /**
   * Geeft de totale damage bonus terug.
   * @returns {number} Damage bonus.
   */
  getDamageBonus() {
    return this.damageLevel * this.damagePerLevel;
  }

  /**
   * Geeft de attack speed multiplier terug.
   * Lager = sneller schieten.
   * @returns {number} Cooldown multiplier.
   */
  getAttackSpeedMultiplier() {
    return Math.pow(this.attackSpeedFactorPerLevel, this.attackSpeedLevel);
  }

  /**
   * Geeft de totale tower range bonus terug.
   * @returns {number} Range bonus.
   */
  getTowerRangeBonus() {
    return this.towerRangeLevel * this.towerRangePerLevel;
  }

  /**
   * Geeft de actuele freeze duration in ms terug.
   * @returns {number} Freeze duration.
   */
  getFreezeDuration() {
    return this.freezeDurationBase + this.freezeLevel * this.freezeDurationPerLevel;
  }

  /**
   * Koopt een damage upgrade indien mogelijk.
   * @returns {boolean} Of de aankoop gelukt is.
   */
  buyDamageUpgrade() {
    const cost = this.damageCosts[this.damageLevel];

    if (cost === undefined) {
      return false;
    }

    if (!this.scene.economySystem.spendGold(cost)) {
      return false;
    }

    this.damageLevel++;
    this.applyTowerStats();
    return true;
  }

  /**
   * Koopt een attack speed upgrade indien mogelijk.
   * @returns {boolean} Of de aankoop gelukt is.
   */
  buyAttackSpeedUpgrade() {
    const cost = this.attackSpeedCosts[this.attackSpeedLevel];

    if (cost === undefined) {
      return false;
    }

    if (!this.scene.economySystem.spendGold(cost)) {
      return false;
    }

    this.attackSpeedLevel++;
    this.applyTowerStats();
    return true;
  }

  /**
   * Koopt een passive income upgrade indien mogelijk.
   * @returns {boolean} Of de aankoop gelukt is.
   */
  buyPassiveIncomeUpgrade() {
    const cost = this.passiveIncomeCosts[this.passiveIncomeLevel];

    if (cost === undefined) {
      return false;
    }

    if (!this.scene.economySystem.spendGold(cost)) {
      return false;
    }

    this.passiveIncomeLevel++;
    this.scene.economySystem.setPassiveIncomeBonus(
      this.passiveIncomeLevel * this.passiveIncomePerLevel
    );

    return true;
  }

  /**
   * Koopt een tower range upgrade indien mogelijk.
   * @returns {boolean} Of de aankoop gelukt is.
   */
  buyTowerRangeUpgrade() {
    if (this.isTowerRangeMaxed()) {
      return false;
    }

    const cost = this.towerRangeCosts[this.towerRangeLevel];

    if (!this.scene.economySystem.spendGold(cost)) {
      return false;
    }

    this.towerRangeLevel++;
    this.applyTowerStats();
    return true;
  }

  /**
   * Koopt een freeze upgrade indien mogelijk.
   * @returns {boolean} Of de aankoop gelukt is.
   */
  buyFreezeUpgrade() {
    if (this.isFreezeMaxed()) {
      return false;
    }

    const cost = this.freezeCosts[this.freezeLevel];

    if (!this.scene.economySystem.spendGold(cost)) {
      return false;
    }

    this.freezeLevel++;
    this.applyTowerStats();
    return true;
  }

  /**
   * Past de actuele stats toe op alle bestaande torens.
   */
  applyTowerStats() {
    for (const tower of this.scene.towers) {
      if (tower && tower.active && typeof tower.applyUpgradeStats === 'function') {
        tower.applyUpgradeStats(this);
      }
    }
  }

  /**
   * Controleert of tower range maxed is.
   * @returns {boolean} True als de upgrade maxed is.
   */
  isTowerRangeMaxed() {
    return this.towerRangeLevel >= this.towerRangeCosts.length;
  }

  /**
   * Controleert of freeze maxed is.
   * @returns {boolean} True als de upgrade maxed is.
   */
  isFreezeMaxed() {
    return this.freezeLevel >= this.freezeCosts.length;
  }

  /**
   * Geeft alle upgradegegevens terug voor de UI.
   * @returns {object} UI data.
   */
  getUpgradeData() {
    return {
      damage: {
        level: this.damageLevel,
        cost: this.damageCosts[this.damageLevel] ?? 'MAX',
      },
      attackSpeed: {
        level: this.attackSpeedLevel,
        cost: this.attackSpeedCosts[this.attackSpeedLevel] ?? 'MAX',
      },
      passiveIncome: {
        level: this.passiveIncomeLevel,
        cost: this.passiveIncomeCosts[this.passiveIncomeLevel] ?? 'MAX',
      },
      towerRange: {
        level: this.towerRangeLevel,
        cost: this.towerRangeCosts[this.towerRangeLevel] ?? 'MAX',
        isMaxed: this.isTowerRangeMaxed(),
      },
      freeze: {
        level: this.freezeLevel,
        cost: this.freezeCosts[this.freezeLevel] ?? 'MAX',
        isMaxed: this.isFreezeMaxed(),
        durationMs: this.getFreezeDuration(),
      },
    };
  }
}