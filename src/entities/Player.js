import Phaser from 'phaser';

// Tunable movement speed, in pixels/second.
const PLAYER_SPEED = 90;

const DIRECTIONS = ['down', 'left', 'right', 'up'];

/**
 * Player (stock clerk). Reads frames from the 'clerk' atlas loaded in
 * PreloadScene, following the clerk_<anim>_<direction>_<frame> naming
 * convention set in Phase 1 (e.g. clerk_idle_down_0, clerk_walk_left_2).
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'clerk', 'clerk_idle_down_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Frame canvas is 16x24 with the character anchored at the bottom
    // (see ASSET_PLAN.md); origin matches that so x/y tracks the feet.
    this.setOrigin(0.5, 1);

    // Body covers the feet/lower-body region only, not the full frame,
    // so collisions read correctly against a detailed sprite instead of
    // a box that includes head and shoulders.
    this.body.setSize(10, 8);
    this.body.setOffset(3, 16);

    this.speed = PLAYER_SPEED;
    this.facing = 'down';

    this.maxHealth = 100;
    this.health = this.maxHealth;

    // Starting inventory; the kiosk mechanic consumes these one at a time.
    this.batteryCount = 2;
    this.scannerAmmo = 20;

    // While true, update() won't overwrite the current animation with an
    // idle/walk frame — used so a broom-swipe or scanner-aim animation
    // plays to completion instead of being interrupted mid-frame.
    this.actionLock = false;

    this.cursors = scene.input.keyboard.createCursorKeys();

    this.registerAnimations(scene);
    this.play('clerk-idle-down');
  }

  registerAnimations(scene) {
    const anims = scene.anims;

    DIRECTIONS.forEach((dir) => {
      const idleKey = `clerk-idle-${dir}`;
      if (!anims.exists(idleKey)) {
        anims.create({
          key: idleKey,
          frames: anims.generateFrameNames('clerk', {
            prefix: `clerk_idle_${dir}_`,
            start: 0,
            end: 3,
          }),
          frameRate: 4,
          repeat: -1,
        });
      }

      const walkKey = `clerk-walk-${dir}`;
      if (!anims.exists(walkKey)) {
        anims.create({
          key: walkKey,
          frames: anims.generateFrameNames('clerk', {
            prefix: `clerk_walk_${dir}_`,
            start: 0,
            end: 3,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }

      const broomSwipeKey = `clerk-broomswipe-${dir}`;
      if (!anims.exists(broomSwipeKey)) {
        anims.create({
          key: broomSwipeKey,
          frames: anims.generateFrameNames('clerk', {
            prefix: `clerk_broomswipe_${dir}_`,
            start: 0,
            end: 2,
          }),
          frameRate: 12,
          repeat: 0,
        });
      }

      const scannerAimKey = `clerk-scanneraim-${dir}`;
      if (!anims.exists(scannerAimKey)) {
        anims.create({
          key: scannerAimKey,
          frames: anims.generateFrameNames('clerk', {
            prefix: `clerk_scanneraim_${dir}_`,
            start: 0,
            end: 1,
          }),
          frameRate: 10,
          repeat: 0,
        });
      }
    });
  }

  /**
   * touchDirection is an optional { up, down, left, right } object of
   * booleans fed in by GameScene from UIScene's virtual d-pad (see
   * handleTouchMove in GameScene). Keyboard and touch are simply
   * OR'd together per direction, so either input source moves the
   * player — Player itself doesn't know or care where the input came
   * from beyond that merge.
   */
  update(time, delta, touchDirection = {}) {
    const cursors = this.cursors;
    let vx = 0;
    let vy = 0;

    const left = cursors.left.isDown || touchDirection.left;
    const right = cursors.right.isDown || touchDirection.right;
    const up = cursors.up.isDown || touchDirection.up;
    const down = cursors.down.isDown || touchDirection.down;

    if (left) {
      vx = -this.speed;
      this.facing = 'left';
    } else if (right) {
      vx = this.speed;
      this.facing = 'right';
    }

    if (up) {
      vy = -this.speed;
      this.facing = 'up';
    } else if (down) {
      vy = this.speed;
      this.facing = 'down';
    }

    // Diagonal input would otherwise move faster than a single direction
    // (both axes at full speed); scale down so diagonal speed matches.
    if (vx !== 0 && vy !== 0) {
      const diagonalScale = Math.SQRT1_2;
      vx *= diagonalScale;
      vy *= diagonalScale;
    }

    this.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    const targetKey = moving
      ? `clerk-walk-${this.facing}`
      : `clerk-idle-${this.facing}`;

    // Re-checked every frame, so releasing a key drops straight to idle
    // on the next update rather than finishing a walk cycle first.
    // Skipped while actionLock is set, so a weapon animation isn't
    // stomped by movement on the very next frame.
    if (!this.actionLock && this.anims.currentAnim?.key !== targetKey) {
      this.play(targetKey);
    }
  }

  /**
   * Plays a one-shot animation (broom swipe, scanner aim) and blocks
   * update() from overwriting it with idle/walk until durationMs has
   * elapsed. Movement itself is unaffected — the player can still walk
   * while swinging, only the sprite's animation is locked.
   */
  playAction(animKey, durationMs) {
    this.actionLock = true;
    this.play(animKey);
    this.scene.time.delayedCall(durationMs, () => {
      this.actionLock = false;
    });
  }

  takeDamage(amount) {
    if (this.health <= 0) return;

    this.health = Math.max(0, this.health - amount);
    this.scene.events.emit('player-hit', amount);

    if (this.health <= 0) {
      this.scene.events.emit('player-died');
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addAmmo(amount) {
    this.scannerAmmo += amount;
  }

  addBattery(amount) {
    this.batteryCount += amount;
  }

  // Simple read-only accessors for the HUD (next phase) to poll each
  // frame without reaching into internal field names directly.
  get hp() {
    return this.health;
  }

  get maxHp() {
    return this.maxHealth;
  }

  get ammo() {
    return this.scannerAmmo;
  }

  get batteries() {
    return this.batteryCount;
  }
}
