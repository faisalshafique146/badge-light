import Phaser from 'phaser';

// Every number a balance pass would touch lives here, not scattered
// through the methods below.
export const WEAPONS = {
  broom: {
    name: 'Broom',
    type: 'melee',
    damage: 15,
    cooldown: 450, // ms between swings
    animDuration: 250, // ms the swipe animation plays for
    range: 26, // px the hitbox reaches in front of the player
    arcWidth: 34, // px, hitbox width perpendicular to facing
    activeWindowMs: 140, // ms the hitbox stays live after the swing starts
    icon: 'icon_broom',
  },
  scanner: {
    name: 'Price Scanner',
    type: 'ranged',
    damage: 8,
    cooldown: 350, // ms between shots
    animDuration: 200, // ms the aim animation plays for
    range: 160, // px a projectile travels before despawning
    projectileSpeed: 220, // px/sec
    ammoCost: 1,
    icon: 'icon_scanner',
  },
};

const FACING_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const PROJECTILE_POOL_SIZE = 20;

/**
 * Pooled scan-beam projectile. Lives only inside CombatSystem — nothing
 * else needs to construct one directly, they come from the group pool.
 */
class ScanProjectile extends Phaser.Physics.Arcade.Sprite {
  fire(directionX, directionY, weapon) {
    this.body.reset(this.x, this.y);
    this.setRotation(Math.atan2(directionY, directionX));

    this.damage = weapon.damage;
    this.originX = this.x;
    this.originY = this.y;
    this.maxRange = weapon.range;

    this.setVelocity(
      directionX * weapon.projectileSpeed,
      directionY * weapon.projectileSpeed
    );
  }

  deactivate() {
    this.setActive(false);
    this.setVisible(false);
    this.body.stop();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    const traveled = Phaser.Math.Distance.Between(
      this.originX, this.originY, this.x, this.y
    );
    if (traveled >= this.maxRange) {
      this.deactivate();
    }
  }
}

/**
 * Owns both weapons, the equipped-weapon state, cooldown timers, the
 * projectile pool, and the small HUD icon. GameScene just constructs
 * this once and calls update(time, delta) each frame.
 */
