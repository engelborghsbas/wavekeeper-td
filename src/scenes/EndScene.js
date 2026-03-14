import Phaser from 'phaser';

export class EndScene extends Phaser.Scene {
  /**
   * Maakt de eindscene aan voor game over en victory.
   */
  constructor() {
    super('EndScene');

    this.result = 'gameover';
    this.stats = {
      level: 1,
      wave: 0,
      enemiesKilled: 0,
      goldEarned: 0,
    };
    this.bestLevel = 1;
  }

  /**
   * Ontvangt data van GameScene bij het starten van deze scene.
   * @param {{result?: string, stats?: object}} data - Resultaat en run-statistieken.
   */
  init(data) {
    this.result = data?.result ?? 'gameover';
    this.stats = {
      level: data?.stats?.level ?? 1,
      wave: data?.stats?.wave ?? 0,
      enemiesKilled: data?.stats?.enemiesKilled ?? 0,
      goldEarned: data?.stats?.goldEarned ?? 0,
    };
  }

  /**
   * Bouwt de volledige endscreen UI op.
   */
  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    const isVictory = this.result === 'victory';

    this.bestLevel = this.updateAndGetBestLevel(this.stats.level);

    const overlayColor = isVictory ? 0x8a6a00 : 0x000000;
    const overlayAlpha = isVictory ? 0.78 : 0.76;
    const panelColor = isVictory ? 0x2b2108 : 0x151515;
    const titleColor = isVictory ? '#ffd54a' : '#ff4d4d';
    const accentColor = isVictory ? '#ffe08a' : '#ffb3b3';
    const titleText = isVictory ? '🏆 GEWONNEN!' : 'GAME OVER';

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, overlayColor, overlayAlpha);

    const panelWidth = Math.min(620, width - 80);
    const panelHeight = Math.min(500, height - 80);
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, panelColor, 0.96);
    panel.setStrokeStyle(3, isVictory ? 0xffd54a : 0xff6666, 0.35);

    const title = this.add.text(width / 2, height / 2 - 160, titleText, {
      fontSize: isVictory ? '42px' : '44px',
      fontStyle: 'bold',
      color: titleColor,
      align: 'center',
    });
    title.setOrigin(0.5);

    const statsTitle = this.add.text(width / 2, height / 2 - 100, 'Run statistieken', {
      fontSize: '24px',
      color: accentColor,
      align: 'center',
    });
    statsTitle.setOrigin(0.5);

    const statsLines = [
      `Level bereikt: ${this.stats.level}`,
      `Wave bereikt: ${this.stats.wave}`,
      `Enemies verslagen: ${this.stats.enemiesKilled}`,
      `Gold verdiend: ${this.stats.goldEarned}`,
      `Beste level: ${this.bestLevel}`,
    ];

    const statsText = this.add.text(width / 2, height / 2 - 10, statsLines.join('\n'), {
      fontSize: '26px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10,
    });
    statsText.setOrigin(0.5);

    const buttonY = height / 2 + 150;
    const buttonBg = this.add.rectangle(
      width / 2,
      buttonY,
      240,
      58,
      isVictory ? 0xb8860b : 0x2d6a3d,
      0.98
    );
    buttonBg.setStrokeStyle(2, 0xffffff, 0.22);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(width / 2, buttonY, 'Opnieuw spelen', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);

    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(isVictory ? 0xd19a12 : 0x3c8a50, 0.98);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(isVictory ? 0xb8860b : 0x2d6a3d, 0.98);
    });

    buttonBg.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    this.children.bringToTop(overlay);
    this.children.bringToTop(panel);
    this.children.bringToTop(title);
    this.children.bringToTop(statsTitle);
    this.children.bringToTop(statsText);
    this.children.bringToTop(buttonBg);
    this.children.bringToTop(buttonText);
  }

  /**
   * Leest de opgeslagen highscore uit localStorage.
   * @returns {number} Hoogste behaalde level.
   */
  getStoredBestLevel() {
    try {
      const storedValue = localStorage.getItem('wavekeeper-best-level');
      const parsedValue = Number.parseInt(storedValue ?? '0', 10);

      if (Number.isNaN(parsedValue) || parsedValue < 0) {
        return 0;
      }

      return parsedValue;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Slaat een nieuw hoogste level op wanneer dat hoger is dan de bestaande highscore.
   * Geeft altijd de finale best level waarde terug.
   * @param {number} achievedLevel - Level uit de huidige run.
   * @returns {number} Beste level na eventuele update.
   */
  updateAndGetBestLevel(achievedLevel) {
    const currentBest = this.getStoredBestLevel();
    const newBest = Math.max(currentBest, achievedLevel);

    try {
      localStorage.setItem('wavekeeper-best-level', String(newBest));
    } catch (error) {
      return newBest;
    }

    return newBest;
  }
}