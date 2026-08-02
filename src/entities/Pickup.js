import Phaser from 'phaser';

const POP_DURATION = 180; // ms scale-in when the pickup spawns

/**
 * A dropped loot item. Static (no physics-driven movement) — it just
 * sits at its drop point with a scale-in pop until LootSystem's
 * overlap with the player collects it.
 */
export default class Pickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, itemType, textureKey, frame) {
    super(scene, x, y, textureKey, frame);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.moves = false;

    this.itemType = itemType;

    this.setScale(0);
    scene.tweens.add({
      targets: this,
      scale: 1,
      duration: POP_DURATION,
      ease: 'Back.Out',
    });
  }
}