export default class CombatSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.currentWeaponKey = 'broom';
    this.cooldowns = { broom: 0, scanner: 0 };
    this.enemyOverlapWired = false;

    // The melee zone stays "live" for a short window after a swing
    // starts rather than being checked on a single instant frame, so
    // it doesn't whiff against a moving target. meleeHitEnemies tracks
    // who's already been hit this swing so it can't double-hit.
    this.meleeZone = null;
    this.meleeActiveUntil = 0;
    this.meleeDamage = 0;
    this.meleeHitEnemies = new Set();

    this.spaceKey = scene.input.keyboard.addKey('SPACE');
    this.xKey = scene.input.keyboard.addKey('X');

    this.projectiles = scene.physics.add.group({
      classType: ScanProjectile,
      maxSize: PROJECTILE_POOL_SIZE,
      runChildUpdate: true,
    });

    this.weaponIcon = scene.add
      .image(4, 16, 'ui', WEAPONS.broom.icon)
      .setScrollFactor(0)
      .setDepth(1001)
      .setOrigin(0, 0);
  }

  update(time, delta) {
    // Enemies aren't built yet as of this pass; wire the overlap the
    // moment scene.enemies exists rather than requiring construction
    // order between CombatSystem and whatever creates that group.
    if (!this.enemyOverlapWired && this.scene.enemies) {
      this.scene.physics.add.overlap(
        this.projectiles,
        this.scene.enemies,
        this.onProjectileHitEnemy,
        null,
        this
      );
      this.enemyOverlapWired = true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.xKey)) {
      this.switchWeapon();
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.attack(time);
    }

    if (this.meleeZone && time < this.meleeActiveUntil) {
      this.applyMeleeDamage();
    } else if (this.meleeZone) {
      this.meleeZone = null;
    }
  }

  attack(time) {
    if (this.currentWeaponKey === 'broom') {
      this.fireBroom(time);
    } else {
      this.fireScanner(time);
    }
  }

  fireBroom(time) {
    const weapon = WEAPONS.broom;
    if (time < this.cooldowns.broom) return;
    this.cooldowns.broom = time + weapon.cooldown;

    this.player.playAction(
      `clerk-broomswipe-${this.player.facing}`,
      weapon.animDuration
    );

    this.meleeZone = this.getMeleeZone(weapon);
    this.meleeActiveUntil = time + weapon.activeWindowMs;
    this.meleeDamage = weapon.damage;
    this.meleeHitEnemies.clear();
    this.applyMeleeDamage(); // also check immediately, don't wait a frame
  }

  fireScanner(time) {
    const weapon = WEAPONS.scanner;
    if (time < this.cooldowns.scanner) return;
    if (this.player.scannerAmmo <= 0) return;

    this.cooldowns.scanner = time + weapon.cooldown;
    this.player.scannerAmmo -= weapon.ammoCost;

    this.player.playAction(
      `clerk-scanneraim-${this.player.facing}`,
      weapon.animDuration
    );

    const dir = FACING_VECTORS[this.player.facing];
    // Spawn roughly at chest height, offset a few px in the facing
    // direction so the beam doesn't start inside the player's own body.
    const originX = this.player.x + dir.x * 8;
    const originY = this.player.y - 12 + dir.y * 8;

    const projectile = this.projectiles.get(originX, originY, 'scanner-beam', 'scanner_beam_0');
    if (!projectile) return; // pool exhausted; drop the shot rather than error

    projectile.fire(dir.x, dir.y, weapon);
  }

  /**
   * Axis-aligned rectangle in front of the player, sized by the
   * weapon's range/arcWidth. Kept as a simple rectangle rather than a
   * true arc since movement is 4-directional — a rotated arc wouldn't
   * read any more accurately here, only cost more to compute.
   */
  getMeleeZone(weapon) {
    const { range, arcWidth } = weapon;
    const px = this.player.x;
    const py = this.player.y - 10; // roughly torso height, feet-anchored origin

    switch (this.player.facing) {
      case 'up':
        return new Phaser.Geom.Rectangle(px - arcWidth / 2, py - range, arcWidth, range);
      case 'down':
        return new Phaser.Geom.Rectangle(px - arcWidth / 2, py, arcWidth, range);
      case 'left':
        return new Phaser.Geom.Rectangle(px - range, py - arcWidth / 2, range, arcWidth);
      case 'right':
      default:
        return new Phaser.Geom.Rectangle(px, py - arcWidth / 2, range, arcWidth);
    }
  }

  applyMeleeDamage() {
    const enemies = this.scene.enemies;
    if (!enemies || !this.meleeZone) return; // no enemy group yet

    enemies.getChildren().forEach((enemy) => {
      if (this.meleeHitEnemies.has(enemy)) return; // already hit this swing
      if (Phaser.Geom.Rectangle.Contains(this.meleeZone, enemy.x, enemy.y)) {
        enemy.takeDamage?.(this.meleeDamage);
        this.meleeHitEnemies.add(enemy);
      }
    });
  }

  onProjectileHitEnemy(projectile, enemy) {
    enemy.takeDamage?.(projectile.damage);
    projectile.deactivate();
  }

  switchWeapon() {
    this.currentWeaponKey = this.currentWeaponKey === 'broom' ? 'scanner' : 'broom';
    this.updateWeaponIcon();
    this.playSwitchCue();
  }

  updateWeaponIcon() {
    const weapon = WEAPONS[this.currentWeaponKey];
    this.weaponIcon.setFrame(weapon.icon);
  }

  playSwitchCue() {
    // Visual flash cue: a quick scale-pop on the icon.
    this.weaponIcon.setScale(1.4);
    this.scene.tweens.add({
      targets: this.weaponIcon,
      scale: 1,
      duration: 180,
      ease: 'Back.Out',
    });

    // Sound cue, guarded since the audio file isn't part of this pass
    // yet — see ASSET_PLAN.md addendum.
    if (this.scene.cache.audio.exists('sfx-weapon-switch')) {
      this.scene.sound.play('sfx-weapon-switch', { volume: 0.5 });
    }
  }

  /**
   * Only destroys the plain display-list weaponIcon — Phaser already
   * destroys physics groups (like this.projectiles) belonging to a
   * stopped scene automatically. Wrapped in try/catch as a blanket
   * guarantee against this ever throwing during scene shutdown.
   */
  destroy() {
    try {
      this.weaponIcon.destroy();
    } catch (error) {
      console.warn('CombatSystem destroy() failed (non-fatal):', error);
    }
  }
}
