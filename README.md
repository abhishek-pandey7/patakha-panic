# Patakha Panic

**Aim. Ignite. Bring the house down.**

A playable Diwali physics puzzle game. Launch four different firecrackers into eight empty illustrated skylines, discover their weak supports, and clear at least 90% of each structure. Made with vanilla JavaScript, Canvas 2D, Vite, and Matter.js 0.20.0.

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

Shots are limited per level. The next shot becomes available after impact and a bounded settling period. Aim at striped weak supports; heavy concrete is harder to damage directly, but falling concrete helps smash the neighbouring structure. The preview uses the same gravity, drag and fixed timestep as the physical projectile.

## Eight skylines

| Location | Levels | New challenge |
| --- | --- | --- |
| Gully Warm-Up | First Spark; Good Neighbours | Timber supports, precise Rocket shots |
| Terrace Trouble | Tank You Very Much; Balcony Dominoes | Concrete floors, balconies, rooftop water tanks; Sutli Bomb |
| Bazaar Blast | Shop, Drop & Roll; Chain Reaction | Closely packed shops; Chakri and Ladi |
| Skyline Showdown | Bridge over Boom; The Grand Dhamaka | Tall, heavy structures and careful ability timing |

At 90% destruction you earn a diya and unlock the next level. Two diyas reward higher destruction or efficiency. Three require at least 97% destruction and a shot count within the level's par, or at least two unused crackers. A three-diya finish fills the sky with a firework celebration. Score, best diyas, unlocked levels and separate music/sound preferences persist in local storage. The game remains playable when browser storage is unavailable.

## Assets and audio

- `public/assets/diwali-background.mp4`: the supplied `Diwali_Dynamic_Background.mp4`, continuously looped, muted and softened beneath the foreground.
- `public/assets/crackers-reference.png`: the supplied four-cracker reference, sampled directly as an atlas without replacing the original designs.
- Foreground city, material textures, lanterns, fairy lights, diyas, smoke, particles and celebration fireworks: Canvas 2D drawings.
- Original festive pentatonic instrumental loop and launch, explosion, crumbling and celebration sounds: synthesized locally with Web Audio. Independent music and sound switches.

## Contributing

See [COLLABORATION.md](COLLABORATION.md) for module boundaries and [CONTRIBUTING.md](CONTRIBUTING.md) for the verification workflow. Milestones are committed separately so engine, art and interface changes can be reviewed and developed independently.
