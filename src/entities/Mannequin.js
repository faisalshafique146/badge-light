import Phaser from 'phaser';
import Enemy from './Enemy.js';

const DIRECTIONS = ['down', 'left', 'right', 'up'];

const CONFIG = {
  maxHealth: 60,
  contactDamage: 12,
  chaseSpeed: 28, // px/sec — deliberately slow
  detectionRadius: 90, // px, idle -> chase trigger
  attackRange: 16, // px, chase -> attack trigger
  attackCooldown: 1200, // ms between swings
};

/**
 * Slow, tanky melee chaser. Idles until the player enters
 * detectionRadius, walks straight at them, and swings on contact once
 * in attackRange. Damage is dealt from the attack animation itself, so
 * tryContactDamage() (continuous overlap damage) is disabled here.
 */
export default class Mannequin extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'mannequin', {
      initialFrame: 'mannequin_idle_down_0',
      maxHealth: CONFIG.maxHealth,
      contactDamage: CONFIG.contactDamage,
      deathParticleFrame: 'mannequin_death_0',
    });

    // Body covers the lower/torso region, not the full frame.
    this.body.setSize(12, 10);
    this.body.setOffset(2, 14);

    this.state = 'idle';
    this.lastAttackAt = 0;
  }

  registerAnimations(scene) {
    const anims = scene.anims;

    DIRECTIONS.forEach((dir) => {
      const idleKey = `mannequin-idle-${dir}`;
      if (!anims.exists(idleKey)) {
        anims.create({
          key: idleKey,
          frames: anims.generateFrameNames('mannequin', {
            prefix: `mannequin_idle_${dir}_`,
            start: 0,
            end: 3,
          }),
          frameRate: 4,
          repeat: -1,
        });
      }

      const walkKey = `mannequin-walk-${dir}`;
      if (!anims.exists(walkKey)) {
        anims.create({
          key: walkKey,
          frames: anims.generateFrameNames('mannequin', {
            prefix: `mannequin_walk_${dir}_`,
            start: 0,
            end: 3,
          }),
          frameRate: 5, // slow gait, matches chaseSpeed
          repeat: -1,
        });
      }

      const attackKey = `mannequin-attack-${dir}`;
      if (!anims.exists(attackKey)) {
        anims.create({
          key: attackKey,
          frames: anims.generateFrameNames('mannequin', {
            prefix: `mannequin_attack_${dir}_`,
            start: 0,
            end: 2,
          }),
          frameRate: 8,
          repeat: 0,
        });
      }
    });

    if (!anims.exists('mannequin-death')) {
      anims.create({
        key: 'mannequin-death',
        frames: anims.generateFrameNames('mannequin', {
          prefix: 'mannequin_death_',
          start: 0,
          end: 4,
        }),
        frameRate: 8,
        repeat: 0,
      });
    }
  }

  playIdle() {
    this.play(`mannequin-idle-${this.facing}`);
  }

  playDeath() {
    this.play('mannequin-death');
  }

  // Contact damage comes from the attack state instead of continuous
  // overlap, so the base class's cooldown-overlap damage is unused here.
  tryContactDamage() {}

  updateAI(time, delta) {
    const player = this.scene.player;
    if (!player) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case 'idle':
        this.setVelocity(0, 0);
        this.playLoop(`mannequin-idle-${this.facing}`);
        if (dist <= CONFIG.detectionRadius) {
          this.state = 'chase';
        }
        break;

      case 'chase': {
        if (dist <= CONFIG.attackRange) {
          this.state = 'attack';
          this.setVelocity(0, 0);
          break;
        }

        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setVelocity(
          Math.cos(angle) * CONFIG.chaseSpeed,
          Math.sin(angle) * CONFIG.chaseSpeed
        );
        this.facing = Enemy.facingFromVector(this.body.velocity.x, this.body.velocity.y);
        this.playLoop(`mannequin-walk-${this.facing}`);
        break;
      }

      case 'attack':
        this.setVelocity(0, 0);
        if (dist > CONFIG.attackRange) {
          this.state = 'chase';
        } else {
          this.tryAttack(time, player);
        }
        break;
    }
  }

  tryAttack(time, player) {
    if (time < this.lastAttackAt + CONFIG.attackCooldown) return;
    this.lastAttackAt = time;

    this.play(`mannequin-attack-${this.facing}`);
    player.takeDamage(CONFIG.contactDamage);
  }
}
