import Phaser from 'phaser';

// Every tunable in one place, same convention as WEAPONS in CombatSystem.
const FX = {
  shake: {
    playerHit: { duration: 150, intensity: 0.012 },
    enemyDeath: { duration: 100, intensity: 0.006 },
  },
  hitStop: {
    durationMs: 50,
  },
  particles: {
    spark: { quantity: 8, speedMin: 60, speedMax: 140, lifespan: 250 },
    confetti: { quantity: 14, speedMin: 30, speedMax: 90, lifespan: 500 },
    glowPop: { quantity: 6, speedMin: 10, speedMax: 30, lifespan: 350 },
  },
  lowLight: {
    thresholdRatio: 0.2,
    alarmIntervalMs: 1500,
    vignettePulseMs: 900,
  },
  footsteps: {
    // Index within each 4-frame walk cycle treated as a "foot down"
    // contact frame. Frames 1 and 3 land roughly on the down-beats of
    // a typical 4-frame walk cycle.
    contactFrames: [1, 3],
  },
};

const CONFETTI_COLORS = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0xecf0f1];

/**
 * Self-contained juice layer: screen shake, hit-stop, particle bursts,
 * a low-light red-pulse + alarm cue, and animation-tied footstep audio.
 * Subscribes to events already emitted elsewhere (light-changed) plus
 * a handful of single-line event hooks added at their natural trigger
 * points (player-hit, enemy-hit, enemy-died, kiosk-activated,
 * battery-collected) — none of them carry gameplay logic, only
 * position/amount data for FX to react to.
 *
 * setEnabled(false) turns off every effect (visual + audio).
 * setMuted(true) keeps visuals but silences generated audio only.
 */
