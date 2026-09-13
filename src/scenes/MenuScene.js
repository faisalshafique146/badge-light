import Phaser from 'phaser';
import portalBridge from '../platform/PortalBridge.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const cam = this.cameras.main;
    portalBridge.gameplayStop();

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

    const bestScore = portalBridge.getNumber('best-score', 0);
    const controls = [
      'MOVE  Arrows / WASD    ATTACK  Space',
      'SWITCH  X    KIOSK  Z / C',
      'PAUSE  P    MUTE  M',
      'Touch: d-pad + B / S / USE',
      bestScore > 0 ? `BEST SCORE  ${bestScore}` : '',
    ].filter(Boolean);

    this.add
      .text(cam.width / 2, cam.height / 2 + 54, controls.join('\n'), {
        fontSize: '7px',
        color: '#cfd3df',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0.5);

    const startPrompt = this.add
      .text(cam.width / 2, cam.height - 22, 'Press any key or tap to start', {
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

    // Used only for automated release screenshots and smoke tests.
    const captureMode = new URLSearchParams(window.location.search).get('capture');
    if (captureMode === 'victory') {
      this.scene.start('GameOverScene', {
        outcome: 'win',
        score: { enemiesDefeated: 14, kiosksPowered: 4, total: 3400, best: 3400 },
      });
    } else if (captureMode) {
      this.startGame();
    }
  }

  startGame() {
    this.scene.start('GameScene');
  }
}
