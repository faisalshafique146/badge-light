import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const cam = this.cameras.main;

    this.add.rectangle(0, 0, cam.width, cam.height, 0x1a1a2e).setOrigin(0, 0);

    // Real character sprite, same atlas/frame the player controls in
    // GameScene, not a placeholder shape.
    this.add
      .sprite(cam.width / 2, cam.height / 2 - 46, 'clerk', 'clerk_idle_down_0')
      .setOrigin(0.5, 1)
      .setScale(3);

    this.add
      .text(cam.width / 2, cam.height / 2 - 6, 'BADGE LIGHT', {
        fontSize: '20px',
        color: '#ffe066',
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(cam.width / 2, cam.height / 2 + 18, 'Survive until opening time.', {
        fontSize: '9px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const startPrompt = this.add
      .text(cam.width / 2, cam.height - 30, 'Press any key or tap to start', {
        fontSize: '9px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0.5);

    // Slow pulse so it reads as "press me" rather than static label text.
    this.tweens.add({
      targets: startPrompt,
      alpha: { from: 1, to: 0.4 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard.once('keydown', this.startGame, this);
    this.input.once('pointerdown', this.startGame, this);
  }

  startGame() {
    this.scene.start('GameScene');
  }
}
