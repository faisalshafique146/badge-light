# Badge Light: non-exclusive portal release

This release intentionally keeps portal integrations isolated. Each portal gets its own build, and none of the builds contains an exclusivity lock or redirects players to another storefront.

## Release contents

| Destination | Upload file | Integration |
|---|---|---|
| itch.io | `release/badge-light-itch.zip` | Standalone HTML5 build |
| CrazyGames | `release/badge-light-crazygames.zip` | CrazyGames SDK v3 |
| Kongregate | `release/badge-light-kongregate.zip` | Kongregate JavaScript API |

Every ZIP contains `index.html` at its root. The game has a native 320 x 288 landscape playfield and scales responsively. See `docs/PLATFORM_SUBMISSION_DETAILS.md` for exact form values, platform-specific copy, compliance checks, and remaining media work.

## Before publishing

1. Replace every bracketed placeholder in `docs/PRIVACY_TEMPLATE.md`, publish that text at a public URL, and put the URL in each listing where requested.
2. Confirm you own or have permission to distribute all code, art, fonts, names, and audio in the upload.
3. Create the developer accounts and complete each portal's tax, identity, payment, and contract steps yourself.
4. Play the final upload in the portal's preview or unpublished mode on desktop and a real touch device before making it public.

## itch.io

1. Create a new project and choose **HTML** as the project kind.
2. Upload `release/badge-light-itch.zip` and mark it as the file to be played in the browser.
3. Use an 800 x 720 embedded frame, allow fullscreen, and enable the mobile-friendly option after checking it on a phone.
4. Upload `release/store-assets/itch-cover-630x500.png` as the cover.
5. Paste the itch.io text from `docs/PLATFORM_SUBMISSION_DETAILS.md`, choose the listed tags, and use **$0 or donate**. itch.io currently treats browser-playable HTML5 payments as donations; paid access requires changing the project to Downloadable.
6. Keep the page restricted or in draft while testing, then publish it publicly.

## CrazyGames

1. Create a game in the CrazyGames Developer Portal and upload `release/badge-light-crazygames.zip`.
2. Upload all three required cover formats:
   - `crazygames-cover-landscape-1920x1080.png`
   - `crazygames-cover-portrait-800x1200.png`
   - `crazygames-cover-square-800x800.png`
3. Record the two required silent 15-20 second preview videos described in `docs/PLATFORM_SUBMISSION_DETAILS.md` (landscape 16:9 and portrait 2:3).
4. Use the title, description, controls, and tags from `docs/PLATFORM_SUBMISSION_DETAILS.md`.
5. The build already reports loading and gameplay state, obeys the portal mute setting, stores progress through the data module when available, reports a completed shift, and requests a midgame ad only after a run ends.
6. Test with the CrazyGames preview tooling. Confirm that game audio pauses during ads and that restart becomes available when an ad finishes or errors.
7. Submit for review. Revenue activation and launch-ad behavior are controlled by CrazyGames and your portal eligibility; this build does not force an ad at startup.

## Kongregate

1. Add a new HTML5 game and upload `release/badge-light-kongregate.zip` as the game file.
2. If dimension fields are shown, use 640 x 576 minimum and 800 x 720 maximum with **Scale to fit container** enabled.
3. Upload `release/store-assets/kongregate-icon-630x500.png` as the game icon and the three files listed in `docs/PLATFORM_SUBMISSION_DETAILS.md` as screenshots.
4. Configure these statistics before launch:

| Statistic | Suggested type | Submitted value |
|---|---|---|
| `Score` | Max | Total points from one run |
| `EnemiesDefeated` | Max | Enemies defeated in one run |
| `KiosksPowered` | Max | Unique kiosks powered in one run |
| `ShiftCompleted` | Add | `1` for each successful shift |

5. Paste the listing copy, including its AI-assisted promotional-art disclosure, and complete the preview/publish workflow.
6. In preview, finish or lose one run and verify statistic submissions in the browser console or portal tools.

## Rebuild and package

```bash
npm run build
npm run build:portals
```

After rebuilding, regenerate the ZIP files so they contain the latest `index.html`. The SHA-256 checksums in `release/SHA256SUMS.txt` identify the exact packages tested for this release.

## Monetization expectation

The practical non-exclusive rollout is: publish on itch.io first for tips or direct payments, submit the SDK-enabled build to CrazyGames for advertising review, and mirror the game on Kongregate for an additional audience and statistics-based retention. Portal acceptance and earnings are not guaranteed; both depend on approval, traffic, player retention, geography, ad availability, and completed payment onboarding.
