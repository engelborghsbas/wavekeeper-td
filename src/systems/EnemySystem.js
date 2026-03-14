import Phaser from 'phaser';

/**
 * Centrale configuratie voor alle enemy types.
 */
export const ENEMY_TYPES = {
  basic: {
    key: 'basic',
    name: 'Basic',
    color: 0xaaaaaa,
    maxHealth: 60,
    speed: 80,
    goldReward: 10,
    shape: 'circle',
    radius: 12,
    alpha: 1,
    armor: 0,
    detectStealthRequired: false,
  },
  fast: {
    key: 'fast',
    name: 'Fast',
    color: 0xffdd00,
    maxHealth: 40,
    speed: 160,
    goldReward: 15,
    shape: 'triangle',
    radius: 12,
    alpha: 1,
    armor: 0,
    detectStealthRequired: false,
  },
  tank: {
    key: 'tank',
    name: 'Tank',
    color: 0xcc2200,
    maxHealth: 250,
    speed: 45,
    goldReward: 30,
    shape: 'square',
    radius: 14,
    alpha: 1,
    armor: 0,
    detectStealthRequired: false,
  },
  stealth: {
    key: 'stealth',
    name: 'Stealth',
    color: 0x9900cc,
    maxHealth: 80,
    speed: 100,
    goldReward: 20,
    shape: 'circle',
    radius: 12,
    alpha: 0.4,
    armor: 0,
    detectStealthRequired: true,
  },
  armored: {
    key: 'armored',
    name: 'Armored',
    color: 0x2255ff,
    maxHealth: 180,
    speed: 60,
    goldReward: 25,
    shape: 'armored',
    radius: 13,
    alpha: 1,
    armor: 15,
    detectStealthRequired: false,
  },
  boss: {
    key: 'boss',
    name: 'Boss',
    color: 0xff6600,
    maxHealth: 1000,
    speed: 40,
    goldReward: 150,
    shape: 'boss',
    radius: 28,
    alpha: 1,
    armor: 0,
    detectStealthRequired: false,
  },
};

export class Enemy extends Phaser.GameObjects.Container {
  /**
   * Maakt een enemy aan die een lijst van waypoints volgt.
   * Mapbonussen worden bij spawn toegepast.
   * @param {Phaser.Scene} scene - De actieve scene.
   * @param {Array<{x:number,y:number}>} pathPoints - Array van waypoints.
   * @param {{type?: string, maxHealth?: number, speed?: number, goldReward?: number, killReward?: number, armor?: number, name?: string, mapBonus?: object|null}} config - Enemy stats/config.
   */
  constructor(scene, pathPoints, config = {}) {
    const requestedType = config.type ?? 'basic';
    const typeConfig = ENEMY_TYPES[requestedType] ?? ENEMY_TYPES.basic;
    const mapBonus = config.mapBonus ?? null;

    super(scene, pathPoints[0].x, pathPoints[0].y);

    this.scene = scene;
    this.pathPoints = pathPoints;
    this.currentWaypointIndex = 1;
    this.type = typeConfig.key;
    this.enemyName = config.name ?? typeConfig.name;

    const baseSpeed = config.speed ?? typeConfig.speed;
    const baseMaxHealth = config.maxHealth ?? typeConfig.maxHealth;

    this.speed = this.applyMapBonusToSpeed(baseSpeed, mapBonus);
    this.baseSpeed = this.speed;
    this.maxHealth = this.applyMapBonusToHealth(baseMaxHealth, mapBonus);
    this.health = this.maxHealth;

    this.killReward = config.goldReward ?? config.killReward ?? typeConfig.goldReward;
    this.armor = config.armor ?? typeConfig.armor ?? 0;
    this.isDead = false;
    this.reachedEnd = false;
    this.isStealth = this.type === 'stealth';
    this.requiresStealthDetection = typeConfig.detectStealthRequired ?? false;
    this.isArmored = this.type === 'armored';
    this.isBoss = this.type === 'boss';
    this.pathProgress = 0;

    /**
     * Freeze status.
     */
    this.isFrozen = false;
    this.freezeRestoreEvent = null;
    this.freezeTintColor = 0x66ccff;

    /**
     * Boss burst thresholds.
     * Bij 75%, 50% en 25% resterende HP triggert een burst.
     */
    this.bossBurstThresholds = this.isBoss ? [0.75, 0.5, 0.25] : [];
    this.bossBurstTriggered = new Set();

    this.bodyVisual = this.createBodyVisual(typeConfig);
    this.add(this.bodyVisual);

    this.healthBarWidth = Math.max(28, typeConfig.radius * 2.4);
    this.healthBarOffsetY = typeConfig.radius + 10;

    this.healthBarBg = scene.add.rectangle(
      this.x,
      this.y - this.healthBarOffsetY,
      this.healthBarWidth,
      5,
      0x000000,
      0.85
    );
    this.healthBarBg.setStrokeStyle(1, 0xffffff, 0.15);

    this.healthBar = scene.add.rectangle(
      this.x - this.healthBarWidth / 2,
      this.y - this.healthBarOffsetY,
      this.healthBarWidth,
      5,
      0x00ff66,
      1
    );
    this.healthBar.setOrigin(0, 0.5);

    scene.add.existing(this);

    if (typeConfig.alpha !== undefined) {
      this.setAlpha(typeConfig.alpha);
    }

    this.updateHealthBar();
  }

