# Contributing to Patakha Panic

Keep work in a focused branch and commit at a working, tested milestone.

## Module ownership

- `src/physics.js`: Matter.js bodies, fixed timestep, damage, special abilities and shot lifecycle.
- `src/levels.js`: piece geometry, material choices, unlocks, hints and shot budgets.
- `src/art.js`: scene drawing, supplied cracker atlas, particles, camera and fireworks.
- `src/ui.js` and `src/styles.css`: menus, HUD, mobile layout and accessible buttons.
- `src/audio.js`: original Web Audio music and effects.
- `src/main.js`: pointer/keyboard input, integration and screen transitions.
- `src/progress.js`: local persistence, awards and best-score logic.

The logical world is 1920 × 960, with ground at Y=780 and the launcher at (190,510). `src/config.js` is the shared source for world dimensions and maximum shot power. Pointer coordinates must use the renderer's `toWorld()` method so letterboxing and different screen sizes remain accurate.

## Before a milestone

1. Run `pnpm test` and `pnpm build`.
2. Play at least one level using a real drag and release. Check ability activation, shot settling, retry and win screens.
3. Check a phone-sized landscape viewport at UI sizes 1 and 5 (Settings gear). Buttons and the aiming arc should remain readable and touchable; UI size must persist after reload without changing shot power or resetting a paused shot.
4. If you change levels or damage balance, prove each affected level can clear 90% within its budget. Verify weak shots, unboosted impacts, misplaced shots and wrong-material matchups do not clear a skyline automatically; later levels should need multiple deliberate shots.
5. Confirm start, level selection, pause/resume, restart, audio toggles and progress after a reload.

Do not count decorative or static terrain as part of target destruction. Damaged bodies retain physical collisions so rubble can create a real chain reaction. Score should never be awarded twice for the same destroyed piece. Blast damage and impulse must reflect delivered shot power, and small shifts or tilts must never count as an entire piece being destroyed. A genuinely collapsed building must earn full destruction even if its rubble still has material health; test rubble piles, upright surviving structures and partial collapses separately.

The supplied video is the scene background. Keep the sky and long shot corridor transparent: do not cover the video with another skyline or broad dark wash. Draw foreground objects and effects with the pixel renderer. Decorative foreground diyas are intentionally omitted; earned diya awards remain in the menus.
