import Phaser from 'phaser';
import { Enemy } from '../systems/EnemySystem.js';
import { Tower, FreezeTower } from '../systems/TowerSystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { LivesSystem } from '../systems/LivesSystem.js';
import { LevelSystem } from '../systems/LevelSystem.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { Hud } from '../ui/Hud.js';
import {
  buildRuntimeMapConfig,
  getMapIdForLevel,
} from '../maps/MapConfig.js';

export class GameScene extends Phaser.Scene {
  /**
   * Maakt de hoofdscene van de game aan.
   */
  constructor() {
    super('GameScene');

    this.W = 0;
    this.H = 0;
    this.fieldW = 0;
    this.panelW = 0;
    this.panelX = 0;
    this.pathPoints = [];
    this.enemies = [];
    this.towers = [];
    this.economySystem = null;
    this.upgradeSystem = null;
    this.waveSystem = null;
    this.levelSystem = null;
    this.livesSystem = null;
    this.soundSystem = null;
    this.hud = null;

    this.towerCost = 55;
    this.freezeTowerCost = 120;
    this.skipWaveCost = 10;

    this.towerSpots = [];
    this.nextTowerSpotIndex = 0;
    this.buyTowerButton = null;
    this.buyFreezeTowerButton = null;
    this.skipWaveButton = null;
    this.startButton = null;
    this.pauseButton = null;
    this.muteButton = null;
    this.feedbackText = null;
    this.feedbackTextClearEvent = null;
    this.lastIncomeWaveApplied = 0;
    this.upgradeButtons = {};
    this.sidePanelGraphics = null;
    this.fieldBorderGraphics = null;
    this.pathGraphics = null;
    this.waypointGraphics = null;
    this.isPaused = false;
    this.isGameOver = false;
    this.isStarted = false;
    this.targetMode = 'first';
    this.mapChangeOverlay = null;
    this.currentMapId = 'forest';
    this.currentMapConfig = null;
    this.sidePanelRoot = null;
    this.sidePanelScale = 1;

    /**
     * Layout-instellingen voor het nieuwe zijpaneel.
     */
    this.panelLayout = {
      titleBarHeight: 60,
      spacing: 12,
      sectionPadding: 6,
      sectionTitleHeight: 28,
      textRowHeight: 22,
      buttonHeight: 36,
      threeColGap: 4,
      twoColGap: 4,
      sectionBgColor: 0x1a1a2e,
    };

    /**
     * Titelbalk referenties.
     */
    this.titleBarUi = {
      titleText: null,
      mapText: null,
    };

    /**
     * Huidige gekozen snelheidsmultiplier.
     */
    this.speedMultiplier = 1;

    /**
     * UI-referenties voor de snelheidsknoppen.
     */
    this.speedControls = {
      title: null,
      buttons: {},
    };

    /**
     * Run-statistieken die meegaan naar EndScene.
     */
    this.stats = {
      level: 1,
      wave: 0,
      enemiesKilled: 0,
      goldEarned: 0,
    };

    this.targetingUi = {
      title: null,
      buttons: {},
    };

    /**
     * Boss HP bar UI bovenaan het speelveld.
     */
    this.bossHpUi = {
      container: null,
      title: null,
      bg: null,
      fill: null,
      border: null,
      currentBoss: null,
    };
  }

  /**
   * Preload wordt hier later gebruikt voor assets.
   */
  preload() {
    // Nog geen assets nodig.
  }

  /**
   * Geeft de standaard wrapbreedte terug voor tekst in het zijpaneel.
   * @returns {number} Maximale wrapbreedte voor zijpaneeltekst.
   */
  getPanelWrapWidth() {
    return Math.max(80, this.panelW - 16);
  }

  /**
   * Bouwt een tekststijl op met automatische wordWrap voor het zijpaneel.
   * @param {string} fontSize - Font size string.
   * @param {string} color - Tekstkleur.
   * @param {object} extra - Extra Phaser tekststijlopties.
   * @param {number|null} wrapWidth - Optionele custom wrapbreedte.
   * @returns {object} Phaser tekststijl.
   */
  getPanelTextStyle(fontSize, color, extra = {}, wrapWidth = null) {
    const style = {
      fontSize,
      color,
      wordWrap: { width: wrapWidth ?? this.getPanelWrapWidth() },
      ...extra,
    };

    return style;
  }

  /**
   * Create initialiseert de scene.
   */
  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;

    this.fieldW = Math.floor(this.W * 0.75);
    this.panelX = this.fieldW + 10;
    this.panelW = Math.max(180, this.W * 0.25 - 20);

    this.currentMapId = getMapIdForLevel(1);
    this.currentMapConfig = buildRuntimeMapConfig(this.currentMapId, this.fieldW, this.H);
    this.pathPoints = this.currentMapConfig.pathPoints;
    this.towerSpots = this.currentMapConfig.towerSpots;

    this.economySystem = new EconomySystem(this);
    this.upgradeSystem = new UpgradeSystem(this);
    this.waveSystem = new WaveSystem(this);
    this.levelSystem = new LevelSystem(this);
    this.livesSystem = new LivesSystem(this, 20);
    this.soundSystem = new SoundSystem(this);

    this.stats = {
      level: 1,
      wave: 0,
      enemiesKilled: 0,
      goldEarned: 0,
    };

    this.cameras.main.setBackgroundColor(this.currentMapConfig.backgroundColor);

    this.drawFieldBackground();
    this.drawSidePanel();
    this.drawPath();
    this.drawWaypoints();
    this.drawTowerSpots();

    this.createStartingTower();
    this.buildSidePanelLayout();

