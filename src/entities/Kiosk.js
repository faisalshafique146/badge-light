import Phaser from 'phaser';

const ACTIVE_DURATION_MS = 15000; // how long a kiosk stays active before it needs a top-up
const EXTEND_AMOUNT_MS = 10000; // time added per battery consumed while active
const INTERACT_RADIUS = 28; // px, how close the player must stand to activate/use

/**
 * Directory kiosk. Idle by default; activates (lights up, pulses) when
 * the player stands nearby and presses Z. While active, standing nearby
 * and pressing C (handled in GameScene, which owns battery inventory
 * and the LightSystem) extends its active timer and refills the light.
 */
export default class Kiosk extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'kiosk', 'kiosk_idle_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.body.moves = false;

    this.setOrigin(0.5, 1);

    this.active = false;
    this.activeTimer = 0;
    this.scoredThisRun = false;

    this.registerAnimations(scene);
    this.play('kiosk-idle');
  }

  registerAnimations(scene) {
    const anims = scene.anims;

    if (!anims.exists('kiosk-idle')) {
      anims.create({
        key: 'kiosk-idle',
        frames: anims.generateFrameNames('kiosk', {
          prefix: 'kiosk_idle_',
          start: 0,
          end: 1,
        }),
        frameRate: 2,
        repeat: -1,
      });
    }

    if (!anims.exists('kiosk-active')) {
      anims.create({
        key: 'kiosk-active',
        frames: anims.generateFrameNames('kiosk', {
          prefix: 'kiosk_active_',
          start: 0,
          end: 3,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  isPlayerInRange(player) {
    return Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= INTERACT_RADIUS;
  }

  activate() {
    if (this.active) return;
    this.active = true;
    this.activeTimer = ACTIVE_DURATION_MS;
    this.play('kiosk-active');
  }

  extend(amount = EXTEND_AMOUNT_MS) {
    if (!this.active) return;
    this.activeTimer = Math.min(this.activeTimer + amount, ACTIVE_DURATION_MS);
  }

  update(time, delta) {
    if (!this.active) return;

    this.activeTimer -= delta;

    // Gentle scale pulse while active, distinct from the idle frame loop.
    const pulse = 1 + Math.sin(time / 200) * 0.05;
    this.setScale(pulse);

    if (this.activeTimer <= 0) {
      this.active = false;
      this.setScale(1);
      this.play('kiosk-idle');
    }
  }
}
