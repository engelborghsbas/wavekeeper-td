export class LivesSystem {
  /**
   * Beheert de levens van de speler.
   * @param {Phaser.Scene} scene - De actieve scene.
   * @param {number} startingLives - Aantal startlevens.
   */
  constructor(scene, startingLives = 20) {
    this.scene = scene;
    this.startingLives = startingLives;
    this.lives = startingLives;
  }

  /**
   * Geeft het huidige aantal levens terug.
   * @returns {number} Huidig aantal levens.
   */
  getLives() {
    return this.lives;
  }

  /**
   * Verwijdert levens van de speler.
   * @param {number} amount - Hoeveel levens verloren gaan.
   * @returns {number} Het nieuwe aantal levens.
   */
  loseLives(amount = 1) {
    this.lives -= amount;

    if (this.lives < 0) {
      this.lives = 0;
    }

    return this.lives;
  }

  /**
   * Controleert of de speler verslagen is.
   * @returns {boolean} True als levens 0 zijn.
   */
  isGameOver() {
    return this.lives <= 0;
  }

  /**
   * Reset het aantal levens naar de startwaarde.
   */
  reset() {
    this.lives = this.startingLives;
  }
}