  /**
   * Past een eventuele snelheidsbonus toe.
   * @param {number} speed - Basis- of override snelheid.
   * @param {object|null} mapBonus - Actieve mapbonus.
   * @returns {number} Aangepaste snelheid.
   */
  applyMapBonusToSpeed(speed, mapBonus) {
    if (!mapBonus || mapBonus.type !== 'speedMultiplier') {
      return speed;
    }

    return Math.round(speed * mapBonus.value);
  }

  /**
   * Past een eventuele HP-bonus toe.
   * @param {number} maxHealth - Basis- of override HP.
   * @param {object|null} mapBonus - Actieve mapbonus.
   * @returns {number} Aangepaste HP.
   */
  applyMapBonusToHealth(maxHealth, mapBonus) {
    if (!mapBonus || mapBonus.type !== 'healthBonus') {
      return maxHealth;
    }

    return Math.round(maxHealth + mapBonus.value);
  }

  /**
   * Bouwt de visuele vorm op basis van het enemy type.
   * @param {object} typeConfig - De typeconfiguratie.
   * @returns {Phaser.GameObjects.GameObject} De hoofdvisual.
   */
  createBodyVisual(typeConfig) {
    const color = typeConfig.color;
    const radius = typeConfig.radius;

    if (typeConfig.shape === 'triangle') {
      const triangle = this.scene.add.triangle(
        0,
        0,
        0,
        -radius,
        radius,
        radius,
        -radius,
        radius,
        color,
        1
      );
      triangle.setStrokeStyle(2, 0xffffff, 0.35);
      return triangle;
    }

    if (typeConfig.shape === 'square') {
      const square = this.scene.add.rectangle(0, 0, radius * 2.1, radius * 2.1, color, 1);
      square.setStrokeStyle(2, 0xffffff, 0.35);
      return square;
    }

    if (typeConfig.shape === 'armored') {
      const container = this.scene.add.container(0, 0);

      const core = this.scene.add.circle(0, 0, radius, color, 1);
      core.setStrokeStyle(2, 0xffffff, 0.25);

      const armorRing = this.scene.add.circle(0, 0, radius + 4, 0x000000, 0);
      armorRing.setStrokeStyle(3, 0xbfd3ff, 0.95);

      container.add([core, armorRing]);
      return container;
    }

    if (typeConfig.shape === 'boss') {
      const container = this.scene.add.container(0, 0);

      const glow = this.scene.add.circle(0, 0, radius + 10, color, 0.18);
      const outerRing = this.scene.add.circle(0, 0, radius + 5, color, 0);
      outerRing.setStrokeStyle(4, color, 0.45);

      const core = this.scene.add.circle(0, 0, radius, color, 1);
      core.setStrokeStyle(3, 0xffffff, 0.28);

      container.add([glow, outerRing, core]);
      return container;
    }

    const circle = this.scene.add.circle(0, 0, radius, color, 1);
    circle.setStrokeStyle(2, 0xffffff, 0.35);
    return circle;
  }

  /**
   * Geeft de huidige HP van deze enemy terug.
   * @returns {number} Huidige health.
   */
  getCurrentHealth() {
    return this.health;
  }

  /**
   * Geeft de maximale HP van deze enemy terug.
   * @returns {number} Maximale health.
   */
  getMaxHealth() {
    return this.maxHealth;
  }

  /**
   * Geeft alle actieve enemies op het veld terug.
   * @param {Array<Enemy>} enemies - Lijst met enemies.
   * @returns {Array<Enemy>} Alleen geldige actieve enemies.
   */
  static getActiveEnemies(enemies = []) {
    return enemies.filter((enemy) => enemy && enemy.active && !enemy.isDead && !enemy.reachedEnd);
  }

