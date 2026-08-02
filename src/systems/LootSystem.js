import Phaser from 'phaser';
import Pickup from '../entities/Pickup.js';

// Weighted drop table — weights are relative, not required to sum to
// 100. 'nothing' is a real entry so no-drop odds are tunable here too,
// not implied by "whatever's left over".
export const DROP_TABLE = [
  { type: 'snack', weight: 35, textureKey: 'snack', frame: 'snack_0' },
  { type: 'battery', weight: 25, textureKey: 'battery-item', frame: 'battery_0' },
  { type: 'nothing', weight: 40 },
];

// What each item type does when collected. Kept separate from
// DROP_TABLE so drop odds and item effects can be tuned independently.
export const ITEM_EFFECTS = {
  snack: { healAmount: 30 },
  battery: { batteryAmount: 1, ammoAmount: 5 },
};

/**
 * Owns the drop table, the pickup pool/group, and auto-collect on
 * player overlap. GameScene constructs this once; enemies call
 * scene.lootSystem.dropFrom(x, y) from their death handler. No manual
 * update() is needed — Arcade overlap fires on its own each physics step.
 */
export default class LootSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.pickups = scene.physics.add.group();

    scene.physics.add.overlap(player, this.pickups, this.collect, undefined, this);
  }

  rollDrop() {
    const totalWeight = DROP_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.Between(1, totalWeight);

    for (const entry of DROP_TABLE) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }

    return DROP_TABLE[DROP_TABLE.length - 1];
  }

  dropFrom(x, y) {
    const entry = this.rollDrop();
    if (entry.type === 'nothing') return;

    const pickup = new Pickup(this.scene, x, y, entry.type, entry.textureKey, entry.frame);
    this.pickups.add(pickup);
  }

  collect(player, pickup) {
    const effect = ITEM_EFFECTS[pickup.itemType];

    if (effect) {
      if (effect.healAmount) player.heal(effect.healAmount);
      if (effect.batteryAmount) {
        player.addBattery(effect.batteryAmount);
        this.scene.events.emit('battery-collected', pickup.x, pickup.y);
      }
      if (effect.ammoAmount) player.addAmmo(effect.ammoAmount);
    }

    if (this.scene.cache.audio.exists('sfx-pickup')) {
      this.scene.sound.play('sfx-pickup', { volume: 0.5 });
    }

    pickup.destroy();
  }
}
