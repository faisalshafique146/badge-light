# Badge Light

## Description

Badge Light is a top-down 2D survival game built in Phaser 3. You play a stock clerk closing up a mall alone after hours, armed with only a broom, a price scanner, and a badge light that slowly drains as you play. Enemies — cracked mannequins that chase on detection and feral shopping carts that dash in short telegraphed bursts — spawn from off-screen at an interval that ramps up the longer you survive. Fight back with a short-range broom swipe or a pooled ranged scanner shot, collect snacks and batteries dropped by defeated enemies, and refill your light at directory kiosks (which also count toward your score for keeping them powered). Win by surviving a three-minute countdown to "opening time"; lose if your HP reaches zero first.

## How to play

**Objective:** Survive until the countdown timer reaches "opening time." If your HP hits zero before then, it's game over.

**Controls:**

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys | On-screen d-pad |
| Broom swipe (melee) | SPACE | B button |
| Price scanner (ranged) | SPACE (after switching) | S button |
| Switch weapon | X | — (both weapons have dedicated buttons) |
| Activate kiosk | Z (stand near a kiosk) | — |
| Feed battery to kiosk | C (kiosk must be active) | — |

**Flow:**
1. On-screen instructions appear at the start of every run — dismiss with any key or tap to begin.
2. Explore the mall, fight or avoid enemies, and manage your badge light meter (visible in the HUD).
3. Kill enemies for a chance to drop a snack (restores HP) or a battery (restores scanner ammo and can be fed to kiosks).
4. Activate a kiosk (Z) and feed it batteries (C) to refill your light and rack up score.
5. Survive to the countdown's end to win, or run out of HP to lose. Restart instantly from the end screen with ENTER or the Restart button.

## Features

- **Two distinct enemy types** with different movement/attack patterns — a slow melee chaser and a fast dashing enemy with a telegraphed wind-up.
- **Dual weapon system** — melee and ranged, each with independent cooldowns, damage, and range, switchable on the fly.
- **Dynamic light-management mechanic** — a draining visibility radius that must be actively managed via a kiosk-refill loop, with a low-light warning cue.
- **Escalating spawner** — enemy spawn rate ramps up over time, capped at a max concurrent count, for a building difficulty curve.
- **Loot and scoring system** — weighted item drops and a score tracked across enemies defeated and kiosks kept powered.
- **Full HUD** — health, battery count, scanner ammo, and countdown timer, all updated via an event-driven UI layer.
- **Screen shake, hit-stop, and particle effects** on hits, kills, and pickups for combat feedback.
- **Responsive scaling** — playable across desktop, tablet, and mobile aspect ratios, with on-screen touch controls that appear automatically on touch devices.
- **Single-file, self-contained build** — all assets (art and audio) embedded as base64, no external requests, under 5MB.

## Local setup

```bash
npm install
npm run dev      # starts a local dev server with hot reload, http://localhost:5173
npm run build    # produces dist/index.html — a single self-contained file with all assets embedded as base64
```

No other setup or environment variables are required.

## Assumptions, trade-offs, and improvements

**Difficulty curve favors a gentle opening.** The enemy spawner starts at a 4-second interval and ramps down to a 1.2-second floor over 90 seconds, capped at 12 concurrent enemies. This gives a new player their first 20–30 seconds to learn movement, the light meter, and the two weapons before the pressure ramps up.

**A timed win condition was chosen over endless survival.** Endless survival needs an ever-escalating difficulty curve to stay interesting, which either plateaus and gets boring or spirals into unfair territory with no natural endpoint. A fixed "survive to sunrise" countdown gives a concrete, visible goal, lets the spawner's ramp be tuned against a known endpoint, and matches the game's premise directly.

**All art and audio are original**, created specifically for this project rather than sourced from a third-party pack — see the Assets section below.

**With more time, I'd improve:**
- **Enemy variety** — a third enemy archetype (e.g. one with a ranged attack, or one that actively drains the light meter on proximity) to add more texture to later waves.
- **More environment zones** — the current map is a single room; distinct zones (food court, electronics, stockroom) with their own dressing and spawn weighting would reduce repetition across playthroughs.
- **Real sound design and music** — current audio cues are synthesized tones rather than recorded/produced sound effects or a music track.
- **Mobile control polish** — the on-screen touch controls work but haven't been tuned on a real device (button sizing, deadzone, haptics).

## Assets

All character, enemy, environment, and UI art in this project was created specifically for this game — no third-party or licensed asset packs are used, so there are no attribution requirements. All audio is synthesized at runtime rather than using external sound files.