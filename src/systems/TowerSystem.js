import Phaser from 'phaser';

export class Tower extends Phaser.GameObjects.Container {
  /**
   * Maakt een standaardtoren aan die automatisch enemies in range aanvalt.
   * @param {Phaser.Scene} scene - De actieve scene.
   * @param {number} x - X-positie van de toren.
   * @param {number} y - Y-positie van de toren.
   */
  constructor(scene, x, y) {
    super(scene, x, y);

    this.scene = scene;

    /**
     * Type info voor UI en logica.
     */
    this.towerType = 'basic';

    /**
     * Basestats van de toren.
     */
    this.baseRange = 165;
    this.baseDamage = 11;
    this.baseAttackCooldown = 650;

    /**
     * Actuele stats van de toren.
     */
    this.range = this.baseRange;
    this.damage = this.baseDamage;
    this.attackCooldown = this.baseAttackCooldown;
    this.timeSinceLastShot = 0;

    /**
     * Standaardtorens kunnen geen stealth detecteren.
     */
    this.detectStealth = false;

    /**
     * Huidige targeting mode van deze toren.
     */
    this.targetMode = 'first';

    /**
     * Basis van de toren.
     */
    this.base = scene.add.circle(0, 0, 18, 0x4444aa);
    this.base.setStrokeStyle(2, 0xffffff, 0.35);

    /**
     * Barrel / richtingselement van de toren.
     */
    this.barrel = scene.add.rectangle(10, 0, 20, 6, 0xaaaaff);
    this.barrel.setOrigin(0.2, 0.5);

    this.add([this.base, this.barrel]);

    scene.add.existing(this);

    /**
     * Range-indicator voor visualisatie.
     */
    this.rangeIndicator = scene.add.circle(x, y, this.range, 0x66aaff, 0.08);
    this.rangeIndicator.setStrokeStyle(1, 0x66aaff, 0.25);

    if (scene.upgradeSystem) {
      this.applyUpgradeStats(scene.upgradeSystem);
    }
  }

  /**
   * Geeft de actuele schade van deze toren terug.
   * @returns {number} Huidige damage van deze toren.
   */
  getCurrentDamage() {
    return this.damage;
  }

  /**
   * Geeft de huidige torenschade terug op basis van actieve torens.
   * @param {Array<Tower>} towers - Lijst met torens.
   * @returns {number|null} Huidige damage of null als er geen actieve torens zijn.
   */
  static getCurrentTowerDamage(towers = []) {
    for (const tower of towers) {
      if (tower && tower.active && typeof tower.getCurrentDamage === 'function') {
        return tower.getCurrentDamage();
      }
    }

    return null;
  }

  /**
   * Past actuele upgrade-stats toe op deze toren.
   * @param {object} upgradeSystem - Referentie naar het upgrade-systeem.
   */
  applyUpgradeStats(upgradeSystem) {
    this.damage = this.baseDamage + upgradeSystem.getDamageBonus();
    this.attackCooldown = this.baseAttackCooldown * upgradeSystem.getAttackSpeedMultiplier();
    this.range = this.baseRange + upgradeSystem.getTowerRangeBonus();

    if (this.rangeIndicator) {
      this.rangeIndicator.setRadius(this.range);
      this.rangeIndicator.setPosition(this.x, this.y);
    }
  }

  /**
   * Update de toren: zoekt target, draait ernaartoe en valt aan indien mogelijk.
   * @param {number} delta - Tijd sinds vorige frame in ms.
   * @param {Array} enemies - Lijst van actieve enemies.
   * @param {string} targetMode - Globale targeting mode.
   */
  update(delta, enemies, targetMode = 'first') {
    this.timeSinceLastShot += delta;
    this.targetMode = targetMode;

    const target = this.findTargetInRange(enemies, targetMode);

    if (!target) {
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.barrel.setRotation(angle);

    if (this.timeSinceLastShot >= this.attackCooldown) {
      this.attack(target);
      this.timeSinceLastShot = 0;
    }
  }

  /**
   * Filtert alle geldige enemies binnen range.
   * Respecteert stealth-detectie.
   * @param {Array} enemies - Lijst van actieve enemies.
   * @returns {Array} Geldige enemies binnen range.
   */
  getEnemiesInRange(enemies) {
    const validEnemies = [];

    for (const enemy of enemies) {
      if (!enemy || !enemy.active || enemy.isDead || enemy.reachedEnd) {
        continue;
      }

      if (enemy.requiresStealthDetection && !this.detectStealth) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

      if (distance <= this.range) {
        validEnemies.push(enemy);
      }
    }

    return validEnemies;
  }

  /**
   * Zoekt een target in range op basis van de gekozen targeting mode.
   * first = verst op het pad
   * last = minst ver op het pad
   * closest = dichtst bij de toren
   * @param {Array} enemies - Lijst van actieve enemies.
   * @param {string} targetMode - De gekozen targeting mode.
   * @returns {object|null} Gekozen enemy of null.
   */
  findTargetInRange(enemies, targetMode = 'first') {
    const enemiesInRange = this.getEnemiesInRange(enemies);

    if (enemiesInRange.length === 0) {
      return null;
    }

    if (targetMode === 'closest') {
      let closestEnemy = null;
      let closestDistance = Infinity;

      for (const enemy of enemiesInRange) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }

      return closestEnemy;
    }

    if (targetMode === 'last') {
      let lastEnemy = null;
      let lowestProgress = Infinity;

      for (const enemy of enemiesInRange) {
        const progress = enemy.pathProgress ?? 0;

        if (progress < lowestProgress) {
          lowestProgress = progress;
          lastEnemy = enemy;
        }
      }

      return lastEnemy;
    }

    let firstEnemy = null;
    let highestProgress = -Infinity;

    for (const enemy of enemiesInRange) {
      const progress = enemy.pathProgress ?? 0;

      if (progress > highestProgress) {
        highestProgress = progress;
        firstEnemy = enemy;
      }
    }

    return firstEnemy;
  }

