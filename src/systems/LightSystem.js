import Phaser from 'phaser';

// Tunables
const MAX_LIGHT_RADIUS = 120; // px, full battery
const MIN_LIGHT_RADIUS = 24; // px, the floor the light can decay to — never fully blind
const DECAY_PER_SECOND = 4; // px/sec lost while not refilled
const DAMAGE_INTERVAL_MS = 1000; // time between damage ticks once radius bottoms out
const DAMAGE_AMOUNT = 5;
const MASK_TEXTURE_SIZE = 512; // resolution of the generated gradient, scaled at draw time

/**
 * Owns the "badge light" visibility mechanic: a black RenderTexture
 * covering the camera viewport, punched through each frame by a soft
 * radial gradient at the player's screen position using the ERASE blend
 * mode. Call update(time, delta) once per frame from GameScene; nothing
 * else needs to touch this beyond refill() when a battery is consumed.
 */
export default class LightSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.lightRadius = MAX_LIGHT_RADIUS;
    this.maxLightRadius = MAX_LIGHT_RADIUS;
    this.minLightRadius = MIN_LIGHT_RADIUS;
    this.decayPerSecond = DECAY_PER_SECOND;

    this.damageTimer = 0;

    const cam = scene.cameras.main;

    // Drawn in screen space (scroll factor 0) so it always covers the
    // visible viewport regardless of where the camera is in the world.
    this.darkness = scene.add.renderTexture(0, 0, cam.width, cam.height);
    this.darkness.setOrigin(0, 0);
    this.darkness.setScrollFactor(0);
    this.darkness.setDepth(1000);

    this.lightMaskKey = this.ensureLightMaskTexture(scene);

    // Not added to the display list directly — used only as a stamp
    // that RenderTexture.erase() draws with, so it stays invisible.
    this.lightStamp = scene.make.image({ key: this.lightMaskKey, add: false });
  }

  /**
   * Builds a soft white-to-transparent radial gradient once and caches
   * it as a canvas texture, since regenerating it every frame would be
   * wasteful and it never needs to change shape, only scale.
   */
  ensureLightMaskTexture(scene) {
    const key = 'light-mask-radial';
    if (scene.textures.exists(key)) {
      return key;
    }

    const size = MASK_TEXTURE_SIZE;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    const ctx = canvasTexture.getContext();

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvasTexture.refresh();

    return key;
  }

  update(time, delta) {
    const dt = delta / 1000;

    this.lightRadius = Math.max(0, this.lightRadius - this.decayPerSecond * dt);

    if (this.lightRadius <= 0) {
      this.damageTimer += delta;
      if (this.damageTimer >= DAMAGE_INTERVAL_MS) {
        this.damageTimer = 0;
        this.player.takeDamage(DAMAGE_AMOUNT);
      }
    } else {
      this.damageTimer = 0;
    }

    this.renderDarkness();

    this.scene.events.emit('light-changed', this.lightRadius, this.maxLightRadius);
  }

  renderDarkness() {
    const cam = this.scene.cameras.main;

    this.darkness.clear();
    this.darkness.fill(0x000000, 1, 0, 0, cam.width, cam.height);

    // Player's world position converted to screen position, since the
    // RenderTexture itself doesn't scroll with the camera.
    const screenX = this.player.x - cam.worldView.x;
    const screenY = this.player.y - cam.worldView.y;

    // Battery never drops the visible radius below minLightRadius, so
    // the player can always see a small area even at zero charge.
    const effectiveRadius = Math.max(this.lightRadius, this.minLightRadius);
    const scale = (effectiveRadius * 2) / MASK_TEXTURE_SIZE;
    this.lightStamp.setScale(scale);

    this.darkness.erase(this.lightStamp, screenX, screenY);
  }

  refill(amount) {
    this.lightRadius = Phaser.Math.Clamp(
      this.lightRadius + amount,
      0,
      this.maxLightRadius
    );
  }

  destroy() {
    try {
      this.darkness.destroy();
      this.lightStamp.destroy();
    } catch (error) {
      console.warn('LightSystem destroy() failed (non-fatal):', error);
    }
  }
}
