# SUNCOAST: HEATLINE — the game

Static files, no build step. Serve this folder with any static HTTP server
(`node ../serve.ts` from the repository root serves it on
http://localhost:8080) and open `index.html` in desktop Chrome.

- `index.html` — page shell and HUD.
- `src/config.js` — world layout, jobs, economy, screenshot staging.
- `src/world.js` — sunset sky, ocean, beach, city, landmarks.
- `src/vehicles.js` — hero coupe, traffic, police, SKY-1 heli, walkers,
  on-foot player, yard enemies.
- `src/audio.js` — WebAudio synthesis: engine, gunfire, radio.
- `src/main.js` — boot, loop, driving, missions, police, HUD, cameras.
- `vendor/three.module.min.js` — Three.js r160 (MIT, see
  `vendor/LICENSE-threejs.txt`).

Nothing is fetched over the network at runtime: every texture is painted
on a canvas, every sound is synthesised, every library is vendored.