export default class FXSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.enabled = true;
    this.muted = false;

    this.hitStopActive = false;
    this.lowLightActive = false;
    this.alarmTimer = 0;

    this.ensureParticleTextures();
    this.buildLowLightOverlay();
    this.wireEvents();
  }

  // --- Setup -------------------------------------------------------

  ensureParticleTextures() {
    this.sparkTextureKey = this.ensureCanvasTexture('fx-spark', 8, (ctx, size) => {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255,255,200,1)');
      grad.addColorStop(1, 'rgba(255,220,80,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    });

    this.confettiTextureKey = this.ensureCanvasTexture('fx-confetti', 6, (ctx, size) => {
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fillRect(0, 0, size, size);
    });

    this.glowTextureKey = this.ensureCanvasTexture('fx-glow', 12, (ctx, size) => {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(180,255,200,1)');
      grad.addColorStop(1, 'rgba(120,255,160,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    });
  }

  ensureCanvasTexture(key, size, paint) {
    if (this.scene.textures.exists(key)) return key;
    const canvasTexture = this.scene.textures.createCanvas(key, size, size);
    paint(canvasTexture.getContext(), size);
    canvasTexture.refresh();
    return key;
  }

  /**
   * A full-viewport red vignette (bright at the edges, transparent in
   * the middle), hidden until low-light triggers it. Screen-space
   * like LightSystem's darkness layer, for the same reason — it needs
   * to track the camera, not the world.
   */
  buildLowLightOverlay() {
    const cam = this.scene.cameras.main;
    const key = this.ensureCanvasTexture('fx-vignette', 256, (ctx, size) => {
      const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size * 0.55);
      grad.addColorStop(0, 'rgba(200,0,0,0)');
      grad.addColorStop(1, 'rgba(200,0,0,0.9)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    });

    this.vignette = this.scene.add
      .image(cam.width / 2, cam.height / 2, key)
      .setDisplaySize(cam.width, cam.height)
      .setScrollFactor(0)
      .setDepth(1500)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  wireEvents() {
    const events = this.scene.events;
    events.on('player-hit', this.handlePlayerHit, this);
    events.on('enemy-hit', this.handleEnemyHit, this);
    events.on('enemy-died', this.handleEnemyDied, this);
    events.on('kiosk-activated', this.handleKioskActivated, this);
    events.on('battery-collected', this.handleBatteryCollected, this);
    events.on('light-changed', this.handleLightChanged, this);

    // Built-in Phaser sprite event — fires whenever the currently
    // playing animation advances to a new frame. No changes needed to
    // Player.js to get this; it's Phaser's own animation system.
    this.player.on('animationupdate', this.handlePlayerAnimationUpdate, this);

    this.scene.events.once('shutdown', this.destroy, this);
  }

  // --- Event handlers ------------------------------------------------

  handlePlayerHit() {
    if (!this.enabled) return;
    this.shake(FX.shake.playerHit);
    this.hitStop();
  }

  handleEnemyHit() {
    if (!this.enabled) return;
    this.hitStop();
  }

  handleEnemyDied(x, y) {
    if (!this.enabled) return;
    this.shake(FX.shake.enemyDeath);
    this.burstConfetti(x, y);
  }

  handleKioskActivated(x, y) {
    if (!this.enabled) return;
    this.burstSparks(x, y);
  }

  handleBatteryCollected(x, y) {
    if (!this.enabled) return;
    this.burstGlow(x, y);
  }

  handleLightChanged(radius, maxRadius) {
    if (!this.enabled) {
      this.lowLightActive = false;
      this.vignette.setAlpha(0);
      return;
    }
    this.lowLightActive = radius / maxRadius < FX.lowLight.thresholdRatio;
  }

  handlePlayerAnimationUpdate(animation, frame) {
    if (!this.enabled || this.muted) return;
    if (!animation.key.startsWith('clerk-walk-')) return;

    // frame.index is 1-based position within the animation's frame
    // list; our walk animations are 4 frames (indices 1-4), so this
    // maps directly onto FX.footsteps.contactFrames (0-based 1 and 3).
    const zeroBasedIndex = frame.index - 1;
    if (FX.footsteps.contactFrames.includes(zeroBasedIndex)) {
      this.playFootstep();
    }
  }

  // --- Effects -------------------------------------------------------

  shake(config) {
    this.scene.cameras.main.shake(config.duration, config.intensity);
  }

  /**
   * Pauses tweens and physics for ~50ms without touching game logic —
   * timers (this.scene.time) are a separate Phaser subsystem from
   * physics/tweens, so the delayedCall that un-pauses still fires on
   * schedule even while physics is paused.
   */
  hitStop() {
    if (this.hitStopActive) return;
    this.hitStopActive = true;

    this.scene.physics.world.pause();
    this.scene.tweens.pauseAll();

    this.scene.time.delayedCall(FX.hitStop.durationMs, () => {
      this.scene.physics.world.resume();
      this.scene.tweens.resumeAll();
      this.hitStopActive = false;
    });
  }

  burstSparks(x, y) {
    const cfg = FX.particles.spark;
    const emitter = this.scene.add.particles(x, y, this.sparkTextureKey, {
      speed: { min: cfg.speedMin, max: cfg.speedMax },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      lifespan: cfg.lifespan,
      quantity: cfg.quantity,
      emitting: false,
    });
    emitter.explode(cfg.quantity);
    this.scene.time.delayedCall(cfg.lifespan + 100, () => emitter.destroy());
  }

  burstConfetti(x, y) {
    const cfg = FX.particles.confetti;
    const emitter = this.scene.add.particles(x, y - 8, this.confettiTextureKey, {
      speed: { min: cfg.speedMin, max: cfg.speedMax },
      angle: { min: 0, max: 360 },
      gravityY: 180,
      scale: { start: 1, end: 0.3 },
      rotate: { start: 0, end: 180 },
      tint: CONFETTI_COLORS,
      lifespan: cfg.lifespan,
      quantity: cfg.quantity,
      emitting: false,
    });
    emitter.explode(cfg.quantity);
    this.scene.time.delayedCall(cfg.lifespan + 100, () => emitter.destroy());
  }

  burstGlow(x, y) {
    const cfg = FX.particles.glowPop;
    const emitter = this.scene.add.particles(x, y, this.glowTextureKey, {
      speed: { min: cfg.speedMin, max: cfg.speedMax },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: cfg.lifespan,
      quantity: cfg.quantity,
      emitting: false,
    });
    emitter.explode(cfg.quantity);
    this.scene.time.delayedCall(cfg.lifespan + 100, () => emitter.destroy());
  }

  /**
   * Short synthesized tones via raw Web Audio rather than sound-file
   * assets — keeps footsteps/alarm fully self-contained in this file
   * with no new asset-pipeline dependency. Falls back to silently
   * doing nothing if the browser's audio context isn't available yet
   * (e.g. before the first user gesture unlocks it).
   */
  playTone(freq, durationMs, type = 'sine', volume = 0.15) {
    if (this.muted) return;
    const ctx = this.scene.sound?.context;
    if (!ctx || ctx.state === 'closed') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  }

  playFootstep() {
    this.playTone(120, 60, 'square', 0.05);
  }

  playAlarmBeep() {
    this.playTone(880, 180, 'sine', 0.08);
  }

  // --- Per-frame update ------------------------------------------------

  /**
   * Only the low-light vignette pulse and alarm cadence need per-frame
   * work; everything else here is purely event-driven.
   */
  update(time, delta) {
    if (!this.enabled || !this.lowLightActive) {
      if (this.vignette.alpha > 0) this.vignette.setAlpha(0);
      return;
    }

    const pulse = (Math.sin((time / FX.lowLight.vignettePulseMs) * Math.PI * 2) + 1) / 2;
    this.vignette.setAlpha(0.25 + pulse * 0.35);

    this.alarmTimer += delta;
    if (this.alarmTimer >= FX.lowLight.alarmIntervalMs) {
      this.alarmTimer = 0;
      this.playAlarmBeep();
    }
  }

  // --- Public controls -------------------------------------------------

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.vignette.setAlpha(0);
      this.lowLightActive = false;
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  destroy() {
    try {
      this.player?.off('animationupdate', this.handlePlayerAnimationUpdate, this);
      this.vignette?.destroy();
    } catch (error) {
      console.warn('FXSystem destroy() failed (non-fatal):', error);
    }
  }
}
