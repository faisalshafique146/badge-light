import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Kiosk from '../entities/Kiosk.js';
import LightSystem from '../systems/LightSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import Spawner from '../systems/Spawner.js';
import LootSystem from '../systems/LootSystem.js';
import FXSystem from '../systems/FXSystem.js';
import portalBridge from '../platform/PortalBridge.js';

// How much a single battery refills lightRadius by (see LightSystem's
// maxLightRadius of 120 — two batteries roughly refill from empty).
const BATTERY_REFILL_AMOUNT = 60;

// Win condition: survive until this countdown reaches zero.
const SUNRISE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

const SCORE_VALUES = {
  enemy: 100,
  kiosk: 250,
  win: 1000,
};

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
    this.isGamePaused = false;
    this.autoPaused = false;
    this.userMuted = portalBridge.getBoolean('muted', false);

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

    this.removeAudioPolicyListener = portalBridge.onAudioPolicyChange(() => {
      this.applyMuteState();
    });
    this.applyMuteState();

    this.zKey = this.input.keyboard.addKey('Z');
    this.cKey = this.input.keyboard.addKey('C');

    this.wireEvents();

    // Rendering continues (so the mall is visible behind the
    // instructions overlay) but update() — spawner, enemy AI, contact
    // UIScene remains active if GameScene is paused, so its pause and
    // mute controls can always receive input.
    this.scene.launch('UIScene');
    this.visibilityHandler = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityHandler);
    portalBridge.gameplayStart();
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
    uiScene.events.off('touch-use', this.handleTouchUse, this)
      .on('touch-use', this.handleTouchUse, this);
    uiScene.events.off('toggle-pause', this.togglePause, this)
      .on('toggle-pause', this.togglePause, this);
    uiScene.events.off('toggle-mute', this.toggleMute, this)
      .on('toggle-mute', this.toggleMute, this);

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
      if (!kiosk.isPlayerInRange(this.player)) return;
      if (Phaser.Input.Keyboard.JustDown(this.zKey)) this.activateKiosk(kiosk);
      if (Phaser.Input.Keyboard.JustDown(this.cKey)) this.feedKiosk(kiosk);
    });
  }

  activateKiosk(kiosk) {
    if (kiosk.active) return false;

    kiosk.activate();
    if (!kiosk.scoredThisRun) {
      kiosk.scoredThisRun = true;
      this.score.kiosksPowered += 1;
    }
    this.events.emit('kiosk-activated', kiosk.x, kiosk.y);
    return true;
  }

  feedKiosk(kiosk) {
    if (!kiosk.active || this.player.batteryCount <= 0) return false;

    this.player.batteryCount -= 1;
    this.lightSystem.refill(BATTERY_REFILL_AMOUNT);
    kiosk.extend();
    return true;
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

  handleTouchUse() {
    const kiosk = this.kiosks.find((candidate) => candidate.isPlayerInRange(this.player));
    if (!kiosk) return;

    if (!kiosk.active) this.activateKiosk(kiosk);
    else this.feedKiosk(kiosk);
  }

  applyMuteState() {
    const muted = this.userMuted || portalBridge.mustMuteAudio();
    this.sound.mute = muted;
    this.fxSystem?.setMuted(muted);
    this.scene.get('UIScene')?.events.emit('mute-state-changed', muted);
  }

  toggleMute() {
    if (portalBridge.mustMuteAudio()) return;
    this.userMuted = !this.userMuted;
    portalBridge.setBoolean('muted', this.userMuted);
    this.applyMuteState();
  }

  setPaused(paused, reportToPortal = true) {
    if (this.gameEnded || paused === this.isGamePaused) return;
    this.isGamePaused = paused;

    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('pause-state-changed', paused);

    if (paused) {
      if (reportToPortal) portalBridge.gameplayStop();
      this.scene.pause();
    } else {
      this.scene.resume();
      portalBridge.gameplayStart();
    }
  }

  togglePause() {
    this.autoPaused = false;
    this.setPaused(!this.isGamePaused);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      if (!this.isGamePaused && !this.gameEnded) {
        this.autoPaused = true;
        this.setPaused(true);
      }
    }
  }

  calculateScore(outcome) {
    return (
      this.score.enemiesDefeated * SCORE_VALUES.enemy +
      this.score.kiosksPowered * SCORE_VALUES.kiosk +
      (outcome === 'win' ? SCORE_VALUES.win : 0)
    );
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

    portalBridge.gameplayStop();
    const totalScore = this.calculateScore(outcome);
    const bestScore = Math.max(totalScore, portalBridge.getNumber('best-score', 0));
    portalBridge.setNumber('best-score', bestScore);
    portalBridge.setNumber('runs-played', portalBridge.getNumber('runs-played', 0) + 1);
    portalBridge.reportRun({
      outcome,
      totalScore,
      ...this.score,
    });

    this.physics.world.resume();
    this.tweens.resumeAll();
    if (this.fxSystem) this.fxSystem.hitStopActive = false;

    this.time.delayedCall(0, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        outcome,
        score: { ...this.score, total: totalScore, best: bestScore },
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
      if (this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler);
      }
      this.removeAudioPolicyListener?.();
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

    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('pause-state-changed', this.isGamePaused);
    uiScene.events.emit('mute-state-changed', this.sound.mute);
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
