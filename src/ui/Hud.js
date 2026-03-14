import { Tower } from '../systems/TowerSystem.js';
import { Enemy } from '../systems/EnemySystem.js';

export class Hud {
  /**
   * Bouwt en beheert de status- en stats-secties binnen het zijpaneel.
   * Alles wordt lokaal opgebouwd in een parentContainer zodat de volledige
   * panelinhoud achteraf in één keer geschaald kan worden.
   * @param {Phaser.Scene} scene - De actieve scene.
   * @param {object} economySystem - Economy systeem.
   * @param {object} livesSystem - Lives systeem.
   * @param {Phaser.GameObjects.Container} parentContainer - Root container van het zijpaneel.
   * @param {number} x - Lokale X startpositie in de root container.
   * @param {number} width - Breedte van de HUD secties.
   */
  constructor(scene, economySystem, livesSystem, parentContainer, x = 0, width = 260) {
    this.scene = scene;
    this.economySystem = economySystem;
    this.livesSystem = livesSystem;
    this.parentContainer = parentContainer;
    this.x = x;
    this.width = width;

    /**
     * Layoutconstanten voor consistente spacing.
     */
    this.sectionPadding = 6;
    this.elementSpacing = 12;
    this.sectionTitleHeight = 28;
    this.textRowHeight = 22;
    this.wrapWidth = Math.max(80, this.width - 16);

    /**
     * Eigen container zodat HUD als aparte subboom beheerd kan worden.
     */
    this.container = scene.add.container(this.x, 0);
    this.parentContainer.add(this.container);

    /**
     * Referenties naar UI-elementen.
     */
    this.statusBackground = null;
    this.statusTitle = null;
    this.goldText = null;
    this.incomeText = null;
    this.livesText = null;
    this.waveText = null;
    this.mapBonusText = null;

    this.statsBackground = null;
    this.statsTitle = null;
    this.towerDamageText = null;
    this.enemyHpText = null;
  }

  /**
   * Geeft de hoogte terug van een standaard sectie met titel en rows.
   * @param {number} rowCount - Aantal tekstregels in de sectie.
   * @returns {number} Totale sectiehoogte.
   */
  getSectionHeight(rowCount) {
    return (
      this.sectionPadding
      + this.sectionTitleHeight
      + this.elementSpacing
      + (rowCount * this.textRowHeight)
      + ((rowCount - 1) * this.elementSpacing)
      + this.sectionPadding
    );
  }

  /**
   * Bouwt een standaard tekststijl op voor HUD-tekst.
   * @param {string} fontSize - Font size string.
   * @param {string} color - Tekstkleur.
   * @param {object} extra - Extra stijlopties.
   * @returns {object} Phaser tekststijl.
   */
  getTextStyle(fontSize, color, extra = {}) {
    return {
      fontSize,
      color,
      wordWrap: { width: this.wrapWidth },
      ...extra,
    };
  }

  /**
   * Maakt de statussectie aan.
   * @param {number} startY - Lokale startpositie Y.
   * @returns {number} Nieuwe currentY na deze sectie.
   */
  buildStatusSection(startY) {
    const sectionHeight = this.getSectionHeight(5);

    this.statusBackground = this.scene.add.rectangle(
      this.width / 2,
      startY + sectionHeight / 2,
      this.width,
      sectionHeight,
      0x1a1a2e,
      0.96
    );
    this.statusBackground.setStrokeStyle(2, 0xffffff, 0.10);
    this.container.add(this.statusBackground);

    const contentX = 8;
    let y = startY + this.sectionPadding + this.sectionTitleHeight / 2;

    this.statusTitle = this.scene.add.text(
      contentX,
      y - 11,
      '📊 Status',
      this.getTextStyle('18px', '#ffffff', {
        fontStyle: 'bold',
      })
    );
    this.container.add(this.statusTitle);

    y += this.sectionTitleHeight + this.elementSpacing;

    this.goldText = this.scene.add.text(
      contentX,
      y - 11,
      '',
      this.getTextStyle('22px', '#ffd54a', {
        fontStyle: 'bold',
      })
    );
    this.container.add(this.goldText);

    y += this.textRowHeight + this.elementSpacing;

    this.incomeText = this.scene.add.text(
      contentX,
      y - 11,
      '',
      this.getTextStyle('16px', '#d6d6d6')
    );
    this.container.add(this.incomeText);

    y += this.textRowHeight + this.elementSpacing;

    this.livesText = this.scene.add.text(
      contentX,
      y - 11,
      '',
      this.getTextStyle('16px', '#ff9d9d')
    );
    this.container.add(this.livesText);

    y += this.textRowHeight + this.elementSpacing;

    this.waveText = this.scene.add.text(
      contentX,
      y - 11,
      '',
      this.getTextStyle('16px', '#ffcb8b')
    );
    this.container.add(this.waveText);

    y += this.textRowHeight + this.elementSpacing;

    this.mapBonusText = this.scene.add.text(
      contentX,
      y - 11,
      '',
      this.getTextStyle('15px', '#9fd4ff')
    );
    this.container.add(this.mapBonusText);

    return startY + sectionHeight;
  }