  /**
   * Geeft de gemiddelde huidige HP van actieve enemies terug.
   * @param {Array<Enemy>} enemies - Lijst met enemies.
   * @returns {number|null} Gemiddelde HP of null als er geen actieve enemies zijn.
   */
  static getAverageCurrentHealth(enemies = []) {
    const activeEnemies = Enemy.getActiveEnemies(enemies);

    if (activeEnemies.length === 0) {
      return null;
    }

    const totalHealth = activeEnemies.reduce((sum, enemy) => {
      return sum + enemy.getCurrentHealth();
    }, 0);

    return totalHealth / activeEnemies.length;
  }

  /**
   * Geeft de hoogste huidige HP van actieve enemies terug.
   * @param {Array<Enemy>} enemies - Lijst met enemies.
   * @returns {number|null} Hoogste huidige HP of null als er geen actieve enemies zijn.
   */
  static getHighestCurrentHealth(enemies = []) {
    const activeEnemies = Enemy.getActiveEnemies(enemies);

    if (activeEnemies.length === 0) {
      return null;
    }

    return Math.max(...activeEnemies.map((enemy) => enemy.getCurrentHealth()));
  }

  /**
   * Geeft de hoogste maximale HP van actieve enemies terug.
   * @param {Array<Enemy>} enemies - Lijst met enemies.
   * @returns {number|null} Hoogste max HP of null als er geen actieve enemies zijn.
   */
  static getHighestMaxHealth(enemies = []) {
    const activeEnemies = Enemy.getActiveEnemies(enemies);

    if (activeEnemies.length === 0) {
      return null;
    }

    return Math.max(...activeEnemies.map((enemy) => enemy.getMaxHealth()));
  }

  /**
   * Bouwt een compacte UI-string voor enemy HP in het veld.
   * @param {Array<Enemy>} enemies - Lijst met enemies.
   * @returns {string} HP-string voor de HUD.
   */
  static getFieldHpText(enemies = []) {
    const currentHp = Enemy.getHighestCurrentHealth(enemies);
    const maxHp = Enemy.getHighestMaxHealth(enemies);

    if (currentHp === null || maxHp === null) {
      return '—';
    }

    return `${Math.ceil(currentHp)} / ${Math.ceil(maxHp)}`;
  }

  /**
   * Past freeze toe op deze enemy.
   * De snelheid wordt gehalveerd voor de opgegeven duur.
   * @param {number} durationMs - Freeze duur in ms.
   */
  applyFreeze(durationMs) {
    if (this.isDead || this.reachedEnd) {
      return;
    }

    this.isFrozen = true;
    this.speed = this.baseSpeed * 0.5;
    this.applyTintToBody(this.freezeTintColor);

    if (this.freezeRestoreEvent) {
      this.freezeRestoreEvent.remove(false);
    }

    this.freezeRestoreEvent = this.scene.time.delayedCall(durationMs, () => {
      this.clearFreeze();
    });
  }

  /**
   * Verwijdert het freeze-effect.
   */
  clearFreeze() {
    if (this.isDead || this.reachedEnd) {
      return;
    }

    this.isFrozen = false;
    this.speed = this.baseSpeed;
    this.clearTintFromBody();
    this.freezeRestoreEvent = null;
  }

  /**
   * Zet tint op body visual, ook wanneer het een container is.
   * @param {number} color - Tintkleur.
   */
  applyTintToBody(color) {
    if (!this.bodyVisual) {
      return;
    }

    if (typeof this.bodyVisual.setTint === 'function') {
      this.bodyVisual.setTint(color);
      return;
    }

    if (typeof this.bodyVisual.iterate === 'function') {
      this.bodyVisual.iterate((child) => {
        if (child && typeof child.setTint === 'function') {
          child.setTint(color);
        }
      });
    }
  }

  /**
   * Verwijdert tint van body visual.
   */
  clearTintFromBody() {
    if (!this.bodyVisual) {
      return;
    }

    if (typeof this.bodyVisual.clearTint === 'function') {
      this.bodyVisual.clearTint();
      return;
    }

    if (typeof this.bodyVisual.iterate === 'function') {
      this.bodyVisual.iterate((child) => {
        if (child && typeof child.clearTint === 'function') {
          child.clearTint();
        }
      });
    }
  }

