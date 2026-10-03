# Patakha Panic

**Aim. Ignite. Bring the house down.**

A playable Diwali physics puzzle game with a pixel art foreground and the supplied animated Diwali city video. Launch four different firecrackers across a long obstacle course into eight empty skylines, choose the right material matchup, discover their load-bearing supports, and clear at least 90% of each structure. Made with vanilla JavaScript, Canvas 2D, Vite, and Matter.js 0.20.0.

## Run

Requires Node.js 20.19+ (or 22.12+) and pnpm. With npm, `npm install` and `npm run dev` work too.

```sh
corepack enable
pnpm install
pnpm dev
```

Open the local URL printed by Vite. The Windows `Start-Game.ps1` script can use an installed Node.js or the bundled workspace runtime. Browser audio starts after the first interaction.

```sh
pnpm test
pnpm build
pnpm preview
```

For the desktop browser smoke check, leave `pnpm dev` running and use `pnpm test:e2e` in a second terminal. Windows uses the installed Chrome browser. On other systems run `pnpm exec playwright install chromium` first, or set `CHROME_PATH` to your browser executable. `GAME_URL` overrides the default local URL; screenshots are saved in ignored `test-results/`.

The `dist/` folder is a complete static game. Serve it over HTTP or upload it to a static hosting provider. Relative asset paths support subdirectory hosting. The production bundle includes the supplied video and cracker illustration; it does not fetch a physics engine or audio from a CDN.

## Controls

| Action | Mouse / touchscreen | Keyboard |
| --- | --- | --- |
| Aim | Grab the cracker at the left rooftop, drag backwards | Arrow keys adjust angle/power |
| Fire | Release the drag | Space |
| Activate ability | Tap anywhere in the scene during flight, or the ability button | Space |
| Choose cracker | Select an unlocked cracker in the bottom tray | 1–4 |
| Pause / resume | Pause button / resume button | Escape |
| Restart | Restart button | R |

Rocket gets one precise, piercing mid-air boost. Sutli Bomb has a wide heavy blast. Chakri spins and rolls through street-level supports. Ladi sends a timed chain of small explosions towards neighbouring buildings. Abilities unlock with short illustrated explanations.

Shots are limited per level. The next shot becomes available after impact and a bounded settling period. Targets sit over 1,000 world pixels from the launcher, behind obstacles that require different trajectories. Aim at striped weak supports; wider bases, additional piers, reinforced floors and independent towers need deliberate shots. The preview uses the same gravity, drag and fixed timestep as the physical projectile.

Blast damage, radius and impulse scale with shot power. Weak throws cannot produce a full-strength explosion or an automatic skyline collapse. Small shifts and rocking do not count as destroyed structure; substantial falling rubble and hard impacts still create chain reactions.

Breaking a support wakes the connected structure. Unsupported floors and tanks continue falling under gravity before the next shot; settled rubble remains physical and can damage neighbouring targets.

| Material | Effective choice | What it resists |
| --- | --- | --- |
| Wood | Chakri and Ladi; precise Rocket support shots | Requires enough power to reach and break the support |
| Brick | Sutli Bomb | Chakri and ordinary Rockets have reduced damage |
| Concrete | Boosted Rocket into an exposed pier; concentrated Sutli blast | Chakri, Ladi and ordinary Rockets |
| Steel | Boosted Rocket | Chakri and Ladi; Sutli damage is reduced |

The readout beneath the level hint shows the selected cracker's damage multiplier for each material; tray buttons also provide matchup tooltips. Rocket values switch after its piercing boost is activated. The help screen includes the full material guide. Building textures and resistance badges make the target composition visible before launching.

## Eight skylines

| Location | Levels | New challenge |
| --- | --- | --- |
| Gully Warm-Up | First Spark; Good Neighbours | Long shots, low barricade, overhead sign and wider support bases |
| Terrace Trouble | Tank You Very Much; Balcony Dominoes | Arch, stepped wall, terraced buildings, reinforced piers and rooftop tanks |
| Bazaar Blast | Shop, Drop & Roll; Chain Reaction | Ramp, staggered walls, wood and brick shopfronts, steel-backed targets |
| Skyline Showdown | Bridge over Boom; The Grand Dhamaka | Steel canopies, independent reinforced towers and mixed-material load paths |

At 90% destruction you earn a diya and unlock the next level. Two diyas reward higher destruction or efficiency. Three require at least 97% destruction plus either a shot count within the level's par or at least two unused crackers. A three-diya finish fills the sky with a firework celebration. Score, best diyas, unlocked levels and separate music/sound preferences persist in local storage. The game remains playable when browser storage is unavailable.

## Assets and audio

- `public/assets/diwali-background.mp4`: an unchanged copy of the supplied `Diwali_Dynamic_Background.mp4`, continuously looped and muted. Transparent sky and a minimal edge vignette leave the original city visible.
- `public/assets/crackers-reference.png`: the supplied four-cracker reference, sampled directly as an atlas without replacing the original designs.
- Pixel art launcher, material textures, obstacles, rubble, sparks and celebration fireworks: Canvas 2D drawings. Decorative foreground diyas have been removed; earned diya awards remain in the menus.
- Original festive pentatonic instrumental loop and launch, explosion, crumbling and celebration sounds: synthesized locally with Web Audio. Independent music and sound switches.

## Contributing

See [COLLABORATION.md](COLLABORATION.md) for module boundaries and [CONTRIBUTING.md](CONTRIBUTING.md) for the verification workflow. Milestones are committed separately so engine, art and interface changes can be reviewed and developed independently.