  /**
   * Valt een target aan, speelt een geluid af en toont een eenvoudige schotlijn.
   * @param {object} target - De enemy die geraakt wordt.
   */
  attack(target) {
    if (!target || !target.active || target.isDead) {
      return;
    }

    target.takeDamage(this.damage);

    if (this.scene.soundSystem) {
      this.scene.soundSystem.playAttack();
    }

    this.drawShotLine(target);
  }

  /**
   * Tekent een kort visueel schot van de loop naar het target.
   * @param {object} target - De enemy die geraakt werd.
   */
  drawShotLine(target) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const muzzleDistance = 18;
    const muzzleX = this.x + Math.cos(angle) * muzzleDistance;
    const muzzleY = this.y + Math.sin(angle) * muzzleDistance;

    const shotLine = this.scene.add.line(
      0,
      0,
      muzzleX,
      muzzleY,
      target.x,
      target.y,
      0xffffaa,
      0.8
    );

    shotLine.setLineWidth(2, 2);

    this.scene.tweens.add({
      targets: shotLine,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        shotLine.destroy();
      },
    });
  }

  /**
   * Ruimt de visuele onderdelen van de toren op.
   */
  destroy(fromScene) {
    if (this.rangeIndicator) {
      this.rangeIndicator.destroy();
    }

    super.destroy(fromScene);
  }
}

export class FreezeTower extends Tower {
  /**
   * Maakt een freeze tower aan.
   * @param {Phaser.Scene} scene - De actieve scene.
   * @param {number} x - X-positie.
   * @param {number} y - Y-positie.
   */
  constructor(scene, x, y) {
    super(scene, x, y);

    this.towerType = 'freeze';

    /**
     * Freeze tower basestats.
     */
    this.baseRange = 140;
    this.baseDamage = 5;
    this.baseAttackCooldown = 1000 / 1.2;

    /**
     * Freeze tower kan stealth detecteren.
     */
    this.detectStealth = true;

    /**
     * Visuele aanpassingen.
     */
    this.base.setFillStyle(0x66ccff, 1);
    this.base.setStrokeStyle(2, 0xffffff, 0.4);
    this.barrel.setFillStyle(0xc8f2ff, 1);

    if (this.rangeIndicator) {
      this.rangeIndicator.setFillStyle(0x66ccff, 0.08);
      this.rangeIndicator.setStrokeStyle(1, 0x66ccff, 0.25);
    }

    if (scene.upgradeSystem) {
      this.applyUpgradeStats(scene.upgradeSystem);
    }
  }

  /**
   * Past upgrade-stats toe, inclusief freeze duration.
   * @param {object} upgradeSystem - Referentie naar het upgrade-systeem.
   */
  applyUpgradeStats(upgradeSystem) {
    this.damage = this.baseDamage + upgradeSystem.getDamageBonus();
    this.attackCooldown = this.baseAttackCooldown * upgradeSystem.getAttackSpeedMultiplier();
    this.range = this.baseRange + upgradeSystem.getTowerRangeBonus();
    this.freezeDuration = upgradeSystem.getFreezeDuration();

    if (this.rangeIndicator) {
      this.rangeIndicator.setRadius(this.range);
      this.rangeIndicator.setPosition(this.x, this.y);
    }
  }

  /**
   * Freeze tower doet damage, vertraagt daarna het target en speelt een geluid af.
   * @param {object} target - De enemy die geraakt wordt.
   */
  attack(target) {
    if (!target || !target.active || target.isDead) {
      return;
    }

    target.takeDamage(this.damage);

    if (target.active && !target.isDead && typeof target.applyFreeze === 'function') {
      target.applyFreeze(this.freezeDuration);
    }

    if (this.scene.soundSystem) {
      this.scene.soundSystem.playAttack();
    }

    this.drawShotLine(target);
  }
}