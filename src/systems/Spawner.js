import Phaser from 'phaser';
import Mannequin from '../entities/Mannequin.js';
import FeralCart from '../entities/FeralCart.js';

const BASE_SPAWN_INTERVAL = 4000; // ms between spawns at the start of a run
const MIN_SPAWN_INTERVAL = 1200; // ms floor the interval ramps down to
const RAMP_DURATION = 90000; // ms of survival time to reach the floor
const MAX_CONCURRENT_ENEMIES = 12;
const SPAWN_MARGIN = 24; // px outside the camera view a spawn point sits at

const ENEMY_TYPES = [Mannequin, FeralCart];

/**
 * Spawns enemies from points just outside the camera view at an
 * interval that shortens as survival time increases, capped at
 * MAX_CONCURRENT_ENEMIES. GameScene constructs this once, passing the
 * Arcade group it wants enemies added to, and calls update(time, delta)
 * each frame.
 */
export default class Spawner {
  constructor(scene, enemiesGroup, map) {
    this.scene = scene;
    this.enemies = enemiesGroup;
    this.map = map;

    this.survivalTime = 0;
    this.nextSpawnAt = BASE_SPAWN_INTERVAL;
  }

  getCurrentInterval() {
    const progress = Phaser.Math.Clamp(this.survivalTime / RAMP_DURATION, 0, 1);
    return Phaser.Math.Linear(BASE_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, progress);
  }

  update(time, delta) {
    this.survivalTime += delta;

    if (this.survivalTime < this.nextSpawnAt) return;
    this.nextSpawnAt = this.survivalTime + this.getCurrentInterval();

    if (this.enemies.getLength() >= MAX_CONCURRENT_ENEMIES) return; // capped, skip this wave

    this.spawnOne();
  }

  spawnOne() {
    const EnemyClass = Phaser.Utils.Array.GetRandom(ENEMY_TYPES);
    const { x, y } = this.getOffscreenSpawnPoint();

    const enemy = new EnemyClass(this.scene, x, y);
    this.enemies.add(enemy);
  }

  /**
   * Picks a point just outside the camera's current view, clamped to
   * map bounds, so enemies walk into frame rather than popping into
   * visibility.
   */
  getOffscreenSpawnPoint() {
    const view = this.scene.cameras.main.worldView;
    const edge = Phaser.Math.Between(0, 3); // 0 top, 1 right, 2 bottom, 3 left

    let x;
    let y;

    switch (edge) {
      case 0: // top
        x = Phaser.Math.Between(view.x, view.right);
        y = view.y - SPAWN_MARGIN;
        break;
      case 1: // right
        x = view.right + SPAWN_MARGIN;
        y = Phaser.Math.Between(view.y, view.bottom);
        break;
      case 2: // bottom
        x = Phaser.Math.Between(view.x, view.right);
        y = view.bottom + SPAWN_MARGIN;
        break;
      case 3: // left
      default:
        x = view.x - SPAWN_MARGIN;
        y = Phaser.Math.Between(view.y, view.bottom);
        break;
    }

    return {
      x: Phaser.Math.Clamp(x, 8, this.map.widthInPixels - 8),
      y: Phaser.Math.Clamp(y, 8, this.map.heightInPixels - 8),
    };
  }
}
