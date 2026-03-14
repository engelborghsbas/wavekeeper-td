import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { EndScene } from './scenes/EndScene.js';

/**
 * Hoofdconfiguratie van de Phaser game.
 */
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'app',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [GameScene, EndScene],
};

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

/**
 * Start de Phaser game.
 */
const game = new Phaser.Game(config);

export default game;