    this.applyActiveTimeScale();
    this.updateRunStats();
    this.hud.update(this.waveSystem);
    this.updateBuyButtonState();
    this.updateSkipWaveButtonState();
    this.updateUpgradeButtonStates();
    this.updateControlButtonStates();
    this.updateTargetingButtons();
    this.updateSpeedButtons();
    this.updateMuteButtonState();
  }

  /**
   * Zet de actuele runinformatie om naar een stats-object voor EndScene.
   */
  updateRunStats() {
    this.stats.level = this.levelSystem?.getCurrentLevel?.() ?? this.stats.level;
    this.stats.wave = this.waveSystem?.currentWave ?? this.stats.wave;
    this.stats.goldEarned = this.economySystem?.getTotalGoldEarned?.() ?? this.stats.goldEarned;
  }

  /**
   * Bouwt de payload op voor EndScene.
   * @returns {{level:number,wave:number,enemiesKilled:number,goldEarned:number}} Statistieken van de run.
   */
  getRunStatsSnapshot() {
    this.updateRunStats();

    return {
      level: this.stats.level,
      wave: this.stats.wave,
      enemiesKilled: this.stats.enemiesKilled,
      goldEarned: this.stats.goldEarned,
    };
  }

  /**
   * Zet een map-id om naar runtime mapdata voor het huidige schermformaat.
   * @param {string} mapId - Interne map id.
   * @returns {object} Runtime mapconfig.
   */
  getRuntimeMapConfig(mapId) {
    return buildRuntimeMapConfig(mapId, this.fieldW, this.H);
  }

  /**
   * Geeft de actieve mapbonus terug.
   * @returns {object|null} Actieve mapbonus of null.
   */
  getActiveMapBonus() {
    return this.currentMapConfig?.mapBonus ?? null;
  }

  /**
   * Geeft de label van de actieve mapbonus terug voor de UI.
   * @returns {string} Bonus label of fallback.
   */
  getActiveMapBonusLabel() {
    const mapBonus = this.getActiveMapBonus();

    if (!mapBonus) {
      return 'Geen bonus';
    }

    return mapBonus.label;
  }

  /**
   * Wordt door het LevelSystem aangeroepen wanneer een nieuwe map actief wordt.
   * Verwerkt volledig de mapovergang.
   * @param {string} mapId - Nieuwe actieve map id.
   */
  onMapChange(mapId) {
    if (mapId === this.currentMapId) {
      return;
    }

    this.currentMapId = mapId;
    this.currentMapConfig = this.getRuntimeMapConfig(mapId);
    this.pathPoints = this.currentMapConfig.pathPoints;

    this.cameras.main.setBackgroundColor(this.currentMapConfig.backgroundColor);

    this.clearAllMapEntities();
    this.resetTowerSpotsForNewMap();
    this.redrawMapVisuals();

    if (this.titleBarUi.mapText) {
      this.titleBarUi.mapText.setText(`Map: ${this.currentMapConfig.name}`);
    }

    this.hideBossHealthBar();
    this.showMapChangeOverlay(this.currentMapConfig.name);
    this.updateRunStats();
  }

  /**
   * Verwijdert alle actieve enemies en torens zonder levensverlies.
   * Escaping enemies bij mapwissel kosten dus geen levens.
   */
  clearAllMapEntities() {
    for (const enemy of this.enemies) {
      if (!enemy) {
        continue;
      }

      enemy.reachedEnd = true;
      enemy.isDead = true;

      if (enemy.active) {
        enemy.destroy();
      }
    }

    this.enemies = [];

    for (const tower of this.towers) {
      if (!tower) {
        continue;
      }

      if (tower.active) {
        tower.destroy();
      }
    }

    this.towers = [];
  }

  /**
   * Zet alle tower spots van de nieuwe map terug naar vrij.
   */
  resetTowerSpotsForNewMap() {
    this.towerSpots = this.currentMapConfig.towerSpots.map((spot) => ({
      ...spot,
      occupied: false,
      marker: null,
      inner: null,
      hitArea: null,
    }));

    this.nextTowerSpotIndex = 0;
  }

  /**
   * Tekent alle mapvisuals opnieuw.
   */
  redrawMapVisuals() {
    this.drawPath();
    this.drawWaypoints();
    this.drawTowerSpots();
  }

  /**
   * Toont een overlay van 3 seconden bij mapwissel.
   * @param {string} mapName - Naam van de nieuwe map.
   */
  showMapChangeOverlay(mapName) {
    if (this.mapChangeOverlay) {
      this.mapChangeOverlay.destroy();
      this.mapChangeOverlay = null;
    }

    const centerX = this.fieldW / 2;
    const centerY = this.H / 2;

    const container = this.add.container(0, 0);

    const bg = this.add.rectangle(centerX, centerY, 430, 120, 0x000000, 0.78);
    bg.setStrokeStyle(3, 0xffffff, 0.16);

    const title = this.add.text(centerX, centerY - 10, `Nieuwe map: ${mapName}!`, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    container.add([bg, title]);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 180,
    });

    this.mapChangeOverlay = container;

    this.time.delayedCall(3000, () => {
      if (!this.mapChangeOverlay) {
        return;
      }

      this.tweens.add({
        targets: this.mapChangeOverlay,
        alpha: 0,
        duration: 220,
        onComplete: () => {
          if (this.mapChangeOverlay) {
            this.mapChangeOverlay.destroy();
            this.mapChangeOverlay = null;
          }
        },
      });
    });
  }

  /**
   * Tekent de rand van het speelveld links.
   */
  drawFieldBackground() {
    if (this.fieldBorderGraphics) {
      this.fieldBorderGraphics.clear();
    } else {
      this.fieldBorderGraphics = this.add.graphics();
    }

    this.fieldBorderGraphics.lineStyle(2, 0xffffff, 0.08);
    this.fieldBorderGraphics.strokeRect(0, 0, this.fieldW, this.H);
  }

  /**
   * Tekent het rechter zijpaneel als vaste achtergrond.
   */
  drawSidePanel() {
    if (!this.sidePanelGraphics) {
      this.sidePanelGraphics = this.add.graphics();
    }

    const panelAreaX = this.fieldW;
    const panelAreaW = this.W - this.fieldW;

    this.sidePanelGraphics.clear();
    this.sidePanelGraphics.fillStyle(0x111111, 0.98);
    this.sidePanelGraphics.fillRect(panelAreaX, 0, panelAreaW, this.H);

    this.sidePanelGraphics.lineStyle(3, 0xffffff, 0.12);
    this.sidePanelGraphics.beginPath();
    this.sidePanelGraphics.moveTo(panelAreaX, 0);
    this.sidePanelGraphics.lineTo(panelAreaX, this.H);
    this.sidePanelGraphics.strokePath();

    this.sidePanelGraphics.lineStyle(2, 0xffffff, 0.06);
    this.sidePanelGraphics.strokeRect(panelAreaX, 0, panelAreaW, this.H);
  }

  /**
   * Bouwt het volledige zijpaneel op als één gestructureerde layout.
   */
  buildSidePanelLayout() {
    if (this.sidePanelRoot) {
      this.sidePanelRoot.destroy(true);
      this.sidePanelRoot = null;
    }

    this.sidePanelRoot = this.add.container(this.panelX, 0);

    let currentY = 0;

    currentY = this.createTitleBar(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createHud(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createSpeedControls(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createBuyButtonsSection(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createTargetingPanel(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createUpgradePanel(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createSkipWaveSection(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createStatsSection(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createControlButtons(currentY);
    currentY += this.panelLayout.spacing;

    currentY = this.createFeedbackText(currentY);

    this.applySidePanelScale(currentY);
  }

  /**
   * Past proportionele schaal toe wanneer de panelinhoud hoger is dan het scherm.
   * @param {number} contentHeight - Totale niet-geschaalde inhoudshoogte.
   */
  applySidePanelScale(contentHeight) {
    const availableHeight = this.H - 12;
    const scaleFactor = contentHeight > availableHeight
      ? availableHeight / contentHeight
      : 1;

    this.sidePanelScale = scaleFactor;
    this.sidePanelRoot.setScale(scaleFactor);

    const scaledHeight = contentHeight * scaleFactor;
    const offsetY = Math.max(6, (this.H - scaledHeight) / 2);
    this.sidePanelRoot.setY(offsetY);
  }

  /**
   * Maakt één donkere sectieachtergrond aan.
   * @param {number} topY - Bovenkant van de sectie.
   * @param {number} height - Hoogte van de sectie.
   * @returns {Phaser.GameObjects.Rectangle} Achtergrond rectangle.
   */
  createSectionBackground(topY, height) {
    const bg = this.add.rectangle(
      this.panelW / 2,
      topY + height / 2,
      this.panelW,
      height,
      this.panelLayout.sectionBgColor,
      0.96
    );
    bg.setStrokeStyle(2, 0xffffff, 0.10);
    this.sidePanelRoot.add(bg);
    return bg;
  }

  /**
   * Maakt een sectietitel aan.
   * @param {number} y - Lokale Y positie.
   * @param {string} label - Titeltekst.
   * @returns {Phaser.GameObjects.Text} Tekstobject.
   */
  createSectionTitle(y, label) {
    const title = this.add.text(
      8,
      y - 11,
      label,
      this.getPanelTextStyle('18px', '#ffffff', {
        fontStyle: 'bold',
      }, this.panelW - 16)
    );
    this.sidePanelRoot.add(title);
    return title;
  }

  /**
   * Maakt een generieke paneelknop aan.
   * @param {number} x - Lokale X links.
   * @param {number} y - Lokale Y boven.
   * @param {number} width - Breedte.
   * @param {number} height - Hoogte.
   * @param {string} label - Tekst.
   * @param {number} fillColor - Achtergrondkleur.
   * @param {string} fontSize - Font size.
   * @returns {{bg: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text, width: number, height: number}}
   */
  createPanelButton(x, y, width, height, label, fillColor, fontSize = '16px') {
    const bg = this.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      fillColor,
      0.95
    );
    bg.setStrokeStyle(2, 0xffffff, 0.16);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(
      x + width / 2,
      y + height / 2,
      label,
      this.getPanelTextStyle(fontSize, '#ffffff', {
        align: 'center',
      }, width - 16)
    );
    text.setOrigin(0.5);

    this.sidePanelRoot.add([bg, text]);

    return {
      bg,
      text,
      width,
      height,
    };
  }

  /**
   * Bouwt de titelbalk op.
   * @param {number} startY - Lokale startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createTitleBar(startY) {
    const height = this.panelLayout.titleBarHeight;

    const bg = this.add.rectangle(
      this.panelW / 2,
      startY + height / 2,
      this.panelW,
      height,
      0x171727,
      0.98
    );
    bg.setStrokeStyle(2, 0xffffff, 0.10);
    this.sidePanelRoot.add(bg);

    this.titleBarUi.titleText = this.add.text(
      8,
      startY + 8,
      'Wavekeeper TD',
      this.getPanelTextStyle('24px', '#ffffff', {
        fontStyle: 'bold',
      }, this.panelW - 60)
    );

    this.titleBarUi.mapText = this.add.text(
      8,
      startY + 34,
      `Map: ${this.currentMapConfig.name}`,
      this.getPanelTextStyle('14px', '#b8b8b8', {}, this.panelW - 60)
    );

    this.sidePanelRoot.add([this.titleBarUi.titleText, this.titleBarUi.mapText]);

    this.createMuteButton(startY + 12);

    return startY + height;
  }

  /**
   * Maakt de HUD aan in het zijpaneel.
   * @param {number} startY - Start Y.
   * @returns {number} Nieuwe currentY na de statussectie.
   */
  createHud(startY) {
    this.hud = new Hud(
      this,
      this.economySystem,
      this.livesSystem,
      this.sidePanelRoot,
      0,
      this.panelW
    );

    return this.hud.buildStatusSection(startY);
  }

  /**
   * Maakt de statssectie aan.
   * @param {number} startY - Start Y.
   * @returns {number} Nieuwe currentY.
   */
  createStatsSection(startY) {
    return this.hud.buildStatsSection(startY);
  }

  /**
   * Maakt de snelheidsknoppen aan in het zijpaneel.
   * @param {number} startY - Startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createSpeedControls(startY) {
    const p = this.panelLayout;
    const sectionHeight = p.sectionPadding + p.sectionTitleHeight + p.spacing + p.buttonHeight + p.sectionPadding;

    this.createSectionBackground(startY, sectionHeight);

    let y = startY + p.sectionPadding + p.sectionTitleHeight / 2;
    this.speedControls.title = this.createSectionTitle(y, '⚡ Speed');
    y += p.sectionTitleHeight + p.spacing;

    const buttonWidth = (this.panelW - (p.threeColGap * 2)) / 3;
    const rowY = y;
    const x1 = 0;
    const x2 = buttonWidth + p.threeColGap;
    const x3 = (buttonWidth + p.threeColGap) * 2;

    this.createSpeedButton(1, x1, rowY, buttonWidth, p.buttonHeight, '1×');
    this.createSpeedButton(2, x2, rowY, buttonWidth, p.buttonHeight, '2×');
    this.createSpeedButton(3, x3, rowY, buttonWidth, p.buttonHeight, '3×');

    return startY + sectionHeight;
  }

  /**
   * Maakt één snelheidsknop aan.
   * @param {number} multiplier - Snelheidsmultiplier.
   * @param {number} x - Lokale X links.
   * @param {number} y - Lokale Y boven.
   * @param {number} width - Breedte.
   * @param {number} height - Hoogte.
   * @param {string} label - Label.
   */
  createSpeedButton(multiplier, x, y, width, height, label) {
    const button = this.createPanelButton(x, y, width, height, label, 0x333333, '16px');

    button.bg.on('pointerdown', () => {
      this.setGameSpeedMultiplier(multiplier);
    });

    button.bg.on('pointerover', () => {
      if (this.isGameOver) {
        return;
      }

      if (this.speedMultiplier === multiplier) {
        button.bg.setFillStyle(0x2b6b9f, 0.95);
      } else {
        button.bg.setFillStyle(0x4a4a4a, 0.95);
      }
    });

    button.bg.on('pointerout', () => {
      this.updateSpeedButtons();
    });

    this.speedControls.buttons[multiplier] = {
      ...button,
      multiplier,
    };
  }

  /**
   * Maakt de mute-knop in de titelbalk aan.
   * @param {number} y - Lokale Y boven.
   */
  createMuteButton(y) {
    const buttonSize = 36;
    const x = this.panelW - buttonSize;

    const button = this.createPanelButton(x, y, buttonSize, buttonSize, '🔊', 0x333333, '18px');

    button.bg.on('pointerdown', () => {
      this.toggleMute();
    });

    button.bg.on('pointerover', () => {
      if (!this.isGameOver) {
        button.bg.setFillStyle(0x4a4a4a, 0.95);
      }
    });

    button.bg.on('pointerout', () => {
      this.updateMuteButtonState();
    });

    this.muteButton = button;
  }

  /**
   * Wisselt tussen muted en unmuted geluid.
   */
  toggleMute() {
    if (!this.soundSystem) {
      return;
    }

    this.soundSystem.toggleMute();
    this.updateMuteButtonState();

    if (this.soundSystem.isMuted()) {
      this.showFeedback('Sound muted', '#ffcc66');
    } else {
      this.showFeedback('Sound unmuted', '#77ff77');
    }
  }

  /**
   * Ververst de visuele toestand van de mute-knop.
   */
  updateMuteButtonState() {
    if (!this.muteButton || !this.soundSystem) {
      return;
    }

    const muted = this.soundSystem.isMuted();
    this.muteButton.text.setText(muted ? '🔇' : '🔊');

    if (this.isGameOver) {
      this.muteButton.bg.setFillStyle(0x444444, 0.95);
      return;
    }

    if (muted) {
      this.muteButton.bg.setFillStyle(0x6a3a3a, 0.95);
    } else {
      this.muteButton.bg.setFillStyle(0x355c35, 0.95);
    }
  }

  /**
   * Zet de gewenste speltempo-multiplier.
   * @param {number} multiplier - Nieuwe multiplier.
   */
  setGameSpeedMultiplier(multiplier) {
    if (this.isGameOver) {
      return;
    }

    this.speedMultiplier = Phaser.Math.Clamp(multiplier, 1, 3);
    this.applyActiveTimeScale();
    this.updateSpeedButtons();
    this.showFeedback(`Game speed set to ${this.speedMultiplier}×`, '#77c8ff');
  }

  /**
   * Past de effectieve timescale toe op tweens, time-events en physics.
   */
  applyActiveTimeScale() {
    const effectiveScale = this.isPaused ? 0 : this.speedMultiplier;

    this.tweens.timeScale = effectiveScale;
    this.time.timeScale = effectiveScale;

    if (this.physics?.world) {
      this.physics.world.timeScale = effectiveScale;
    }
  }

  /**
   * Ververst de visuele toestand van alle snelheidsknoppen.
   */
  updateSpeedButtons() {
    const multipliers = Object.keys(this.speedControls.buttons);

    for (const key of multipliers) {
      const button = this.speedControls.buttons[key];

      if (!button) {
        continue;
      }

      if (this.isGameOver) {
        button.bg.setFillStyle(0x444444, 0.95);
        continue;
      }

      if (Number(key) === this.speedMultiplier) {
        button.bg.setFillStyle(0x1f4f7a, 0.95);
      } else {
        button.bg.setFillStyle(0x333333, 0.95);
      }
    }
  }

  /**
   * Maakt de sectie met kooptorens aan.
   * @param {number} startY - Startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createBuyButtonsSection(startY) {
    const p = this.panelLayout;
    const sectionHeight = p.sectionPadding + p.buttonHeight + p.spacing + p.buttonHeight + p.sectionPadding;

    this.createSectionBackground(startY, sectionHeight);

    let y = startY + p.sectionPadding;

    this.buyTowerButton = this.createPanelButton(
      0,
      y,
      this.panelW,
      p.buttonHeight,
      `Buy Tower (${this.towerCost})`,
      0x1f4f7a,
      '16px'
    );

    this.buyTowerButton.bg.on('pointerdown', () => {
      this.buyNextTowerSpot('basic');
    });

    this.buyTowerButton.bg.on('pointerover', () => {
      if (this.economySystem.getGold() >= this.towerCost && !this.isPaused && !this.isGameOver) {
        this.buyTowerButton.bg.setFillStyle(0x2d6ea8, 0.95);
      }
    });

    this.buyTowerButton.bg.on('pointerout', () => {
      this.updateBuyButtonState();
    });

    y += p.buttonHeight + p.spacing;

    this.buyFreezeTowerButton = this.createPanelButton(
      0,
      y,
      this.panelW,
      p.buttonHeight,
      `Buy Freeze Tower (${this.freezeTowerCost})`,
      0x2b6f87,
      '16px'
    );

    this.buyFreezeTowerButton.bg.on('pointerdown', () => {
      this.buyNextTowerSpot('freeze');
    });

    this.buyFreezeTowerButton.bg.on('pointerover', () => {
      if (this.economySystem.getGold() >= this.freezeTowerCost && !this.isPaused && !this.isGameOver) {
        this.buyFreezeTowerButton.bg.setFillStyle(0x3b8fad, 0.95);
      }
    });

    this.buyFreezeTowerButton.bg.on('pointerout', () => {
      this.updateBuyButtonState();
    });

    return startY + sectionHeight;
  }

  /**
   * Maakt de skip-wave sectie aan.
   * @param {number} startY - Startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createSkipWaveSection(startY) {
    const p = this.panelLayout;
    const sectionHeight = p.sectionPadding + p.buttonHeight + p.sectionPadding;

    this.createSectionBackground(startY, sectionHeight);

    this.skipWaveButton = this.createPanelButton(
      0,
      startY + p.sectionPadding,
      this.panelW,
      p.buttonHeight,
      `⏭ Skip wave (-${this.skipWaveCost})`,
      0x444444,
      '16px'
    );

    this.skipWaveButton.bg.on('pointerdown', () => {
      this.handleSkipWave();
    });

    this.skipWaveButton.bg.on('pointerover', () => {
      const canSkip = this.waveSystem?.isInPreparation
        && this.economySystem.getGold() >= this.skipWaveCost
        && !this.isPaused
        && !this.isGameOver;

      if (canSkip) {
        this.skipWaveButton.bg.setFillStyle(0x8a6329, 0.95);
      }
    });

    this.skipWaveButton.bg.on('pointerout', () => {
      this.updateSkipWaveButtonState();
    });

    return startY + sectionHeight;
  }

  /**
   * Handelt het overslaan van de countdown tussen waves af.
   */
  handleSkipWave() {
    if (!this.skipWaveButton || !this.waveSystem?.isInPreparation) {
      return;
    }

    if (this.isPaused || this.isGameOver) {
      this.showFeedback('Cannot skip right now', '#ff7777');
      return;
    }

    const wasPurchased = this.economySystem.spendGold(this.skipWaveCost);

    if (!wasPurchased) {
      this.showFeedback('Not enough gold to skip wave', '#ff7777');
      return;
    }

    this.waveSystem.skipPreparation();
    this.showFeedback('Next wave started immediately', '#ffcc66');
    this.updateSkipWaveButtonState();
  }

  /**
   * Ververst de zichtbaarheid en toestand van de skip-wave knop.
   */
  updateSkipWaveButtonState() {
    if (!this.skipWaveButton) {
      return;
    }

    const canAfford = this.economySystem.getGold() >= this.skipWaveCost;
    const isEnabled = this.waveSystem?.isInPreparation && canAfford && !this.isPaused && !this.isGameOver;

    if (isEnabled) {
      this.skipWaveButton.bg.setFillStyle(0x7a5320, 0.95);
      this.skipWaveButton.text.setColor('#ffffff');
    } else {
      this.skipWaveButton.bg.setFillStyle(0x444444, 0.95);
      this.skipWaveButton.text.setColor('#bbbbbb');
    }
  }

  /**
   * Maakt het targeting-paneel aan.
   * @param {number} startY - Startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createTargetingPanel(startY) {
    const p = this.panelLayout;
    const sectionHeight = p.sectionPadding + p.sectionTitleHeight + p.spacing + p.buttonHeight + p.sectionPadding;

    this.createSectionBackground(startY, sectionHeight);

    let y = startY + p.sectionPadding + p.sectionTitleHeight / 2;
    this.targetingUi.title = this.createSectionTitle(y, '🎯 Targeting');
    y += p.sectionTitleHeight + p.spacing;

    const buttonWidth = (this.panelW - (p.threeColGap * 2)) / 3;
    const rowY = y;
    const x1 = 0;
    const x2 = buttonWidth + p.threeColGap;
    const x3 = (buttonWidth + p.threeColGap) * 2;

    this.createTargetingButton('first', x1, rowY, buttonWidth, p.buttonHeight, 'First');
    this.createTargetingButton('last', x2, rowY, buttonWidth, p.buttonHeight, 'Last');
    this.createTargetingButton('closest', x3, rowY, buttonWidth, p.buttonHeight, 'Closest');

    return startY + sectionHeight;
  }

  /**
   * Maakt één targeting-knop aan.
   * @param {string} mode - Interne target mode.
   * @param {number} x - Lokale X.
   * @param {number} y - Lokale Y.
   * @param {number} width - Breedte.
   * @param {number} height - Hoogte.
   * @param {string} label - Zichtbare label.
   */
  createTargetingButton(mode, x, y, width, height, label) {
    const button = this.createPanelButton(x, y, width, height, label, 0x333333, '15px');

    button.bg.on('pointerdown', () => {
      this.setGlobalTargetMode(mode);
    });

    button.bg.on('pointerover', () => {
      if (!this.isGameOver) {
        if (this.targetMode === mode) {
          button.bg.setFillStyle(0x2b6b9f, 0.95);
        } else {
          button.bg.setFillStyle(0x454545, 0.95);
        }
      }
    });

    button.bg.on('pointerout', () => {
      this.updateTargetingButtons();
    });

    this.targetingUi.buttons[mode] = {
      ...button,
      label,
      mode,
    };
  }

  /**
   * Zet de globale targeting mode voor alle torens.
   * @param {string} mode - Nieuwe targeting mode.
   */
  setGlobalTargetMode(mode) {
    if (this.isGameOver) {
      return;
    }

    this.targetMode = mode;

    for (const tower of this.towers) {
      if (tower && tower.active) {
        tower.targetMode = mode;
      }
    }

    this.updateTargetingButtons();
    this.showFeedback(`Targeting set to ${mode}`, '#77c8ff');
  }

  /**
   * Ververst de visuele toestand van de targeting-knoppen.
   */
  updateTargetingButtons() {
    const modes = Object.keys(this.targetingUi.buttons);

    for (const mode of modes) {
      const button = this.targetingUi.buttons[mode];

      if (!button) {
        continue;
      }

      if (this.isGameOver) {
        button.bg.setFillStyle(0x444444, 0.95);
        continue;
      }

      if (this.targetMode === mode) {
        button.bg.setFillStyle(0x1f4f7a, 0.95);
      } else {
        button.bg.setFillStyle(0x333333, 0.95);
      }
    }
  }

  /**
   * Maakt het upgradepanel aan.
   * Let op: de prompt vroeg 4 upgradeknoppen, maar de game heeft er functioneel 5.
   * Die vijfde is behouden zodat geen bestaande upgrade verdwijnt.
   * @param {number} startY - Startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createUpgradePanel(startY) {
    const p = this.panelLayout;
    const buttonCount = 5;
    const sectionHeight = (
      p.sectionPadding
      + p.sectionTitleHeight
      + p.spacing
      + (buttonCount * p.buttonHeight)
      + ((buttonCount - 1) * p.spacing)
      + p.sectionPadding
    );

    this.createSectionBackground(startY, sectionHeight);

    let y = startY + p.sectionPadding + p.sectionTitleHeight / 2;
    this.upgradeButtons.panelTitle = this.createSectionTitle(y, '⬆ Upgrades');
    y += p.sectionTitleHeight + p.spacing;

    this.createUpgradeButton('damage', 0, y, this.panelW, 'Damage', () => this.handleDamageUpgrade());
    y += p.buttonHeight + p.spacing;

    this.createUpgradeButton('attackSpeed', 0, y, this.panelW, 'Attack Speed', () => this.handleAttackSpeedUpgrade());
    y += p.buttonHeight + p.spacing;

    this.createUpgradeButton('passiveIncome', 0, y, this.panelW, 'Passive Income', () => this.handlePassiveIncomeUpgrade());
    y += p.buttonHeight + p.spacing;

    this.createUpgradeButton('towerRange', 0, y, this.panelW, 'Tower Range', () => this.handleTowerRangeUpgrade());
    y += p.buttonHeight + p.spacing;

    this.createUpgradeButton('freeze', 0, y, this.panelW, 'Freeze DMG', () => this.handleFreezeUpgrade());

    return startY + sectionHeight;
  }

  /**
   * Maakt één upgradeknop aan.
   * @param {string} key - Interne key.
   * @param {number} x - Lokale X.
   * @param {number} y - Lokale Y.
   * @param {number} width - Breedte.
   * @param {string} label - Label.
   * @param {Function} onClick - Klikhandler.
   */
  createUpgradeButton(key, x, y, width, label, onClick) {
    const button = this.createPanelButton(x, y, width, this.panelLayout.buttonHeight, '', 0x355c35, '15px');

    button.bg.on('pointerdown', onClick);

    button.bg.on('pointerover', () => {
      if (!this.isPaused && !this.isGameOver) {
        button.bg.setFillStyle(0x468046, 0.95);
      }
    });

    button.bg.on('pointerout', () => {
      this.updateUpgradeButtonStates();
    });

    this.upgradeButtons[key] = {
      ...button,
      label,
    };
  }

  /**
   * Handelt de damage upgrade af.
   */
  handleDamageUpgrade() {
    if (this.isPaused || this.isGameOver) {
      this.showFeedback('Cannot upgrade right now', '#ff7777');
      return;
    }

    const purchased = this.upgradeSystem.buyDamageUpgrade();

    if (!purchased) {
      this.showFeedback('Not enough gold for damage upgrade', '#ff7777');
      return;
    }

    this.showFeedback(`Damage upgraded to +${this.upgradeSystem.getDamageBonus()}`, '#77ff77');
  }

  /**
   * Handelt de attack speed upgrade af.
   */
  handleAttackSpeedUpgrade() {
    if (this.isPaused || this.isGameOver) {
      this.showFeedback('Cannot upgrade right now', '#ff7777');
      return;
    }

    const purchased = this.upgradeSystem.buyAttackSpeedUpgrade();

    if (!purchased) {
      this.showFeedback('Not enough gold for attack speed upgrade', '#ff7777');
      return;
    }

    this.showFeedback(`Attack speed level ${this.upgradeSystem.attackSpeedLevel} purchased`, '#77ff77');
  }

  /**
   * Handelt de passive income upgrade af.
   */
  handlePassiveIncomeUpgrade() {
    if (this.isPaused || this.isGameOver) {
      this.showFeedback('Cannot upgrade right now', '#ff7777');
      return;
    }

    const purchased = this.upgradeSystem.buyPassiveIncomeUpgrade();

    if (!purchased) {
      this.showFeedback('Not enough gold for passive income upgrade', '#ff7777');
      return;
    }

    this.showFeedback(
      `Passive income is now ${this.economySystem.passiveIncomePerSecond.toFixed(1)}/s`,
      '#77ff77'
    );
  }

  /**
   * Handelt de tower range upgrade af.
   */
  handleTowerRangeUpgrade() {
    if (this.isPaused || this.isGameOver) {
      this.showFeedback('Cannot upgrade right now', '#ff7777');
      return;
    }

    const purchased = this.upgradeSystem.buyTowerRangeUpgrade();

    if (!purchased) {
      if (this.upgradeSystem.isTowerRangeMaxed()) {
        this.showFeedback('Tower range is already maxed', '#ffcc66');
        return;
      }

      this.showFeedback('Not enough gold for tower range upgrade', '#ff7777');
      return;
    }

    this.showFeedback(`Tower range upgraded to +${this.upgradeSystem.getTowerRangeBonus()}`, '#77ff77');
  }

  /**
   * Handelt de freeze upgrade af.
   */
  handleFreezeUpgrade() {
    if (this.isPaused || this.isGameOver) {
      this.showFeedback('Cannot upgrade right now', '#ff7777');
      return;
    }

    const purchased = this.upgradeSystem.buyFreezeUpgrade();

    if (!purchased) {
      if (this.upgradeSystem.isFreezeMaxed()) {
        this.showFeedback('Freeze upgrade is already maxed', '#ffcc66');
        return;
      }

      this.showFeedback('Not enough gold for freeze upgrade', '#ff7777');
      return;
    }

    this.showFeedback(
      `Freeze duration is now ${(this.upgradeSystem.getFreezeDuration() / 1000).toFixed(1)}s`,
      '#77ff77'
    );
  }

  /**
   * Maakt de onderste control-sectie aan.
   * @param {number} startY - Startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createControlButtons(startY) {
    const p = this.panelLayout;
    const sectionHeight = p.sectionPadding + p.buttonHeight + p.sectionPadding;

    this.createSectionBackground(startY, sectionHeight);

    const buttonWidth = (this.panelW - p.twoColGap) / 2;
    const y = startY + p.sectionPadding;
    const x1 = 0;
    const x2 = buttonWidth + p.twoColGap;

    this.startButton = this.createPanelButton(
      x1,
      y,
      buttonWidth,
      p.buttonHeight,
      'Start',
      0x2d6a3d,
      '16px'
    );

    this.startButton.bg.on('pointerdown', () => {
      this.startGameFlow();
    });

    this.startButton.bg.on('pointerover', () => {
      if (!this.isStarted && !this.isGameOver) {
        this.startButton.bg.setFillStyle(0x3c8a50, 0.95);
      }
    });

    this.startButton.bg.on('pointerout', () => {
      this.updateControlButtonStates();
    });

    this.pauseButton = this.createPanelButton(
      x2,
      y,
      buttonWidth,
      p.buttonHeight,
      'Pauze',
      0x6a4b1f,
      '16px'
    );

    this.pauseButton.bg.on('pointerdown', () => {
      this.togglePause();
    });

    this.pauseButton.bg.on('pointerover', () => {
      if (this.isStarted && !this.isGameOver) {
        this.pauseButton.bg.setFillStyle(0x8a6329, 0.95);
      }
    });

    this.pauseButton.bg.on('pointerout', () => {
      this.updateControlButtonStates();
    });

    return startY + sectionHeight;
  }

  /**
   * Start het spelverloop handmatig.
   */
  startGameFlow() {
    if (this.isStarted || this.isGameOver) {
      return;
    }

    this.isStarted = true;
    this.waveSystem.startManually();
    this.applyActiveTimeScale();
    this.showFeedback('Game started', '#77ff77');
    this.updateControlButtonStates();
    this.updateRunStats();
  }

  /**
   * Wisselt tussen pauze en hervatten.
   */
  togglePause() {
    if (!this.isStarted || this.isGameOver) {
      return;
    }

    this.isPaused = !this.isPaused;
    this.applyActiveTimeScale();

    if (this.isPaused) {
      this.showFeedback('Game paused', '#ffcc66');
    } else {
      this.showFeedback(`Game resumed (${this.speedMultiplier}×)`, '#77ff77');
    }

    this.updateControlButtonStates();
    this.updateTargetingButtons();
    this.updateSkipWaveButtonState();
    this.updateSpeedButtons();
    this.updateMuteButtonState();
  }

  /**
   * Ververst de visuele staat van Start- en Pauze/Hervat-knoppen.
   */
  updateControlButtonStates() {
    if (this.startButton) {
      if (this.isStarted || this.isGameOver) {
        this.startButton.bg.setFillStyle(0x3f3f3f, 0.95);
        this.startButton.text.setText('Started');
      } else {
        this.startButton.bg.setFillStyle(0x2d6a3d, 0.95);
        this.startButton.text.setText('Start');
      }
    }

    if (this.pauseButton) {
      if (!this.isStarted || this.isGameOver) {
        this.pauseButton.bg.setFillStyle(0x3f3f3f, 0.95);
        this.pauseButton.text.setText('Pauze');
        return;
      }

      if (this.isPaused) {
        this.pauseButton.bg.setFillStyle(0x2a5f8a, 0.95);
        this.pauseButton.text.setText('Hervat');
      } else {
        this.pauseButton.bg.setFillStyle(0x6a4b1f, 0.95);
        this.pauseButton.text.setText('Pauze');
      }
    }
  }

  /**
   * Maakt een kleine feedbacktekst in het zijpaneel.
   * @param {number} startY - Startpositie.
   * @returns {number} Nieuwe currentY.
   */
  createFeedbackText(startY) {
    this.feedbackText = this.add.text(
      0,
      startY,
      '',
      this.getPanelTextStyle('14px', '#ffcc66')
    );
    this.sidePanelRoot.add(this.feedbackText);
    return startY + 20;
  }

  /**
   * Toont een korte feedbackboodschap aan de speler.
   * @param {string} message - De boodschap.
   * @param {string} color - Tekstkleur.
   */
  showFeedback(message, color = '#ffcc66') {
    if (!this.feedbackText) {
      return;
    }

    this.feedbackText.setColor(color);
    this.feedbackText.setText(message);

    if (this.feedbackTextClearEvent) {
      this.feedbackTextClearEvent.remove(false);
    }

    this.feedbackTextClearEvent = this.time.delayedCall(1400, () => {
      if (this.feedbackText) {
        this.feedbackText.setText('');
      }
    });
  }

  /**
   * Spawn één enemy op het begin van het pad.
   * @param {object} enemyConfig - Enemyconfig.
   * @returns {Enemy} De aangemaakte enemy.
   */
  spawnEnemy(enemyConfig = {}) {
    const enemy = new Enemy(this, this.pathPoints, {
      ...enemyConfig,
      mapBonus: this.getActiveMapBonus(),
    });

    this.enemies.push(enemy);
    return enemy;
  }

  /**
   * Maakt een standaardtoren aan op een opgegeven positie.
   * @param {number} x - X-positie van de toren.
   * @param {number} y - Y-positie van de toren.
   */
  createFixedTower(x, y) {
    const tower = new Tower(this, x, y);
    tower.targetMode = this.targetMode;

    if (this.upgradeSystem) {
      tower.applyUpgradeStats(this.upgradeSystem);
    }

    this.towers.push(tower);
  }

  /**
   * Maakt een freeze tower aan op een opgegeven positie.
   * @param {number} x - X-positie.
   * @param {number} y - Y-positie.
   */
  createFreezeTower(x, y) {
    const tower = new FreezeTower(this, x, y);
    tower.targetMode = this.targetMode;

    if (this.upgradeSystem) {
      tower.applyUpgradeStats(this.upgradeSystem);
    }

    this.towers.push(tower);
  }

  /**
   * Plaatst de eerste toren gratis op de eerste tower spot.
   */
  createStartingTower() {
    const firstSpot = this.towerSpots[0];

    if (!firstSpot) {
      return;
    }

    this.createFixedTower(firstSpot.x, firstSpot.y);
    firstSpot.occupied = true;
    this.nextTowerSpotIndex = 1;
    this.refreshTowerSpotVisual(firstSpot);
  }

  /**
   * Toont de grote boss HP bar bovenaan het speelveld.
   * @param {Enemy} boss - De actieve boss.
   */
  showBossHealthBar(boss) {
    this.hideBossHealthBar();

    const container = this.add.container(0, 0);
    const barWidth = Math.min(520, this.fieldW - 120);
    const barHeight = 20;
    const centerX = this.fieldW / 2;
    const topY = 34;

    const title = this.add.text(centerX, topY, boss.enemyName ?? 'Boss', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);

    const bg = this.add.rectangle(centerX, topY + 34, barWidth, barHeight, 0x000000, 0.82);
    const fill = this.add.rectangle(centerX - barWidth / 2, topY + 34, barWidth, barHeight, 0xff6600, 1);
    fill.setOrigin(0, 0.5);

    const border = this.add.rectangle(centerX, topY + 34, barWidth, barHeight, 0x000000, 0);
    border.setStrokeStyle(2, 0xffffff, 0.24);

    container.add([bg, fill, border, title]);

    this.bossHpUi.container = container;
    this.bossHpUi.title = title;
    this.bossHpUi.bg = bg;
    this.bossHpUi.fill = fill;
    this.bossHpUi.border = border;
    this.bossHpUi.currentBoss = boss;

    this.updateBossHealthBar();
  }

  /**
   * Verbergt de grote boss HP bar.
   */
  hideBossHealthBar() {
    if (this.bossHpUi.container) {
      this.bossHpUi.container.destroy();
    }

    this.bossHpUi = {
      container: null,
      title: null,
      bg: null,
      fill: null,
      border: null,
      currentBoss: null,
    };
  }

  /**
   * Ververst de boss HP bar visueel.
   */
  updateBossHealthBar() {
    const boss = this.bossHpUi.currentBoss;

    if (!boss || !boss.active || boss.isDead || boss.reachedEnd) {
      this.hideBossHealthBar();
      return;
    }

    if (!this.bossHpUi.fill || !this.bossHpUi.bg || !this.bossHpUi.title) {
      return;
    }

    const maxWidth = this.bossHpUi.bg.width;
    const ratio = boss.maxHealth <= 0 ? 0 : boss.health / boss.maxHealth;
    this.bossHpUi.fill.width = Math.max(0, maxWidth * ratio);
    this.bossHpUi.title.setText(`${boss.enemyName ?? 'Boss'} — ${Math.ceil(boss.health)} / ${boss.maxHealth}`);

    if (ratio > 0.6) {
      this.bossHpUi.fill.fillColor = 0xff6600;
    } else if (ratio > 0.3) {
      this.bossHpUi.fill.fillColor = 0xffaa22;
    } else {
      this.bossHpUi.fill.fillColor = 0xff4444;
    }
  }

  /**
   * Spawnt een fast-enemy burst wanneer de boss een HP-threshold verliest.
   * @param {Enemy} boss - De boss.
   * @param {number} threshold - Threshold ratio.
   */
  handleBossBurstThreshold(boss, threshold) {
    if (!boss || boss.isDead || this.isGameOver) {
      return;
    }

    for (let i = 0; i < 3; i++) {
      this.spawnEnemy({ type: 'fast' });
    }

    const lostPercent = Math.round((1 - threshold) * 100);
    this.showFeedback(`Boss burst at ${lostPercent}% damage taken`, '#ffb366');
  }

  /**
   * Verwerkt een enemy kill en geeft gold.
   * @param {Enemy} enemy - De enemy die gestorven is.
   */
  handleEnemyKilled(enemy) {
    if (this.isGameOver) {
      return;
    }

    this.economySystem.rewardKill(enemy.killReward);
    this.stats.enemiesKilled += 1;

    if (enemy.isBoss) {
      this.hideBossHealthBar();
    }

    if (enemy.isLevelBoss && this.levelSystem) {
      this.updateRunStats();
      this.levelSystem.handleBossKilled(enemy);
      return;
    }

    this.updateRunStats();
  }

  /**
   * Verwerkt een enemy die het einde van het pad bereikt.
   * @param {Enemy} enemy - De enemy die gelekt is.
   */
  handleEnemyEscaped(enemy) {
    if (this.isGameOver) {
      return;
    }

    if (enemy.isBoss) {
      this.hideBossHealthBar();

      if (this.levelSystem) {
        this.levelSystem.handleBossRemoved();
      }
    }

    this.livesSystem.loseLives(1);

    if (this.soundSystem) {
      this.soundSystem.playLifeLost();
    }

    this.updateRunStats();
    this.showFeedback('An enemy leaked. -1 life', '#ff7777');

    if (this.livesSystem.isGameOver()) {
      this.triggerGameOver();
    }
  }

  /**
   * Zet het spel in game-over toestand en opent EndScene.
   */
  triggerGameOver() {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.isPaused = true;
    this.applyActiveTimeScale();

    this.hideBossHealthBar();
    this.updateRunStats();
    this.updateControlButtonStates();
    this.updateTargetingButtons();
    this.updateSkipWaveButtonState();
    this.updateSpeedButtons();
    this.updateMuteButtonState();

    this.scene.start('EndScene', {
      result: 'gameover',
      stats: this.getRunStatsSnapshot(),
    });
  }

  /**
   * Zet het spel in victory-toestand en opent EndScene.
   */
  triggerVictory() {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.isPaused = true;
    this.applyActiveTimeScale();

    this.hideBossHealthBar();
    this.updateRunStats();
    this.updateControlButtonStates();
    this.updateTargetingButtons();
    this.updateSkipWaveButtonState();
    this.updateSpeedButtons();
    this.updateMuteButtonState();

    this.scene.start('EndScene', {
      result: 'victory',
      stats: this.getRunStatsSnapshot(),
    });
  }

  /**
   * Past income scaling toe zodra een nieuwe global wave start.
   */
  applyWaveIncomeGrowthIfNeeded() {
    if (this.waveSystem.currentWave > this.lastIncomeWaveApplied) {
      this.economySystem.applyWaveIncomeGrowth(this.waveSystem.currentWave);
      this.lastIncomeWaveApplied = this.waveSystem.currentWave;

      this.showFeedback(
        `Passive income increased to ${this.economySystem.passiveIncomePerSecond.toFixed(1)}/s`,
        '#77ff77'
      );
    }
  }

  /**
   * Probeert een nieuwe toren te kopen op de volgende vrije vaste spot.
   * @param {'basic'|'freeze'} towerType - Type toren.
   */
  buyNextTowerSpot(towerType = 'basic') {
    if (this.isPaused || this.isGameOver) {
      this.showFeedback('Cannot buy towers right now', '#ff7777');
      return;
    }

    const spotIndex = this.towerSpots.findIndex((spot) => !spot.occupied);

    if (spotIndex === -1) {
      this.showFeedback('No free tower spots left', '#ff7777');
      return;
    }

    const cost = towerType === 'freeze' ? this.freezeTowerCost : this.towerCost;
    const wasPurchased = this.economySystem.spendGold(cost);

    if (!wasPurchased) {
      this.showFeedback('Not enough gold', '#ff7777');
      return;
    }

    const spot = this.towerSpots[spotIndex];

    if (towerType === 'freeze') {
      this.createFreezeTower(spot.x, spot.y);
      this.showFeedback('Freeze tower purchased', '#8fe7ff');
    } else {
      this.createFixedTower(spot.x, spot.y);
      this.showFeedback('Tower purchased', '#77ff77');
    }

    spot.occupied = true;
    this.nextTowerSpotIndex = spotIndex + 1;
    this.refreshTowerSpotVisual(spot);
  }

  /**
   * Verwijdert ongeldige enemies uit de lijst.
   */
  cleanupEnemies() {
    this.enemies = this.enemies.filter(
      (enemy) => enemy && enemy.active && !enemy.reachedEnd
    );
  }

  /**
   * Tekent het volledige pad op basis van de waypoints.
   */
  drawPath() {
    if (!this.pathGraphics) {
      this.pathGraphics = this.add.graphics();
    }

    this.pathGraphics.clear();

    this.pathGraphics.lineStyle(34, 0x000000, 0.20);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);

    for (let i = 1; i < this.pathPoints.length; i++) {
      this.pathGraphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }

    this.pathGraphics.strokePath();

    this.pathGraphics.lineStyle(24, Phaser.Display.Color.HexStringToColor(this.currentMapConfig.pathColor).color, 1);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);

    for (let i = 1; i < this.pathPoints.length; i++) {
      this.pathGraphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }

    this.pathGraphics.strokePath();
  }

  /**
   * Tekent kleine cirkels op elk waypoint.
   */
  drawWaypoints() {
    if (!this.waypointGraphics) {
      this.waypointGraphics = this.add.graphics();
    }

    this.waypointGraphics.clear();

    for (const point of this.pathPoints) {
      this.waypointGraphics.fillStyle(0xffffff, 0.28);
      this.waypointGraphics.fillCircle(point.x, point.y, 5);
    }
  }

  /**
   * Vernieuwt de visual van één tower spot.
   * @param {object} spot - De tower spot.
   */
  refreshTowerSpotVisual(spot) {
    if (!spot?.marker || !spot?.inner) {
      return;
    }

    if (spot.occupied) {
      spot.marker.setFillStyle(0x666666, 0.14);
      spot.marker.setStrokeStyle(2, 0xffffff, 0.14);
      spot.inner.setFillStyle(0xaaaaaa, 0.32);
    } else {
      spot.marker.setFillStyle(0x66aaff, 0.18);
      spot.marker.setStrokeStyle(2, 0x66aaff, 0.35);
      spot.inner.setFillStyle(0x66aaff, 0.45);
    }
  }

  /**
   * Tekent de vaste tower spots visueel op het speelveld.
   */
  drawTowerSpots() {
    for (const spot of this.towerSpots) {
      if (spot.marker) {
        spot.marker.destroy();
      }

      if (spot.inner) {
        spot.inner.destroy();
      }

      if (spot.hitArea) {
        spot.hitArea.destroy();
      }

      const marker = this.add.circle(spot.x, spot.y, 22, 0x66aaff, 0.18);
      marker.setStrokeStyle(2, 0x66aaff, 0.35);

      const inner = this.add.circle(spot.x, spot.y, 6, 0x66aaff, 0.45);

      const hitArea = this.add.circle(spot.x, spot.y, 26, 0xffffff, 0.001);
      hitArea.setInteractive({ useHandCursor: true });

      hitArea.on('pointerdown', () => {
        if (spot.occupied) {
          this.showFeedback('Tower spot already occupied', '#ffcc66');
        } else {
          this.showFeedback('Use Buy Tower or Buy Freeze Tower', '#77c8ff');
        }
      });

      hitArea.on('pointerover', () => {
        if (!spot.occupied) {
          marker.setFillStyle(0x88bbff, 0.26);
        }
      });

      hitArea.on('pointerout', () => {
        this.refreshTowerSpotVisual(spot);
      });

      spot.marker = marker;
      spot.inner = inner;
      spot.hitArea = hitArea;

      this.refreshTowerSpotVisual(spot);
    }
  }

  /**
   * Update de status van de koopknoppen.
   */
  updateBuyButtonState() {
    const hasFreeSpot = this.towerSpots.some((spot) => !spot.occupied);
    const canAffordBasic = this.economySystem.getGold() >= this.towerCost;
    const canAffordFreeze = this.economySystem.getGold() >= this.freezeTowerCost;

    if (!this.buyTowerButton || !this.buyFreezeTowerButton) {
      return;
    }

    if (!hasFreeSpot) {
      this.buyTowerButton.bg.setFillStyle(0x444444, 0.95);
      this.buyTowerButton.text.setText('Buy Tower (FULL)');
      this.buyFreezeTowerButton.bg.setFillStyle(0x444444, 0.95);
      this.buyFreezeTowerButton.text.setText('Buy Freeze Tower (FULL)');
      return;
    }

    if (this.isPaused || this.isGameOver) {
      this.buyTowerButton.bg.setFillStyle(0x444444, 0.95);
      this.buyTowerButton.text.setText(`Buy Tower (${this.towerCost})`);
      this.buyFreezeTowerButton.bg.setFillStyle(0x444444, 0.95);
      this.buyFreezeTowerButton.text.setText(`Buy Freeze Tower (${this.freezeTowerCost})`);
      return;
    }

    this.buyTowerButton.bg.setFillStyle(canAffordBasic ? 0x1f4f7a : 0x6a3a3a, 0.95);
    this.buyTowerButton.text.setText(`Buy Tower (${this.towerCost})`);

    this.buyFreezeTowerButton.bg.setFillStyle(canAffordFreeze ? 0x2b6f87 : 0x6a3a3a, 0.95);
    this.buyFreezeTowerButton.text.setText(`Buy Freeze Tower (${this.freezeTowerCost})`);
  }

  /**
   * Ververst de tekst en kleur van alle upgradeknoppen.
   */
  updateUpgradeButtonStates() {
    const data = this.upgradeSystem.getUpgradeData();
    const gold = this.economySystem.getGold();
    const isLocked = this.isPaused || this.isGameOver;

    const damageButton = this.upgradeButtons.damage;
    damageButton.text.setText(`${damageButton.label} L${data.damage.level} (${data.damage.cost})`);
    damageButton.bg.setFillStyle(
      !isLocked && gold >= data.damage.cost ? 0x355c35 : 0x6a3a3a,
      0.95
    );

    const attackSpeedButton = this.upgradeButtons.attackSpeed;
    attackSpeedButton.text.setText(`${attackSpeedButton.label} L${data.attackSpeed.level} (${data.attackSpeed.cost})`);
    attackSpeedButton.bg.setFillStyle(
      !isLocked && gold >= data.attackSpeed.cost ? 0x355c35 : 0x6a3a3a,
      0.95
    );

    const passiveIncomeButton = this.upgradeButtons.passiveIncome;
    passiveIncomeButton.text.setText(`${passiveIncomeButton.label} L${data.passiveIncome.level} (${data.passiveIncome.cost})`);
    passiveIncomeButton.bg.setFillStyle(
      !isLocked && gold >= data.passiveIncome.cost ? 0x355c35 : 0x6a3a3a,
      0.95
    );

    const towerRangeButton = this.upgradeButtons.towerRange;
    if (data.towerRange.isMaxed) {
      towerRangeButton.text.setText(`${towerRangeButton.label} L${data.towerRange.level} (MAX)`);
      towerRangeButton.bg.setFillStyle(0x4a4a4a, 0.95);
    } else {
      towerRangeButton.text.setText(`${towerRangeButton.label} L${data.towerRange.level} (${data.towerRange.cost})`);
      towerRangeButton.bg.setFillStyle(
        !isLocked && gold >= data.towerRange.cost ? 0x355c35 : 0x6a3a3a,
        0.95
      );
    }

    const freezeButton = this.upgradeButtons.freeze;
    if (data.freeze.isMaxed) {
      freezeButton.text.setText(`${freezeButton.label} L${data.freeze.level} (MAX)`);
      freezeButton.bg.setFillStyle(0x4a4a4a, 0.95);
    } else {
      freezeButton.text.setText(`${freezeButton.label} L${data.freeze.level} (${data.freeze.cost})`);
      freezeButton.bg.setFillStyle(
        !isLocked && gold >= data.freeze.cost ? 0x355c35 : 0x6a3a3a,
        0.95
      );
    }
  }

  /**
   * Update draait elke frame.
   * @param {number} time - Huidige tijd.
   * @param {number} delta - Tijd sinds vorige frame in ms.
   */
  update(time, delta) {
    if (!this.isPaused && !this.isGameOver) {
      this.economySystem.update(delta, this.isStarted);
      this.levelSystem.update(delta);
      this.waveSystem.update(delta, this.isStarted);

      if (this.isStarted) {
        this.applyWaveIncomeGrowthIfNeeded();
      }

      for (const enemy of this.enemies) {
        if (enemy && enemy.active) {
          enemy.update(delta);
        }
      }

      for (const tower of this.towers) {
        if (tower && tower.active && this.isStarted) {
          tower.update(delta, this.enemies, this.targetMode);
        }
      }

      this.cleanupEnemies();
      this.updateBossHealthBar();
      this.updateRunStats();
    }

    if (this.hud) {
      this.hud.update(this.waveSystem);
    }

    this.updateBuyButtonState();
    this.updateSkipWaveButtonState();
    this.updateUpgradeButtonStates();
    this.updateControlButtonStates();
    this.updateTargetingButtons();
    this.updateSpeedButtons();
    this.updateMuteButtonState();
  }
}