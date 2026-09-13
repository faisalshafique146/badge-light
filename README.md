# Badge Light

Badge Light is a compact top-down survival game built with Phaser 3. You are the last stock clerk in a dark mall, armed with a broom, a price scanner, and a badge light that is always running down. Defeat cracked mannequins and possessed shopping carts, collect supplies, power four directory kiosks, and survive the three-minute shift.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys or WASD | On-screen directional pad |
| Use broom / scanner | Space | Broom or scanner button |
| Switch weapon | X | Choose either weapon button |
| Activate or feed a nearby kiosk | Z to activate, C to feed | USE button |
| Pause / resume | P | PAUSE button |
| Mute / unmute | M | MUTE button |

Defeated enemies are worth 100 points, each uniquely powered kiosk is worth 250 points, and completing the shift earns a 1,000-point bonus. Best score and mute preference are saved locally; the CrazyGames build uses CrazyGames data storage when its SDK is active.

## Local development

```bash
npm install
npm run dev
npm run build
```

`npm run build` creates a single-file generic build at `dist/index.html`.

## Non-exclusive portal builds

```bash
npm run build:portals
```

This creates independent single-file builds:

- `release/itch/index.html` - no third-party portal SDK.
- `release/crazygames/index.html` - CrazyGames SDK v3, lifecycle events, mute policy, cloud-compatible storage, completion events, and a midgame ad break between runs.
- `release/kongregate/index.html` - Kongregate JavaScript API and four gameplay statistics.

The game contains no platform exclusivity checks, external account requirement, in-game purchase system, or developer-operated backend. See `docs/PORTAL_RELEASE.md` for the release flow and `docs/PLATFORM_SUBMISSION_DETAILS.md` for exact portal form values, platform-specific listing copy, mobile notes, and compliance checks.

## Assets

The game's art was created specifically for this project and its sound effects are synthesized at runtime. Store-cover artwork prepared for this release is in `release/store-assets`.