  /**
   * Controleert of de boss een burst-threshold bereikt heeft.
   */
  checkBossBurstThresholds() {
    if (!this.isBoss || this.isDead || this.maxHealth <= 0) {
      return;
    }

    const remainingRatio = this.health / this.maxHealth;

    for (const threshold of this.bossBurstThresholds) {
      if (remainingRatio <= threshold && !this.bossBurstTriggered.has(threshold)) {
        this.bossBurstTriggered.add(threshold);

        if (this.scene && typeof this.scene.handleBossBurstThreshold === 'function') {
          this.scene.handleBossBurstThreshold(this, threshold);
        }
      }
    }
  }

  /**
   * Update de enemy movement richting het volgende waypoint.
   * @param {number} delta - Tijd sinds vorige frame in ms.
   */
  update(delta) {
    if (this.isDead || this.reachedEnd) {
      this.updateHealthBarPosition();
      return;
    }

    if (this.currentWaypointIndex >= this.pathPoints.length) {
      this.reachEnd();
      return;
    }

    const targetPoint = this.pathPoints[this.currentWaypointIndex];
    const dx = targetPoint.x - this.x;
    const dy = targetPoint.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      this.x = targetPoint.x;
      this.y = targetPoint.y;
      this.currentWaypointIndex++;
      this.pathProgress = this.currentWaypointIndex - 1;

      if (this.currentWaypointIndex >= this.pathPoints.length) {
        this.reachEnd();
      } else {
        this.updateHealthBarPosition();
      }

      return;
    }

    const moveDistance = (this.speed * delta) / 1000;
    const moveRatio = Math.min(1, moveDistance / distance);

    this.x += dx * moveRatio;
    this.y += dy * moveRatio;

    this.pathProgress = (this.currentWaypointIndex - 1) + moveRatio;
    this.updateHealthBarPosition();
  }

  /**
   * Werkt de positie van de HP-balk bij.
   */
  updateHealthBarPosition() {
    if (this.healthBarBg) {
      this.healthBarBg.setPosition(this.x, this.y - this.healthBarOffsetY);
    }

    if (this.healthBar) {
      this.healthBar.setPosition(this.x - this.healthBarWidth / 2, this.y - this.healthBarOffsetY);
    }
  }

  /**
   * Verwerkt damage op deze enemy.
   * Armor reduceert inkomende schade maar laat altijd minstens 1 damage door.
   * @param {number} amount - Inkomende schade.
   */
  takeDamage(amount) {
    if (this.isDead || this.reachedEnd) {
      return;
    }

    const effectiveDamage = Math.max(1, amount - this.armor);
    this.health = Math.max(0, this.health - effectiveDamage);

    this.updateHealthBar();
    this.checkBossBurstThresholds();

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Werkt de HP-balk visueel bij.
   */
  updateHealthBar() {
    if (!this.healthBar) {
      return;
    }

    const ratio = this.maxHealth <= 0 ? 0 : this.health / this.maxHealth;
    this.healthBar.width = Math.max(0, this.healthBarWidth * ratio);

    if (ratio > 0.6) {
      this.healthBar.fillColor = 0x00ff66;
    } else if (ratio > 0.3) {
      this.healthBar.fillColor = 0xffcc33;
    } else {
      this.healthBar.fillColor = 0xff4444;
    }
  }

  /**
   * Verwerkt het sterven van de enemy.
   */
  die() {
    if (this.isDead) {
      return;
    }

    this.isDead = true;

    if (this.scene?.soundSystem) {
      this.scene.soundSystem.playEnemyDeath();
    }

    if (this.scene && typeof this.scene.handleEnemyKilled === 'function') {
      this.scene.handleEnemyKilled(this);
    }

    this.destroy();
  }

  /**
   * Verwerkt het bereiken van het einde van het pad.
   */
  reachEnd() {
    if (this.reachedEnd || this.isDead) {
      return;
    }

    this.reachedEnd = true;

    if (this.scene && typeof this.scene.handleEnemyEscaped === 'function') {
      this.scene.handleEnemyEscaped(this);
    }

    this.destroy();
  }

  /**
   * Ruimt alle visuele en timer-gerelateerde onderdelen op.
   * @param {boolean} fromScene - Phaser flag.
   */
  destroy(fromScene) {
    if (this.freezeRestoreEvent) {
      this.freezeRestoreEvent.remove(false);
      this.freezeRestoreEvent = null;
    }

    if (this.healthBarBg) {
      this.healthBarBg.destroy();
      this.healthBarBg = null;
    }

    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null;
    }

    super.destroy(fromScene);
  }
}