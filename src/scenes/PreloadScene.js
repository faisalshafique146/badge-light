import Phaser from 'phaser';

// Every asset is imported as a module rather than referenced by a bare
// path string. That's what makes them visible to Vite's asset
// pipeline: an import resolves to a real URL (a dev-server path in
// `npm run dev`, and — with build.assetsInlineLimit raised in
// vite.config.js — a base64 data: URI in `npm run build`). Bare
// strings like 'assets/foo.png' only work if the file lives in
// public/ and is fetched at runtime, which can never be inlined into
// a single HTML file.
//
// Images resolve to a URL by default. JSON files default to being
// *parsed* into a JS object on import, which Phaser's atlas/tilemap
// loaders can't consume directly — the `?url` suffix forces Vite to
// hand back the resolved URL instead, same as an image import.
import clerkPng from '../assets/characters/clerk.png';
import clerkJsonUrl from '../assets/characters/clerk.json?url';
import mannequinPng from '../assets/characters/mannequin.png';
import mannequinJsonUrl from '../assets/characters/mannequin.json?url';
import cartPng from '../assets/characters/cart.png';
import cartJsonUrl from '../assets/characters/cart.json?url';

import kioskPng from '../assets/props/kiosk.png';
import kioskJsonUrl from '../assets/props/kiosk.json?url';
import snackPng from '../assets/props/snack.png';
import snackJsonUrl from '../assets/props/snack.json?url';
import batteryPng from '../assets/props/battery.png';
import batteryJsonUrl from '../assets/props/battery.json?url';

import scannerBeamPng from '../assets/effects/scanner-beam.png';
import scannerBeamJsonUrl from '../assets/effects/scanner-beam.json?url';

import mallTilesPng from '../assets/tilesets/mall-tiles.png';
import mallMapJsonUrl from '../assets/tilemaps/mall-map.json?url';

import uiPng from '../assets/ui/ui.png';
import uiJsonUrl from '../assets/ui/ui.json?url';

// Optional audio — uncomment once real files exist at these paths.
// import weaponSwitchSfxUrl from '../assets/audio/weapon-switch.wav?url';
// import pickupSfxUrl from '../assets/audio/pickup.wav?url';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // --- Progress bar wiring (optional but recommended once assets grow) ---
    // this.load.on('progress', (value) => { ...update a bar graphic... });

    // --- Character atlas: one PNG + one JSON, texture-packed ---
    this.load.atlas('clerk', clerkPng, clerkJsonUrl);
    this.load.atlas('mannequin', mannequinPng, mannequinJsonUrl);
    this.load.atlas('cart', cartPng, cartJsonUrl);

    // Directory kiosk (idle + active/pulsing frames)
    this.load.atlas('kiosk', kioskPng, kioskJsonUrl);

    // Scan-beam projectile (pooled by CombatSystem)
    this.load.atlas('scanner-beam', scannerBeamPng, scannerBeamJsonUrl);

    // Loot pickups (LootSystem)
    this.load.atlas('snack', snackPng, snackJsonUrl);
    this.load.atlas('battery-item', batteryPng, batteryJsonUrl);

    // Weapon-switch sound cue. Optional: CombatSystem checks
    // cache.audio.exists() before playing, so a missing file here
    // degrades to a silent (visual-only) switch cue rather than erroring.
    // this.load.audio('sfx-weapon-switch', weaponSwitchSfxUrl);

    // Pickup sound cue. Optional in the same way — LootSystem checks
    // cache.audio.exists() before playing.
    // this.load.audio('sfx-pickup', pickupSfxUrl);

    // --- Tileset image referenced by the Tiled map ---
    this.load.image('mall-tiles', mallTilesPng);

    // --- Tiled JSON map (exported from Tiled as "JSON map") ---
    this.load.tilemapTiledJSON('mall-map', mallMapJsonUrl);

    // --- UI atlas (buttons, icons, HUD frames) ---
    this.load.atlas('ui', uiPng, uiJsonUrl);
  }

  create() {
    this.scene.start('MenuScene');
  }
}
