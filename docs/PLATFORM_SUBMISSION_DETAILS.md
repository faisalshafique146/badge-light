# Badge Light platform submission details

Checked against the official portal documentation on 2026-09-14. Recheck the linked requirements immediately before submission because portal forms and policies can change.

## Mobile and responsive status

Badge Light is mobile-responsive and touch-enabled:

- Phaser `FIT` scaling preserves the 320 x 288 playfield without stretching it.
- The canvas re-centers when the browser or portal iframe changes size.
- Touch devices receive a large directional pad, dedicated broom and scanner buttons, a contextual USE button, plus pause and sound controls.
- Browser scrolling, text selection, double-tap selection, and overscroll gestures are suppressed inside the game.
- CSS safe-area padding keeps the canvas clear of phone notches and rounded screen edges.
- A user touch or click resumes Web Audio after an iOS interruption.
- The game pauses when its tab becomes hidden and does not include its own fullscreen control.

Recommended orientation: **Landscape**. Portrait remains playable with unused space above and below the preserved game area, but landscape gives the controls more physical room.

Before publication, test the uploaded portal preview on at least one iPhone/Safari device and one Android/Chrome device. Automated checks cannot reproduce every browser toolbar, notch, gesture, or audio-interruption behavior.

## Shared product facts

| Field | Value |
|---|---|
| Title | Badge Light |
| Developer | `[YOUR STUDIO OR DISPLAY NAME]` |
| Version | 0.1.0 web release |
| Genre | Action / Survival |
| Players | Single-player |
| Language | English |
| Session length | Approximately 1-3 minutes |
| Orientation | Landscape |
| Native game size | 320 x 288, responsive FIT scaling |
| Input | Keyboard and touchscreen |
| Age/content | Mild fantasy combat; no blood, gore, gambling, chat, purchases, or user-generated content |
| Backend | None operated by the developer |
| Save data | Best score, runs played, and mute setting |
| Contact | `[PUBLIC SUPPORT EMAIL]` |
| Privacy URL | `[PUBLISHED PRIVACY POLICY URL]` |

## itch.io fields

