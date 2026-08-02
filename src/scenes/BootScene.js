import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load only the minimal assets needed to render the PreloadScene's
    // loading bar (e.g. a logo or bar frame). Keep this scene lightweight.
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
