import Phaser from 'phaser';

const HP_PIP_COUNT = 5;
const LIGHT_BAR_WIDTH = 100;
const LIGHT_BAR_HEIGHT = 6;

const DPAD_BUTTON_SIZE = 20; // px, each directional pad in the cross
const DPAD_SPACING = 16; // px, distance from cross center to each button
const ACTION_BUTTON_RADIUS = 14; // px, broom/scanner touch buttons

const CONTROLS_LINES = [
  'ARROW KEYS   Move',
  'SPACE        Broom swipe',
  'X            Switch weapon',
  'Z            Activate kiosk',
  'C            Feed battery to kiosk',
  '(touch: d-pad to move, B/S buttons to attack)',
];

/**
 * HUD scene, launched alongside GameScene (this.scene.launch('UIScene')
 * from GameScene.create()) so both run and update in parallel. Every
 * value shown here arrives through events on GameScene's own emitter
 * (this.gameScene.events) — hp-changed, battery-changed, ammo-changed,
 * light-changed — never by reading GameScene/Player/systems directly.
 */
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    this.buildHud();
    this.buildTouchControls();
    this.buildInstructionsOverlay();
    this.wireGameEvents();

    this.layout();
    this.scale.off('resize', this.layout, this).on('resize', this.layout, this);

    // Detach listeners on shutdown so they don't accumulate on a
    // re-launch (e.g. game restart).
    this.events.once('shutdown', this.unwireGameEvents, this);

    // Tells GameScene it's safe to push the starting HUD values —
    // wireGameEvents() just ran, so a listener is actually attached.
    this.events.emit('ui-ready');
  }

  buildHud() {
    // --- Top-left: heart icon + HP pips ---
    this.heartIcon = this.add.image(0, 0, 'ui', 'icon_heart').setOrigin(0, 0.5).setScrollFactor(0);

    this.hpPips = [];
    for (let i = 0; i < HP_PIP_COUNT; i += 1) {
      // Scaled down from the 16x16 source icon so 5 of them fit as
      // a compact, non-overlapping row (see layout()'s PIP_SPACING).
      this.hpPips.push(
        this.add.image(0, 0, 'ui', 'icon_heart')
          .setOrigin(0, 0.5)
          .setScrollFactor(0)
          .setScale(0.5)
      );
    }

    // --- Top-left, next to HP: battery icon + count ---
    this.batteryIcon = this.add.image(0, 0, 'ui', 'icon_battery').setOrigin(0, 0.5).setScrollFactor(0);
    this.batteryText = this.add
      .text(0, 0, '0', { fontSize: '10px', color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // --- Top-right: scanner ammo icon + count ---
    this.ammoIcon = this.add.image(0, 0, 'ui', 'icon_ammo').setOrigin(0, 0.5).setScrollFactor(0);
    this.ammoText = this.add
      .text(0, 0, '0', { fontSize: '10px', color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // --- Top-center: sunrise countdown ---
    this.timeText = this.add
      .text(0, 0, '3:00', { fontSize: '11px', color: '#ffe066' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    // --- Bottom-center: badge icon + light meter bar ---
    // Icon uses origin(0, 0.5) so it centers against the bar's
    // vertical middle rather than its top edge.
    this.badgeIcon = this.add.image(0, 0, 'ui', 'icon_badge').setOrigin(0, 0.5).setScrollFactor(0);
    this.lightBarBg = this.add
      .rectangle(0, 0, LIGHT_BAR_WIDTH, LIGHT_BAR_HEIGHT, 0x222222)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.lightBarFill = this.add
      .rectangle(0, 0, LIGHT_BAR_WIDTH, LIGHT_BAR_HEIGHT, 0xffe066)
      .setOrigin(0, 0)
      .setScrollFactor(0);
  }

  /**
   * Virtual d-pad (4 directional zones) + two dedicated action buttons
   * (broom, scanner). Only visible on touch-capable devices — checked
   * via the game's device detection at creation, with a fallback that
   * reveals the controls the first time an actual touch pointer is
   * used, for hybrid devices (touchscreen laptops) where static
   * detection can be wrong either way.
   *
   * Every control emits on this scene's own event emitter
   * (touch-move / touch-broom / touch-scanner) rather than reaching
   * into GameScene, Player, or CombatSystem directly — GameScene
   * subscribes to these the same way UIScene subscribes to
   * GameScene's hp-changed/battery-changed/etc.
   */
  buildTouchControls() {
    this.touchControlsVisible = this.sys.game.device.input.touch;
    this.touchDirection = { up: false, down: false, left: false, right: false };

    const buttonStyle = { fillColor: 0xffffff, fillAlpha: 0.15, strokeColor: 0xffffff, strokeAlpha: 0.6 };

    this.dpadButtons = {};
    this.dpadLabels = {};
    const arrows = { up: '\u25B2', down: '\u25BC', left: '\u25C0', right: '\u25B6' };

    ['up', 'down', 'left', 'right'].forEach((dir) => {
      const button = this.add
        .rectangle(0, 0, DPAD_BUTTON_SIZE, DPAD_BUTTON_SIZE, buttonStyle.fillColor, buttonStyle.fillAlpha)
        .setStrokeStyle(1, buttonStyle.strokeColor, buttonStyle.strokeAlpha)
        .setScrollFactor(0)
        .setDepth(2000)
        .setInteractive();

      button.on('pointerdown', () => this.setTouchDirection(dir, true));
      button.on('pointerup', () => this.setTouchDirection(dir, false));
      button.on('pointerout', () => this.setTouchDirection(dir, false));

      this.dpadButtons[dir] = button;
      this.dpadLabels[dir] = this.add
        .text(0, 0, arrows[dir], { fontSize: '9px', color: '#ffffff' })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(2001);
    });

    this.broomButton = this.add
      .circle(0, 0, ACTION_BUTTON_RADIUS, buttonStyle.fillColor, buttonStyle.fillAlpha)
      .setStrokeStyle(1, buttonStyle.strokeColor, buttonStyle.strokeAlpha)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();
    this.broomButton.on('pointerdown', () => this.events.emit('touch-broom'));

    this.scannerButton = this.add
      .circle(0, 0, ACTION_BUTTON_RADIUS, buttonStyle.fillColor, buttonStyle.fillAlpha)
      .setStrokeStyle(1, buttonStyle.strokeColor, buttonStyle.strokeAlpha)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();
    this.scannerButton.on('pointerdown', () => this.events.emit('touch-scanner'));

    this.broomLabel = this.add
      .text(0, 0, 'B', { fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2001);
    this.scannerLabel = this.add
      .text(0, 0, 'S', { fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2001);

    this.setTouchControlsVisible(this.touchControlsVisible);

    this.input.off('pointerdown', this.handleGlobalPointerDown, this)
      .on('pointerdown', this.handleGlobalPointerDown, this);
  }

  handleGlobalPointerDown(pointer) {
    if (pointer.wasTouch && !this.touchControlsVisible) {
      this.touchControlsVisible = true;
      this.setTouchControlsVisible(true);
      this.layout();
    }
  }

  setTouchDirection(dir, active) {
    this.touchDirection[dir] = active;
    this.events.emit('touch-move', { ...this.touchDirection });
  }

  setTouchControlsVisible(visible) {
    Object.values(this.dpadButtons).forEach((button) => button.setVisible(visible));
    Object.values(this.dpadLabels).forEach((label) => label.setVisible(visible));
    this.broomButton.setVisible(visible);
    this.scannerButton.setVisible(visible);
    this.broomLabel.setVisible(visible);
    this.scannerLabel.setVisible(visible);
  }

  buildInstructionsOverlay() {
    const cam = this.cameras.main;

    this.instructionsBg = this.add
      .rectangle(0, 0, cam.width, cam.height, 0x000000, 0.75)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setInteractive();
    this.instructionsBg.on('pointerdown', this.dismissInstructions, this);

    this.instructionsTitle = this.add
      .text(cam.width / 2, cam.height / 2 - 54, 'BADGE LIGHT', { fontSize: '16px', color: '#ffe066' })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    this.instructionsBody = this.add
      .text(cam.width / 2, cam.height / 2 - 4, CONTROLS_LINES.join('\n'), {
        fontSize: '9px',
        color: '#ffffff',
        align: 'left',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    this.instructionsPrompt = this.add
      .text(cam.width / 2, cam.height / 2 + 62, 'Press any key or tap to start', {
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    this.input.keyboard.once('keydown', this.dismissInstructions, this);
  }

  dismissInstructions() {
    [this.instructionsBg, this.instructionsTitle, this.instructionsBody, this.instructionsPrompt]
      .forEach((element) => element?.destroy());

    // Null these out (not just destroy()) — layout() checks
    // `if (this.instructionsBg)` on every HUD update, and a destroyed-
    // but-still-referenced object is still truthy.
    this.instructionsBg = null;
    this.instructionsTitle = null;
    this.instructionsBody = null;
    this.instructionsPrompt = null;

    // GameScene starts paused specifically so nothing can damage the
    // player before they've seen this overlay — resume it now that
    // it's gone.
    this.gameScene.scene.resume();
  }

  wireGameEvents() {
    this.gameScene.events.on('hp-changed', this.handleHpChanged, this);
    this.gameScene.events.on('battery-changed', this.handleBatteryChanged, this);
    this.gameScene.events.on('ammo-changed', this.handleAmmoChanged, this);
    this.gameScene.events.on('light-changed', this.handleLightChanged, this);
    this.gameScene.events.on('time-changed', this.handleTimeChanged, this);
  }

  unwireGameEvents() {
    if (!this.gameScene) return;
    this.gameScene.events.off('hp-changed', this.handleHpChanged, this);
    this.gameScene.events.off('battery-changed', this.handleBatteryChanged, this);
    this.gameScene.events.off('ammo-changed', this.handleAmmoChanged, this);
    this.gameScene.events.off('light-changed', this.handleLightChanged, this);
    this.gameScene.events.off('time-changed', this.handleTimeChanged, this);
    this.scale.off('resize', this.layout, this);
  }

  handleHpChanged(hp, maxHp) {
    const pipValue = maxHp / HP_PIP_COUNT;
    this.hpPips.forEach((pip, index) => {
      const filled = hp > index * pipValue;
      pip.setFrame(filled ? 'icon_heart' : 'icon_heart_empty');
    });
  }

  handleBatteryChanged(count) {
    this.batteryText.setText(String(count));
    this.layout(); // ammo/battery text width can change with digit count
  }

  handleAmmoChanged(count) {
    this.ammoText.setText(String(count));
    this.layout();
  }

  handleLightChanged(radius, maxRadius) {
    const ratio = Phaser.Math.Clamp(radius / maxRadius, 0, 1);
    this.lightBarFill.setSize(LIGHT_BAR_WIDTH * ratio, LIGHT_BAR_HEIGHT);
  }

  handleTimeChanged(remainingMs) {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timeText.setText(`${minutes}:${String(seconds).padStart(2, '0')}`);
  }

  /**
   * Repositions every HUD element from the current camera size. Bound
   * to the scale manager's 'resize' event so the HUD stays correctly
   * placed at any window size.
   */
  layout() {
    const cam = this.cameras.main;

    // Shared vertical center for the top HUD row (heart/pips,
    // battery, ammo) — everything uses origin(0, 0.5) against this Y
    // so icons and text share a true center regardless of their
    // differing heights.
    const topRowY = 12;

    this.heartIcon.setPosition(4, topRowY);

    // Pips render at 8x8 (see buildHud's setScale(0.5)); 9px spacing
    // gives a 1px gap between them instead of overlapping.
    const PIP_SPACING = 9;
    const pipsStartX = 22;
    this.hpPips.forEach((pip, index) => {
      pip.setPosition(pipsStartX + index * PIP_SPACING, topRowY);
    });

    // Positioned clear of the last pip (pipsStartX + 4*PIP_SPACING + 8px wide + a gap).
    const batteryX = pipsStartX + (HP_PIP_COUNT - 1) * PIP_SPACING + 8 + 6;
    this.batteryIcon.setPosition(batteryX, topRowY);
    this.batteryText.setPosition(batteryX + 18, topRowY);

    this.ammoText.setPosition(cam.width - 6 - this.ammoText.width, topRowY);
    this.ammoIcon.setPosition(this.ammoText.x - 12, topRowY);

    this.timeText.setPosition(cam.width / 2, 4);

    const barX = cam.width / 2 - LIGHT_BAR_WIDTH / 2;
    const barY = cam.height - 12;
    this.badgeIcon.setPosition(barX - 12, barY + LIGHT_BAR_HEIGHT / 2);
    this.lightBarBg.setPosition(barX, barY);
    this.lightBarFill.setPosition(barX, barY);

    // Bottom-left: virtual d-pad.
    const dpadCenterX = 26;
    const dpadCenterY = cam.height - 26;
    this.dpadButtons.up.setPosition(dpadCenterX, dpadCenterY - DPAD_SPACING);
    this.dpadButtons.down.setPosition(dpadCenterX, dpadCenterY + DPAD_SPACING);
    this.dpadButtons.left.setPosition(dpadCenterX - DPAD_SPACING, dpadCenterY);
    this.dpadButtons.right.setPosition(dpadCenterX + DPAD_SPACING, dpadCenterY);
    Object.entries(this.dpadLabels).forEach(([dir, label]) => {
      label.setPosition(this.dpadButtons[dir].x, this.dpadButtons[dir].y);
    });

    // Bottom-right: broom + scanner action buttons, stacked vertically.
    const actionX = cam.width - 22;
    this.broomButton.setPosition(actionX, cam.height - 48);
    this.scannerButton.setPosition(actionX, cam.height - 16);
    this.broomLabel.setPosition(this.broomButton.x, this.broomButton.y);
    this.scannerLabel.setPosition(this.scannerButton.x, this.scannerButton.y);

    if (this.instructionsBg) {
      this.instructionsBg.setSize(cam.width, cam.height);
      this.instructionsTitle.setPosition(cam.width / 2, cam.height / 2 - 54);
      this.instructionsBody.setPosition(cam.width / 2, cam.height / 2 - 4);
      this.instructionsPrompt.setPosition(cam.width / 2, cam.height / 2 + 62);
    }
  }
}
