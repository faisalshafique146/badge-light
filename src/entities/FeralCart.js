import Phaser from 'phaser';
import Enemy from './Enemy.js';

const DIRECTIONS = ['down', 'left', 'right', 'up'];

const CONFIG = {
  maxHealth: 15,
  contactDamage: 8,
  contactCooldown: 600, // ms between contact-damage ticks while colliding
  detectionRadius: 100,
  telegraphDuration: 350, // ms wobble before committing to a dash
  dashSpeed: 260,
  dashDuration: 300, // ms per dash burst
  restDuration: 400, // ms pause after a dash before telegraphing again
};

/**
 * Fast, fragile shopping cart. Idle until the player is in range, then
 * cycles telegraph (wobble in place, facing the player) -> dash (short
 * burst of speed in the direction locked in at telegraph start) ->
 * rest -> repeat. Contact damage is continuous-overlap based (the
 * base class default), unlike Mannequin's animation-timed swing.
 */
export default class FeralCart extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'cart', {
      initialFrame: 'cart_idle_0',
      maxHealth: CONFIG.maxHealth,
      contactDamage: CONFIG.contactDamage,
      contactCooldown: CONFIG.contactCooldown,
      deathParticleFrame: 'cart_death_0',
    });

    this.body.setSize(14, 10);
    this.body.setOffset(1, 12);

    this.state = 'idle';
    this.stateChangeAt = 0;
    this.dashVector = { x: 0, y: 0 };
  }

  registerAnimations(scene) {
    const anims = scene.anims;

    if (!anims.exists('cart-idle')) {
      anims.create({
        key: 'cart-idle',
        frames: anims.generateFrameNames('cart', { prefix: 'cart_idle_', start: 0, end: 1 }),
        frameRate: 3,
        repeat: -1,
      });
    }

    if (!anims.exists('cart-wobble')) {
      anims.create({
        key: 'cart-wobble',
        frames: anims.generateFrameNames('cart', { prefix: 'cart_wobble_', start: 0, end: 2 }),
        frameRate: 12,
        repeat: -1,
      });
    }

    DIRECTIONS.forEach((dir) => {
      const rollKey = `cart-roll-${dir}`;
      if (!anims.exists(rollKey)) {
        anims.create({
          key: rollKey,
          frames: anims.generateFrameNames('cart', {
            prefix: `cart_roll_${dir}_`,
            start: 0,
            end: 3,
          }),
          frameRate: 16, // fast rattle, matches dashSpeed
          repeat: -1,
        });
      }
    });

    if (!anims.exists('cart-death')) {
      anims.create({
        key: 'cart-death',
        frames: anims.generateFrameNames('cart', { prefix: 'cart_death_', start: 0, end: 4 }),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  playIdle() {
    this.play('cart-idle');
  }

  playDeath() {
    this.play('cart-death');
  }

  updateAI(time, delta) {
    const player = this.scene.player;
    if (!player) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case 'idle':
        this.setVelocity(0, 0);
        this.playLoop('cart-idle');
        if (dist <= CONFIG.detectionRadius) {
          this.enterTelegraph(time, player);
        }
        break;

      case 'telegraph':
        this.setVelocity(0, 0);
        if (time >= this.stateChangeAt) {
          this.enterDash(time);
        }
        break;

      case 'dash':
        if (time >= this.stateChangeAt) {
          this.enterRest(time);
        }
        break;

      case 'rest':
        this.setVelocity(0, 0);
        this.playLoop('cart-idle');
        if (time >= this.stateChangeAt) {
          if (dist <= CONFIG.detectionRadius) {
            this.enterTelegraph(time, player);
          } else {
            this.state = 'idle';
          }
        }
        break;
    }
  }

  enterTelegraph(time, player) {
    this.state = 'telegraph';
    this.stateChangeAt = time + CONFIG.telegraphDuration;

    // Direction is locked in now, at the start of the telegraph, so the
    // cart commits to where the player was standing rather than
    // tracking them mid-dash — that's what makes the telegraph a real
    // dodgeable tell instead of a guaranteed hit.
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.dashVector = { x: Math.cos(angle), y: Math.sin(angle) };
    this.facing = Enemy.facingFromVector(this.dashVector.x, this.dashVector.y);

    this.play('cart-wobble');
  }

  enterDash(time) {
    this.state = 'dash';
    this.stateChangeAt = time + CONFIG.dashDuration;
    this.setVelocity(
      this.dashVector.x * CONFIG.dashSpeed,
      this.dashVector.y * CONFIG.dashSpeed
    );
    this.play(`cart-roll-${this.facing}`);
  }

  enterRest(time) {
    this.state = 'rest';
    this.stateChangeAt = time + CONFIG.restDuration;
    this.setVelocity(0, 0);
    this.play('cart-idle');
  }
}