  /**
   * Maakt de statssectie aan.
   * @param {number} startY - Lokale startpositie Y.
   * @returns {number} Nieuwe currentY na deze sectie.
   */
  buildStatsSection(startY) {
    const sectionHeight = this.getSectionHeight(2);

    this.statsBackground = this.scene.add.rectangle(
      this.width / 2,
      startY + sectionHeight / 2,
      this.width,
      sectionHeight,
      0x1a1a2e,
      0.96
    );
    this.statsBackground.setStrokeStyle(2, 0xffffff, 0.10);
    this.container.add(this.statsBackground);

    const contentX = 8;
    let y = startY + this.sectionPadding + this.sectionTitleHeight / 2;

    this.statsTitle = this.scene.add.text(
      contentX,
      y - 11,
      '📈 Stats',
      this.getTextStyle('18px', '#ffffff', {
        fontStyle: 'bold',
      })
    );
    this.container.add(this.statsTitle);

    y += this.sectionTitleHeight + this.elementSpacing;

    this.towerDamageText = this.scene.add.text(
      contentX,
      y - 11,
      '',
      this.getTextStyle('16px', '#d6d6d6')
    );
    this.container.add(this.towerDamageText);

    y += this.textRowHeight + this.elementSpacing;

    this.enemyHpText = this.scene.add.text(
      contentX,
      y - 11,
      '',
      this.getTextStyle('16px', '#d6d6d6')
    );
    this.container.add(this.enemyHpText);

    return startY + sectionHeight;
  }

  /**
   * Ververst de getoonde HUD-waarden.
   * @param {object|null} waveSystem - Actief wavesysteem.
   */
  update(waveSystem = null) {
    const currentTowerDamage = Tower.getCurrentTowerDamage(this.scene.towers);
    const enemyHpDisplay = Enemy.getFieldHpText(this.scene.enemies);
    const activeMapBonusLabel = this.scene.getActiveMapBonusLabel();

    if (this.goldText) {
      this.goldText.setText(`Gold: ${this.economySystem.getGold()}`);
    }

    if (this.incomeText) {
      this.incomeText.setText(
        `Income: ${this.economySystem.passiveIncomePerSecond.toFixed(1)}/s`
      );
    }

    if (this.livesText) {
      this.livesText.setText(`Lives: ${this.livesSystem.getLives()}`);
    }

    if (this.waveText) {
      if (waveSystem) {
        this.waveText.setText(`Wave: ${waveSystem.currentWave}`);
      } else {
        this.waveText.setText('Wave: 0');
      }
    }

    if (this.mapBonusText) {
      this.mapBonusText.setText(`Map bonus: ${activeMapBonusLabel}`);
    }

    if (this.towerDamageText) {
      this.towerDamageText.setText(
        `Tower Damage: ${currentTowerDamage !== null ? currentTowerDamage : '—'}`
      );
    }

    if (this.enemyHpText) {
      this.enemyHpText.setText(`Enemy HP: ${enemyHpDisplay}`);
    }
  }

  /**
   * Ruimt de HUD op.
   */
  destroy() {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }
}