Official references: [HTML5 uploads](https://itch.io/docs/creators/html5), [first project page](https://itch.io/docs/creators/getting-started), and [quality guidelines](https://itch.io/docs/creators/quality-guidelines).

| Form field | Enter or select |
|---|---|
| Title | Badge Light |
| Project URL | `badge-light` if available |
| Classification | Games |
| Kind of project | HTML |
| Release status | Released |
| Pricing | $0 or donate |
| Upload | `release/badge-light-itch.zip` |
| Upload option | This file will be played in the browser |
| Embed mode | Embed in page |
| Embed size | 800 x 720 |
| Mobile friendly | Enabled |
| Fullscreen button | Enabled |
| Scrollbars | Disabled |
| Click to play | Enabled |
| Cover | `release/store-assets/itch-cover-630x500.png` |
| Genre | Action |
| Language | English |
| Inputs | Keyboard, touchscreen |
| Accessibility | Leave unsupported options unchecked |
| AI disclosure | AI-assisted graphics: promotional covers only |

Use no more than 10 accurate tags: `Survival`, `Horror`, `Pixel Art`, `Arcade`, `Top-Down`, `Score Attack`, `Singleplayer`, `Short`, `Touch-Friendly`, `Keyboard`.

### itch.io short description

Survive a three-minute closing shift in a dark mall. Sweep back haunted mannequins, scan threats from range, and keep your badge light alive.

### itch.io page description

The mall is closed. The displays are moving. Your badge light is fading.

**Badge Light** is a compact top-down survival game about making it through one impossible closing shift. Fight cracked mannequins and possessed shopping carts with a close-range broom or limited-ammo price scanner. Collect snacks and batteries, reactivate four directory kiosks, and manage the shrinking circle of light around you.

**How to play**

- Move with Arrow keys or WASD.
- Attack with Space and switch weapons with X.
- Near a kiosk, press Z to activate it or C to feed it a battery.
- Press P to pause and M to mute.
- On phones and tablets, use the on-screen directional, weapon, and USE buttons.

Defeat enemies for 100 points, power each unique kiosk for 250 points, and survive the full shift for a 1,000-point bonus. Your best score is saved in the browser.

**Contact:** `[PUBLIC SUPPORT EMAIL]`

**AI disclosure:** The storefront cover images were created with OpenAI image generation using Badge Light's original in-game sprites and menu as references. The generated images are promotional artwork and do not replace or alter the artwork inside the game.

Recommended gallery order:

1. `release/gameplay-preview.png`
2. `release/victory-preview.png`
3. `release/menu-preview.png`

## CrazyGames fields and compliance

Official references: [requirements overview](https://docs.crazygames.com/requirements/intro/), [technical and mobile requirements](https://docs.crazygames.com/requirements/technical/), [gameplay requirements](https://docs.crazygames.com/requirements/gameplay/), [advertising requirements](https://docs.crazygames.com/requirements/ads/), and [cover/video requirements](https://docs.crazygames.com/requirements/game-covers/).

| Submission item | Value or status |
|---|---|
| Game file | `release/badge-light-crazygames.zip` |
| Category | Action |
| Orientation | Landscape |
| Mobile support | Yes |
| Controls | Keyboard and touchscreen |
| Initial download | About 1.63 MB; below the 20 MB mobile-homepage limit |
| File count | 1 game file; below the 1,500-file limit |
| Age suitability | Intended to fit PEGI 12 or below |
| External ads | None |
| External login | None |
| Cross-promotion | None |
| Progress save | Yes: CrazyGames Data module when active |
| SDK | CrazyGames HTML5 SDK v3 |
| Gameplay events | Start/stop integrated |
| Loading events | Start/stop integrated |
| Completion event | 100% reported after a successful shift |
| Midgame ad | Requested only after a run ends; input and audio are blocked during the request |
| Launch ad | Not requested by the game |
| Fullscreen button | None; the portal supplies fullscreen |

### CrazyGames description

Survive the night shift in a haunted mall. Fight cracked mannequins and possessed shopping carts with a broom and price scanner while your only safe circle of light slowly fades. Collect batteries, power four directory kiosks, and reach opening time in this fast three-minute survival challenge.

### CrazyGames controls

- Move: Arrow keys or WASD
- Attack: Space
- Switch weapon: X
- Activate kiosk: Z
- Feed battery to kiosk: C
- Pause: P
- Mute: M
- Mobile: on-screen directional pad, Broom, Scanner, and USE buttons

### CrazyGames cover assets

- Landscape: `release/store-assets/crazygames-cover-landscape-1920x1080.png`
- Portrait: `release/store-assets/crazygames-cover-portrait-800x1200.png`
- Square: `release/store-assets/crazygames-cover-square-800x800.png`

### Required CrazyGames preview videos — still to record

CrazyGames currently requires both a landscape 16:9 and portrait 2:3 silent preview. Each should be 15-20 seconds, under 50 MB, open on the matching static cover, omit the mouse cursor and promotional text, and show real-speed gameplay.

Suggested 18-second shot list:

1. 0-1 seconds: matching static cover.
2. 1-6 seconds: clerk moving through the dark mall as enemies approach.
3. 6-11 seconds: one broom hit followed by a scanner shot.
4. 11-15 seconds: collect a battery and power/feed a kiosk so the light expands.
5. 15-18 seconds: a busy combat moment with the timer and HUD visible.

Suggested export names: `crazygames-preview-landscape-1920x1080.mp4` and `crazygames-preview-portrait-720x1080.mp4`.

## Kongregate fields and compliance

Official reference: [Kongregate upload and media requirements](https://blog.kongregate.com/hc/en-us/articles/44404778564109-UPLOAD-How-to-complete-the-game-information-Step-3-Alpha).

| Form field | Enter or select |
|---|---|
| Title | Badge Light |
| Category | Action |
| Description | Use the text below |
| Game type | HTML5/WebGL |
| Game file | `release/badge-light-kongregate.zip` |
| Minimum size | 640 x 576 |
| Maximum size | 800 x 720 |
| Scale to fit container | Enabled |
| Game icon | `release/store-assets/kongregate-icon-630x500.png` |
| Exclusive to Kongregate | Unchecked |
| Virtual Goods / Kreds | Unchecked |
| Third-party ad system | No |
| Outside login or purchases | No |
| API callback URL | Leave blank |
| Collaborators/testers | Optional |

### Kongregate description and instructions

**Controls first:** Move with Arrow keys or WASD. Press Space to attack, X to switch between the broom and scanner, Z to activate a nearby kiosk, C to feed an active kiosk a battery, P to pause, and M to mute. Touch devices use the on-screen controls.

Survive a three-minute closing shift in a haunted mall. Defeat cracked mannequins and charging shopping carts, collect snacks and batteries, keep your badge light alive, and power all four directory kiosks before opening time. Each enemy is worth 100 points, each unique kiosk is worth 250 points, and surviving earns a 1,000-point bonus.

Promotional cover art was AI-assisted using the game's original sprites as references. The gameplay artwork itself is unchanged.

### Kongregate media

- Icon: `release/store-assets/kongregate-icon-630x500.png` (630 x 500; minimum is 500 x 400)
- Screenshot 1: `release/gameplay-preview.png` (1280 x 720)
- Screenshot 2: `release/victory-preview.png` (1280 x 720)
- Screenshot 3: `release/menu-preview.png` (1280 x 720)

### Kongregate statistics

Create the names exactly as written because the build submits these identifiers:

| Name | Type | Description |
|---|---|---|
| `Score` | Max | Highest total score earned in one shift |
| `EnemiesDefeated` | Max | Most enemies defeated in one shift |
| `KiosksPowered` | Max | Most unique directory kiosks powered in one shift; maximum 4 |
| `ShiftCompleted` | Add | Number of three-minute shifts successfully completed |

The Kongregate-specific build deliberately excludes the CrazyGames SDK, advertising, external authentication, and payments. You must personally review and accept Kongregate's upload agreement and confirm that you hold the necessary distribution rights.

## Remaining owner-supplied information

Replace these before publishing:

- `[YOUR STUDIO OR DISPLAY NAME]`
- `[PUBLIC SUPPORT EMAIL]`
- `[PUBLISHED PRIVACY POLICY URL]`
- The legal name, tax information, identity verification, and payment details requested privately by each portal

Do not place private tax, identity, or payment information inside this repository.
