export class EconomySystem {
  /**
   * Beheert gold, kill rewards en passief inkomen.
   * @param {Phaser.Scene} scene - De actieve scene.
   */
  constructor(scene) {
    this.scene = scene;
    this.gold = 45;

    /**
     * Totaal verdiende gold over de volledige run.
     * Startgold telt hier expliciet niet mee.
     */
    this.totalGoldEarned = 0;

    /**
     * Huidig passief inkomen per seconde.
     */
    this.passiveIncomePerSecond = 1.6;

    /**
     * Buffer om fractionele income correct op te sparen.
     */
    this.passiveIncomeBuffer = 0;

    /**
     * Totaal verstreken speeltijd in ms.
     */
    this.elapsedGameTime = 0;

    /**
     * Timer voor trage automatische income scaling.
     */
    this.incomeGrowthTimer = 0;

    /**
     * Elke 20 seconden stijgt passive income lichtjes.
     */
    this.timeGrowthInterval = 20000;

    /**
     * Hoeveel passive income erbij komt per tijdsinterval.
     */
    this.timeGrowthAmount = 0.3;
  }

  /**
   * Geeft een hoeveelheid gold aan de speler.
   * Deze gold telt ook mee voor de run-statistieken.
   * @param {number} amount - Hoeveel gold toegevoegd wordt.
   */
  addGold(amount) {
    this.gold += amount;

    if (amount > 0) {
      this.totalGoldEarned += amount;
    }
  }

  /**
   * Probeert gold uit te geven.
   * @param {number} amount - Hoeveel gold uitgegeven moet worden.
   * @returns {boolean} True als de aankoop gelukt is, anders false.
   */
  spendGold(amount) {
    if (this.gold < amount) {
      return false;
    }

    this.gold -= amount;
    return true;
  }

  /**
   * Geeft de huidige hoeveelheid gold terug.
   * @returns {number} Huidige gold.
   */
  getGold() {
    return Math.floor(this.gold);
  }

  /**
   * Geeft het totaal verdiende gold van deze run terug.
   * @returns {number} Totale verdiende gold.
   */
  getTotalGoldEarned() {
    return Math.floor(this.totalGoldEarned);
  }

  /**
   * Geeft gold voor een kill.
   * @param {number} amount - Kill reward.
   */
  rewardKill(amount) {
    this.addGold(amount);
  }

  /**
   * Verhoogt passive income rechtstreeks.
   * @param {number} amount - Hoeveel income toegevoegd wordt.
   */
  addPassiveIncome(amount) {
    this.passiveIncomePerSecond += amount;
  }

  /**
   * Geeft een income bonus wanneer een nieuwe wave start.
   * @param {number} waveNumber - Nummer van de nieuwe wave.
   */
  applyWaveIncomeGrowth(waveNumber) {
    const growth = 0.25 + waveNumber * 0.05;
    this.addPassiveIncome(growth);
  }

  /**
   * Update passief inkomen en tijdsgebaseerde scaling.
   * Doet niets zolang het spel nog niet gestart is.
   * @param {number} delta - Tijd sinds vorige frame in ms.
   * @param {boolean} isStarted - Geeft aan of het spel gestart is.
   */
  update(delta, isStarted) {
    if (!isStarted) {
      return;
    }

    this.elapsedGameTime += delta;
    this.incomeGrowthTimer += delta;

    // Passieve gold generatie.
    const goldPerMs = this.passiveIncomePerSecond / 1000;
    this.passiveIncomeBuffer += goldPerMs * delta;

    if (this.passiveIncomeBuffer >= 1) {
      const wholeGold = Math.floor(this.passiveIncomeBuffer);
      this.addGold(wholeGold);
      this.passiveIncomeBuffer -= wholeGold;
    }

    // Trage income scaling over tijd.
    if (this.incomeGrowthTimer >= this.timeGrowthInterval) {
      const intervalsPassed = Math.floor(this.incomeGrowthTimer / this.timeGrowthInterval);
      this.addPassiveIncome(intervalsPassed * this.timeGrowthAmount);
      this.incomeGrowthTimer -= intervalsPassed * this.timeGrowthInterval;
    }
  }
}