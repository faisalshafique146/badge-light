const STORAGE_PREFIX = 'badge-light:';

/**
 * Keeps portal SDK calls out of gameplay code. Generic and itch.io builds are
 * local-only. CrazyGames and Kongregate receive their SDK script at build time.
 */
class PortalBridge {
  constructor() {
    this.portal = typeof __PORTAL__ === 'string' ? __PORTAL__ : 'generic';
    this.active = false;
    this.sdk = null;
    this.kongregate = null;
    this.portalMuted = false;
    this.audioPolicyListeners = new Set();
    this.crazySettingsListener = null;
  }

  async init() {
    if (this.portal === 'crazygames') {
      await this.initCrazyGames();
    } else if (this.portal === 'kongregate') {
      await this.initKongregate();
    }
  }

  async initCrazyGames() {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;

    try {
      await sdk.init();
      if (sdk.environment === 'disabled') return;

      this.sdk = sdk;
      this.active = true;
      this.updatePortalMute(Boolean(sdk.game.settings?.muteAudio));

      this.crazySettingsListener = (settings) => {
        this.updatePortalMute(Boolean(settings?.muteAudio));
      };
      sdk.game.addSettingsChangeListener?.(this.crazySettingsListener);
    } catch (error) {
      console.warn('CrazyGames SDK initialization failed; continuing without it.', error);
    }
  }

  async initKongregate() {
    if (!window.kongregateAPI) return;

    try {
      window.kongregateAPI.loadAPI(() => {
        this.kongregate = window.kongregateAPI.getAPI();
        this.active = Boolean(this.kongregate);
      });
    } catch (error) {
      console.warn('Kongregate API initialization failed; continuing without it.', error);
    }
  }

  updatePortalMute(muted) {
    this.portalMuted = muted;
    this.audioPolicyListeners.forEach((listener) => listener(muted));
  }

  onAudioPolicyChange(listener) {
    this.audioPolicyListeners.add(listener);
    listener(this.portalMuted);
    return () => this.audioPolicyListeners.delete(listener);
  }

  mustMuteAudio() {
    return this.portalMuted;
  }

  loadingStart() {
    if (this.portal === 'crazygames' && this.active) this.sdk.game.loadingStart();
  }

  loadingStop() {
    if (this.portal === 'crazygames' && this.active) this.sdk.game.loadingStop();
  }

  gameplayStart() {
    if (this.portal === 'crazygames' && this.active) this.sdk.game.gameplayStart();
  }

  gameplayStop() {
    if (this.portal === 'crazygames' && this.active) this.sdk.game.gameplayStop();
  }

  reportRun({ outcome, totalScore, enemiesDefeated, kiosksPowered }) {
    if (this.portal === 'crazygames' && this.active && outcome === 'win') {
      this.sdk.game.reportGameCompletedPercentage?.(100);
      this.sdk.game.happytime?.();
    }

    if (this.portal === 'kongregate' && this.active) {
      this.kongregate.stats.submit('Score', totalScore);
      this.kongregate.stats.submit('EnemiesDefeated', enemiesDefeated);
      this.kongregate.stats.submit('KiosksPowered', kiosksPowered);
      if (outcome === 'win') this.kongregate.stats.submit('ShiftCompleted', 1);
    }
  }

  showMidgameAd({ onStarted, onFinished } = {}) {
    if (this.portal !== 'crazygames' || !this.active) return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (shown) => {
        if (settled) return;
        settled = true;
        onFinished?.();
        resolve(shown);
      };

      try {
        this.sdk.ad.requestAd('midgame', {
          adStarted: () => onStarted?.(),
          adFinished: () => finish(true),
          adError: () => finish(false),
        });
      } catch (error) {
        console.warn('Midgame ad request failed; continuing the game.', error);
        finish(false);
      }
    });
  }

  storage() {
    if (this.portal === 'crazygames' && this.active && this.sdk.data) return this.sdk.data;
    return window.localStorage;
  }

  getNumber(key, fallback = 0) {
    try {
      const raw = this.storage().getItem(`${STORAGE_PREFIX}${key}`);
      if (raw === null) return fallback;
      const value = Number(raw);
      return Number.isFinite(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  setNumber(key, value) {
    try {
      this.storage().setItem(`${STORAGE_PREFIX}${key}`, String(value));
    } catch (error) {
      console.warn(`Unable to save ${key}.`, error);
    }
  }

  getBoolean(key, fallback = false) {
    try {
      const value = this.storage().getItem(`${STORAGE_PREFIX}${key}`);
      return value === null ? fallback : value === 'true';
    } catch {
      return fallback;
    }
  }

  setBoolean(key, value) {
    try {
      this.storage().setItem(`${STORAGE_PREFIX}${key}`, String(Boolean(value)));
    } catch (error) {
      console.warn(`Unable to save ${key}.`, error);
    }
  }
}

export default new PortalBridge();
