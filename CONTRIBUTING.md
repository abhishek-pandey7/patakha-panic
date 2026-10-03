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

The logical world is 1440 × 810, with ground at Y=650 and the launcher at (235,450). Pointer coordinates must use the renderer's `toWorld()` method so letterboxing and different screen sizes remain accurate.

## Before a milestone

1. Run `pnpm test` and `pnpm build`.
2. Play at least one level using a real drag and release. Check ability activation, shot settling, retry and win screens.
3. Check a phone-sized landscape viewport. Buttons and the aiming arc should remain readable and touchable.
4. If you change levels or damage balance, prove each affected level can clear 90% within its budget and that a misplaced shot does not clear it automatically.
5. Confirm start, level selection, pause/resume, restart, audio toggles and progress after a reload.

Do not count decorative or static terrain as part of target destruction. Damaged bodies retain physical collisions so rubble can create a real chain reaction. Score should never be awarded twice for the same destroyed piece.
