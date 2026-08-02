import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  /**
   * Receives { outcome: 'win' | 'loss', score: { enemiesDefeated,
   * kiosksPowered } } from GameScene.endGame() via scene.start() data.
   */
  init(data) {
    this.outcome = data?.outcome ?? 'loss';
    this.score = data?.score ?? { enemiesDefeated: 0, kiosksPowered: 0 };
  }

  create() {
    const cam = this.cameras.main;
    const isWin = this.outcome === 'win';

    this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.85).setOrigin(0, 0);

    // Real character sprite, not a placeholder — same 'clerk' atlas
    // and idle frame the player controls in GameScene.
    this.add
      .sprite(cam.width / 2, cam.height / 2 - 58, 'clerk', 'clerk_idle_down_0')
      .setOrigin(0.5, 1)
      .setScale(3);

    const headline = isWin ? 'You made it to opening time.' : 'Caught after hours.';
    this.add
      .text(cam.width / 2, cam.height / 2 - 6, headline, {
        fontSize: '12px',
        color: isWin ? '#ffe066' : '#ff6b6b',
        align: 'center',
        wordWrap: { width: cam.width - 40 },
      })
      .setOrigin(0.5, 0.5);

    const totalScore = this.score.enemiesDefeated + this.score.kiosksPowered;
    const scoreLines = [
      `Enemies defeated: ${this.score.enemiesDefeated}`,
      `Kiosks kept powered: ${this.score.kiosksPowered}`,
      `Total score: ${totalScore}`,
    ];
    this.add
      .text(cam.width / 2, cam.height / 2 + 34, scoreLines.join('\n'), {
        fontSize: '9px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0.5);

    const restartButton = this.add
      .text(cam.width / 2, cam.height - 28, '[ Restart ]', {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cam.width / 2, cam.height - 12, 'or press ENTER', {
        fontSize: '7px',
        color: '#888888',
      })
      .setOrigin(0.5, 0.5);

    restartButton.on('pointerover', () => restartButton.setStyle({ color: '#ffe066' }));
    restartButton.on('pointerout', () => restartButton.setStyle({ color: '#ffffff' }));
    restartButton.on('pointerdown', () => this.restart());

    // ENTER as a keyboard shortcut for the same action, for anyone not
    // using a mouse/touch.
    this.input.keyboard.once('keydown-ENTER', () => this.restart());
  }

  /**
   * Fully resets GameScene. GameScene's cleanup() already ran when the
   * run ended (registered on its 'shutdown' event, fired back when
   * endGame() called scene.start('GameOverScene')), so starting it
   * again here just runs create() fresh: score/timer/gameEnded reset
   * to their defaults and the map, player, enemies group, and every
   * system get rebuilt from scratch. Nothing from the previous run
   * carries over.
   */
  restart() {
    this.scene.start('GameScene');
  }
}
