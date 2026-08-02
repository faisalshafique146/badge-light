import Phaser from 'phaser';

const HIT_FLASH_DURATION = 120; // ms white flash on taking damage

/**
 * Shared base for all enemy types. Handles HP, the white hit-flash,
 * death (particle burst + death animation + cleanup), and the
 * contact-damage hook used by GameScene's player/enemy overlap.
 * Subclasses supply their own animations, movement AI, and facing
 * logic by overriding registerAnimations(), playIdle(), playDeath(),
 * and updateAI().
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey, config = {}) {
    super(scene, x, y, textureKey, config.initialFrame);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);

    this.textureKey = textureKey;
    this.maxHealth = config.maxHealth ?? 20;
    this.health = this.maxHealth;
    this.contactDamage = config.contactDamage ?? 10;
    this.contactCooldown = config.contactCooldown ?? 800;
    this.lastContactAt = 0;
    this.deathParticleFrame = config.deathParticleFrame;
    this.isDead = false;

    // Set before registerAnimations()/playIdle() run, not after —
    // playIdle() is dispatched polymorphically to the subclass's own
    // override even while still inside this base constructor (`this`
    // is already the subclass instance), so a subclass that sets
    // this.facing in its own constructor body *after* calling super()
    // would still be reading `undefined` here. Pass a facing override
    // via config if a subclass ever needs one other than 'down'.
    this.facing = config.facing ?? 'down';

    this.registerAnimations(scene);
    this.playIdle();
  }

  // --- Subclass hooks, overridden per enemy type ---
  registerAnimations(scene) {}
  playIdle() {}
  playDeath() {}
  updateAI(time, delta) {}

  static facingFromVector(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx < 0 ? 'left' : 'right';
    }
    return dy < 0 ? 'up' : 'down';
  }

  playLoop(key) {
    if (this.anims.currentAnim?.key !== key) {
      this.play(key);
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);
    this.flashWhite();
    this.scene.events.emit('enemy-hit', this.x, this.y);

    if (this.health <= 0) {
      this.die();
    }
  }

  flashWhite() {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(HIT_FLASH_DURATION, () => {
      if (!this.isDead) this.clearTint();
    });
  }

  /**
   * Called from GameScene's player/enemy overlap. Default behavior is
   * continuous contact damage on a cooldown (used by FeralCart);
   * enemies that deal damage through a dedicated attack animation
   * instead (Mannequin) override this to a no-op.
   */
  tryContactDamage(player, time) {
    if (this.isDead) return;
    if (time < this.lastContactAt + this.contactCooldown) return;

    this.lastContactAt = time;
    player.takeDamage(this.contactDamage);
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    this.setVelocity(0, 0);
    this.body.enable = false;

    this.spawnDeathBurst();
    this.playDeath();
    this.scene.lootSystem?.dropFrom(this.x, this.y);
    this.scene.events.emit('enemy-died', this.x, this.y);

    if (this.scene.score) {
      this.scene.score.enemiesDefeated += 1;
    }

    // The death animation is a one-shot (repeat: 0), so this fires
    // exactly once, once it finishes playing.
    this.once('animationcomplete', () => this.destroy());
  }

  spawnDeathBurst() {
    const emitter = this.scene.add.particles(this.x, this.y - 8, this.textureKey, {
      frame: this.deathParticleFrame,
      speed: { min: 40, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 10,
      emitting: false,
    });
    emitter.explode(10);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  update(time, delta) {
    if (this.isDead) return;
    this.updateAI(time, delta);
  }
}
