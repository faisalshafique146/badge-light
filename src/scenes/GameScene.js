import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Kiosk from '../entities/Kiosk.js';
import LightSystem from '../systems/LightSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import Spawner from '../systems/Spawner.js';
import LootSystem from '../systems/LootSystem.js';
import FXSystem from '../systems/FXSystem.js';

// How much a single battery refills lightRadius by (see LightSystem's
// maxLightRadius of 120 — two batteries roughly refill from empty).
const BATTERY_REFILL_AMOUNT = 60;

// Win condition: survive until this countdown reaches zero.
const SUNRISE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // The Scene instance persists across restarts (Phaser reuses it
    // rather than recreating it), so per-run state is reset here
    // rather than in the constructor.
    this.gameEnded = false;
    this.survivalTimeRemaining = SUNRISE_DURATION_MS;
    this.score = { enemiesDefeated: 0, kiosksPowered: 0 };
    this.lastHudState = { hp: null, batteries: null, ammo: null };
    this.touchDirection = { up: false, down: false, left: false, right: false };

    const map = this.make.tilemap({ key: 'mall-map' });
    const tileset = map.addTilesetImage('mall-tiles', 'mall-tiles');

    map.createLayer('Floor', tileset, 0, 0);
    const wallsLayer = map.createLayer('Walls', tileset, 0, 0);
    const shelvesLayer = map.createLayer('Shelves', tileset, 0, 0);
    map.createLayer('Props', tileset, 0, 0);

    wallsLayer.setCollisionByExclusion([-1]);
    shelvesLayer.setCollisionByExclusion([-1]);

    this.player = new Player(this, map.widthInPixels / 2, map.heightInPixels / 2);

    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, shelvesLayer);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(48, 32);

    this.kiosks = this.buildKiosks(map);

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.enemies, wallsLayer);
    this.physics.add.collider(this.enemies, shelvesLayer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyContact, undefined, this);

    this.spawner = new Spawner(this, this.enemies, map);

    this.lightSystem = new LightSystem(this, this.player);
    this.combatSystem = new CombatSystem(this, this.player);
    this.lootSystem = new LootSystem(this, this.player);
    this.fxSystem = new FXSystem(this, this.player);

    this.zKey = this.input.keyboard.addKey('Z');
    this.cKey = this.input.keyboard.addKey('C');

    this.wireEvents();

    // Rendering continues (so the mall is visible behind the
    // instructions overlay) but update() — spawner, enemy AI, contact
    // damage, the sunrise countdown — doesn't run until UIScene's
    // instructions overlay is dismissed and resumes this scene.
    this.scene.launch('UIScene');
    this.scene.pause();
  }

  /**
   * All cross-scene and lifecycle event wiring in one place. Uses
   * off() before on() throughout since this Scene instance persists
   * across restarts — without it, each restart would stack a second
   * copy of every listener.
   */
  wireEvents() {
    this.events.off('player-died', this.handlePlayerDied, this)
      .on('player-died', this.handlePlayerDied, this);

    this.events.off('shutdown', this.cleanup, this)
      .on('shutdown', this.cleanup, this);

    // UIScene owns the on-screen d-pad/buttons and the instructions
    // overlay; it reports both to GameScene via events rather than
    // GameScene reaching into UIScene, or vice versa.
    const uiScene = this.scene.get('UIScene');

    uiScene.events.off('touch-move', this.handleTouchMove, this)
      .on('touch-move', this.handleTouchMove, this);
    uiScene.events.off('touch-broom', this.handleTouchBroom, this)
      .on('touch-broom', this.handleTouchBroom, this);
    uiScene.events.off('touch-scanner', this.handleTouchScanner, this)
      .on('touch-scanner', this.handleTouchScanner, this);

    // Fired once UIScene has subscribed to hp-changed/battery-changed/
    // etc. — pushing the starting HUD values at that point (rather
    // than immediately after scene.launch()) guarantees UIScene is
    // actually listening before anything is sent.
    uiScene.events.off('ui-ready', this.emitHudState, this)
      .on('ui-ready', this.emitHudState, this);
  }

  /**
   * Reads kiosk placements from a Tiled object layer named 'Kiosks'
   * (point objects). Falls back to four evenly-spaced positions if the
   * map doesn't define that layer.
   */
  buildKiosks(map) {
    const objectLayer = map.getObjectLayer('Kiosks');

    const points = objectLayer && objectLayer.objects.length > 0
      ? objectLayer.objects.map((obj) => ({ x: obj.x, y: obj.y }))
      : [
          { x: map.widthInPixels * 0.2, y: map.heightInPixels * 0.25 },
          { x: map.widthInPixels * 0.8, y: map.heightInPixels * 0.25 },
          { x: map.widthInPixels * 0.2, y: map.heightInPixels * 0.75 },
          { x: map.widthInPixels * 0.8, y: map.heightInPixels * 0.75 },
        ];

    return points.map(({ x, y }) => new Kiosk(this, x, y));
  }

  handleKioskInteraction() {
    this.kiosks.forEach((kiosk) => {
      const inRange = kiosk.isPlayerInRange(this.player);

      if (inRange && Phaser.Input.Keyboard.JustDown(this.zKey) && !kiosk.active) {
        kiosk.activate();
        this.score.kiosksPowered += 1;
        this.events.emit('kiosk-activated', kiosk.x, kiosk.y);
      }

      if (
        inRange &&
        kiosk.active &&
        Phaser.Input.Keyboard.JustDown(this.cKey) &&
        this.player.batteryCount > 0
      ) {
        this.player.batteryCount -= 1;
        this.lightSystem.refill(BATTERY_REFILL_AMOUNT);
        kiosk.extend();
      }
    });
  }

  handleEnemyContact(player, enemy) {
    enemy.tryContactDamage(player, this.time.now);
  }

  handlePlayerDied() {
    this.endGame('loss');
  }

  handleTouchMove(direction) {
    this.touchDirection = direction;
  }

  /**
   * Touch controls give each weapon its own dedicated button rather
   * than mirroring the keyboard's fire/switch scheme — both still go
   * through CombatSystem's normal fireBroom()/fireScanner(), so
   * cooldowns and ammo are respected the same way either input source.
   */
  handleTouchBroom() {
    this.combatSystem.fireBroom(this.time.now);
  }

  handleTouchScanner() {
    this.combatSystem.fireScanner(this.time.now);
  }

  /**
   * Single choke point for both win and loss transitions. Guarded by
   * gameEnded so a timer-expiry win and a same-frame death can't both
   * fire. Force-resumes physics/tweens in case FXSystem's hit-stop
   * left them paused, and defers the actual scene transition by one
   * tick rather than triggering it from inside a physics overlap
   * callback.
   */
  endGame(outcome) {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.physics.world.resume();
    this.tweens.resumeAll();
    if (this.fxSystem) this.fxSystem.hitStopActive = false;

    this.time.delayedCall(0, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        outcome,
        score: { ...this.score },
      });
    });
  }

  /**
   * Runs on scene shutdown. Only cleans up things Phaser doesn't own
   * for us (Kiosk/LightSystem/CombatSystem instances) — Phaser already
   * destroys this scene's own game objects and physics bodies
   * automatically. Wrapped in try/catch so a failure here can never
   * freeze the game.
   */
  cleanup() {
    try {
      this.kiosks?.forEach((kiosk) => kiosk.destroy());
      this.lightSystem?.destroy();
      this.combatSystem?.destroy();
    } catch (error) {
      console.warn('GameScene cleanup() failed (non-fatal):', error);
    }
  }

  /**
   * Diffs the player's HP/battery/ammo against the last emitted values
   * and fires the corresponding event only when something changed.
   * UIScene reads game state exclusively through these events.
   */
  emitHudState() {
    const { hp, maxHp, batteries, ammo } = this.player;
    const last = this.lastHudState;

    if (hp !== last.hp) {
      this.events.emit('hp-changed', hp, maxHp);
      last.hp = hp;
    }

    if (batteries !== last.batteries) {
      this.events.emit('battery-changed', batteries);
      last.batteries = batteries;
    }

    if (ammo !== last.ammo) {
      this.events.emit('ammo-changed', ammo);
      last.ammo = ammo;
    }
  }

  update(time, delta) {
    this.survivalTimeRemaining = Math.max(0, this.survivalTimeRemaining - delta);
    this.events.emit('time-changed', this.survivalTimeRemaining, SUNRISE_DURATION_MS);

    if (this.survivalTimeRemaining <= 0) {
      this.endGame('win');
      return;
    }

    this.player.update(time, delta, this.touchDirection);

    this.kiosks.forEach((kiosk) => kiosk.update(time, delta));
    this.handleKioskInteraction();

    this.enemies.getChildren().forEach((enemy) => enemy.update(time, delta));
    this.spawner.update(time, delta);

    this.lightSystem.update(time, delta);
    this.combatSystem.update(time, delta);
    this.fxSystem.update(time, delta);

    this.emitHudState();
  }
}
