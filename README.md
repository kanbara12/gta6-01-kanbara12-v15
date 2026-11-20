# SUNCOAST: HEATLINE

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kanbara12/gta6-01-kanbara12-v15/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kanbara12/gta6-01-kanbara12-v15/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). One sunset,
one fast car, eight jobs, and the whole city of Suncoast watching.

## The game

You drive the HEATLINE GT along a beachfront at golden hour, running cargo
for the fixer **Rae**, sweeping a hostile crew out of the container yard on
foot, and shaking a three-star heat while the police helicopter **SKY-1**
paints you with its spotlight. The loop pays **$22,450** across 8 jobs —
story pay, yard bounties, drift and near-miss bonuses included.

| Job | Title | Pay | What happens |
| --- | --- | --- | --- |
| 1 | A FAVOR IN THE HEAT | $2,500 | Meet Rae at the glowing marker |
| 2 | LOOSE CARGO | $2,500 | Pick up the sealed package |
| 3 | THE QUIET EXIT | $3,000 | Deliver it across town, keep it quiet |
| 4 | STREET SWEEP | $3,500 | Clear the hostile crew in the yard |
| 5 | NO WITNESSES | $4,250 | Reach the garage and lose the heat |
| 6 | LAST LIGHT | $2,000 | Final run at dusk, through roadblocks |
| 7 | THE MARINA SWAP | $1,500 | Case swap at the marina dock |
| 8 | NORTH LIGHT | $1,500 | North-beach run to the lighthouse |

## The world

Suncoast is an original city: a beach road with palms and boardwalk
kiosks, an ocean with a low sun and a glitter path, a ferris wheel, a pier
and a lighthouse, a downtown of lit towers, and an industrial container
yard. Traffic loops the streets, twenty pedestrians stroll the sidewalks
and scatter when you speed past, and the police pursue with
collision-aware steering — units slide sideways instead of stacking into
each other — while SKY-1 circles overhead from three stars up.

## How to play

```
node serve.ts            # serves game/ on http://localhost:8080
```

Open the page in desktop Chrome. No build step, no network: every script,
texture and sound is a file under `game/` or synthesised at runtime.

- **WASD / arrows** — drive or walk
- **E** — enter / exit the car
- **Mouse click** — shoot (on foot)
- **Space** — drift (pays up to $50 per chain step)
- **1–4** — weapons (pistol, SMG, shotgun, bat)
- **Z / X / C** — crew calls: Rae clears a star, Sable marks police, Marlo restores the car
- **R** — next radio station, **M** — mute, **P** — pause, **H** — hide HUD

The HUD shows the job and objective, cash, HP and REP, the wanted stars,
a named police panel with live distances, fuel and condition, the radio and
weapons, and a circular minimap. Progress saves to local storage from the
pause menu.

## Screenshots

Four frames of real gameplay, taken live in Chrome (see `shots.json` for
the staging queries — each is a deterministic `?shot=` scene):

1. `1-start.jpg` — the boardwalk at golden hour, ferris wheel over the ocean
2. `2-play.jpg` — JOB 2/8 at 141 km/h on the beach road, SKY-1 overhead, Rae on the radio
3. `3-chase.jpg` — JOB 5/8 at dusk downtown, three-star heat, drift x3, roadblocks ahead
4. `4-mission.jpg` — JOB 4/8 on foot in the yard, pistol drawn, two of three targets down

## Technical outline

- `game/index.html` — page shell and the full HUD (mission, status, police
  panel, radio/weapons, speedometer, minimap, dialogue, title, pause).
- `game/src/config.js` — world layout, the 8 jobs and their pay, REP and
  wanted curves, and the staged screenshot table. One table owns every
  number the HUD can show.
- `game/src/world.js` — sunset sky shader, animated ocean, beach, city,
  palms, ferris wheel, pier, lighthouse, container yard. All textures are
  painted on canvases at runtime.
- `game/src/vehicles.js` — hero coupe, traffic, police cruisers, the SKY-1
  helicopter with rotor and spotlight cone, pedestrians, the on-foot player
  with pistol and muzzle flash, and yard enemies with health bars.
- `game/src/audio.js` — WebAudio synthesis only: engine hum, gunfire,
  pickups, and three original radio stations.
- `game/src/main.js` — boot, game loop, driving and walking, missions and
  payouts, collision-aware police pursuit, HUD and minimap, cameras, and
  the deterministic `?shot=` staging used for the screenshots.
- `game/vendor/three.module.min.js` — Three.js r160, vendored (MIT, see
  `game/vendor/LICENSE-threejs.txt`).

`main.ts` at the repository root is the hand-in program: it copies `game/`
and `screenshots/` to the output directory and writes `dossier.json` with
the kit's vendored library. It is deterministic — two runs write the same
bytes.

## License

MIT — see `LICENSE`. Three.js is MIT — see
`game/vendor/LICENSE-threejs.txt`.
