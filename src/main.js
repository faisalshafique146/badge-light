import Phaser from 'phaser';

import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import UIScene from './scenes/UIScene.js';
import portalBridge from './platform/PortalBridge.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 320,
  height: 288,
  pixelArt: true,
  banner: false,
  render: {
    // pixelArt: true already implies antialias: false and roundPixels:
    // true internally, but set explicitly rather than relying on that
    // implicit behavior — this is the setting that stops character
    // and tile art from shimmering/blurring once FIT scales the
    // canvas by a non-integer factor.
    roundPixels: true,
    antialias: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    // NO_CENTER: centering is handled entirely by CSS flexbox in
    // index.html. Letting Phaser also position the canvas via
    // CENTER_BOTH's own absolute-position math creates two competing
    // centering calculations that can disagree by a few pixels.
    autoCenter: Phaser.Scale.NO_CENTER,
    // Rounds the canvas's CSS pixel size to a whole number, which
    // combined with render.roundPixels keeps sprite edges crisp at
    // scale factors that aren't exact integers (e.g. a 4:3 tablet
    // viewport scaling 320x288 by 2.667x).
    autoRound: true,
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene, UIScene],
};

async function startGame() {
  await portalBridge.init();
  portalBridge.loadingStart();
  const game = new Phaser.Game(config);

  // Safari/iOS can suspend Web Audio after an interruption. Resuming from
  // the next real player gesture keeps synthesized effects working after the
  // player returns from another app, a phone call, or a portal overlay.
  const resumeAudio = () => {
    const context = game.sound?.context;
    if (context?.state === 'suspended') context.resume().catch(() => {});
  };
  document.addEventListener('touchend', resumeAudio, { passive: true });
  document.addEventListener('click', resumeAudio, { passive: true });
}

startGame();
