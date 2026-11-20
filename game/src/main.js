// SUNCOAST: HEATLINE — boot, loop, driving, missions, police, HUD, shots (v15).
// Plain ES modules, no build step. Runs fully offline on vendored Three.js.

import * as THREE from 'three';
import { WORLD, JOBS, REP_WHILE, REP_FINAL, WANTED_WHILE, CASH_START, YARD_BOUNTY, LOOP_TOTAL, SHOTS, RADIO, WEAPONS, CREW, fmtClock, money, rng32 } from './config.js';
import { buildScene } from './world.js';
import { buildCoupe, buildTraffic, buildPolice, buildHeli, buildWalker, buildPlayer, buildYardEnemy } from './vehicles.js';
import { SoundBank } from './audio.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);
const shot = shotName ? SHOTS[shotName] : null;

const $ = (id) => document.getElementById(id);
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
window.__errors = errors;

// One consistent state object; staging sets it all at once.
const S = {
  job: 1, cash: CASH_START, rep: 0, done: 0, wanted: 0, elapsed: 0,
  speed: 0, speedKmh: 0, fuel: 100, cond: 100, hp: 100,
  driving: false, started: false, paused: false, hudHidden: false,
  targetsDown: 0, targetsTotal: 3, drift: 0, driftCash: 0, nearMiss: 0,
  weapon: 0, radio: 0, playT: 0, complete: false,
};
let heading = 0; // radians; 0 = +z (south), PI = -z (north)
let vel = 0; // m/s along heading
let driftT = 0;
let lastShotT = 0;
let popupTick = -1;

const state = () => ({ cash: S.cash, job: S.job, rep: S.rep, done: S.done, wanted: S.wanted, speedKmh: Math.round(S.speedKmh), playT: S.playT, targets: S.targetsDown });

// Renderer, scene, camera.
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(1280, 720);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.1, 2000);

const world = buildScene(scene, seed);
const audio = new SoundBank();

// Actors.
const hero = buildCoupe();
hero.group.position.set(WORLD.carSpawn.x, 0, WORLD.carSpawn.z);
scene.add(hero.group);

const player = buildPlayer();
player.group.position.set(WORLD.playerSpawn.x, 0, WORLD.playerSpawn.z);
scene.add(player.group);

const heli = buildHeli();
heli.group.visible = false;
scene.add(heli.group);

const traffic = [];
{
  const rnd = rng32(seed + 5);
  const colors = [0x3a6ea8, 0xc8a03a, 0x7a3a8a, 0x3a8a5a, 0xd8d8d8, 0x8a2a2a, 0x2a2a2a, 0xe08a3a];
  for (let i = 0; i < 18; i++) {
    const car = buildTraffic(colors[i % colors.length]);
    const lane = rnd() < 0.5 ? WORLD.beachRoadX - 3.5 : WORLD.beachRoadX + 3.5;
    car.position.set(lane + (rnd() - 0.5) * 2, 0, -600 + rnd() * 1200);
    car.rotation.y = rnd() < 0.5 ? 0 : Math.PI;
    car.userData.speed = 11 + rnd() * 9;
    car.userData.dir = car.rotation.y === 0 ? 1 : -1;
    scene.add(car);
    traffic.push(car);
  }
}
const policeCars = [];
for (let i = 0; i < 4; i++) {
  const p = buildPolice();
  p.visible = false;
  scene.add(p);
  policeCars.push(p);
}
const walkers = [];
{
  const rnd = rng32(seed + 9);
  const cols = [0xd8d8d8, 0x3a6ea8, 0xc85a5a, 0x5aa87a, 0xe0c85a, 0x8a5ac8];
  for (let i = 0; i < 20; i++) {
    const w = buildWalker(cols[i % cols.length]);
    const side = rnd() < 0.5 ? WORLD.beachRoadX - 12 : WORLD.beachRoadX + 12;
    w.group.position.set(side + (rnd() - 0.5) * 3, 0, -560 + rnd() * 1120);
    w.group.userData = { dir: rnd() < 0.5 ? 1 : -1, speed: 1 + rnd() * 1.2, phase: rnd() * 6 };
    scene.add(w.group);
    walkers.push(w);
  }
}
const enemies = [];
{
  const spots = [[-14, -12], [6, 4], [16, -6]];
  for (let i = 0; i < 3; i++) {
    const e = buildYardEnemy(1);
    e.group.position.set(WORLD.yard.x + spots[i][0], 0, WORLD.yard.z + spots[i][1]);
    e.group.rotation.y = Math.PI + (i - 1) * 0.5;
    e.group.visible = false;
    scene.add(e.group);
    enemies.push(e);
  }
}
const roadblocks = [];
for (let i = 0; i < 3; i++) {
  const b = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.1, 0.5),
    new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff5a2a : 0xf2f2f2, roughness: 0.6 }));
  b.visible = false;
  scene.add(b);
  roadblocks.push(b);
}
// Drift smoke puffs.
const smokeTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(220,220,220,0.7)');
  r.addColorStop(1, 'rgba(220,220,220,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const smokePool = [];
for (let i = 0; i < 24; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
  s.scale.set(2, 2, 1);
  scene.add(s);
  smokePool.push({ s, life: 0 });
}
function puff(x, y, z) {
  const p = smokePool.find((q) => q.life <= 0);
  if (!p) return;
  p.s.position.set(x, y, z);
  p.s.material.opacity = 0.6;
  p.life = 0.9;
}

// Input.
const keys = {};
let mouseDown = false;
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  audio.ensure();
  if (e.code === 'Enter' && !S.started) startGame();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyH') toggleHud();
  if (e.code === 'KeyR') { const st = audio.nextStation(); S.radio = audio.station; toast(st.name + ' • ' + st.track); }
  if (e.code === 'KeyM') toast(audio.toggleMute() ? 'MUTED' : 'SOUND ON');
  if (e.code === 'KeyE') tryEnterExit();
  if (e.code >= 'Digit1' && e.code <= 'Digit4') S.weapon = Number(e.code.slice(-1)) - 1;
  if (e.code === 'KeyZ') crewCall('Rae', 'CLEAN SLATE — heat dropped one star');
  if (e.code === 'KeyX') crewCall('Sable', 'EYES UP — police positions marked on the map');
  if (e.code === 'KeyC') crewCall('Marlo', 'PIT STOP — fuel and condition restored');
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', () => { mouseDown = true; if (S.started && !S.driving) shoot(); });
addEventListener('mouseup', () => { mouseDown = false; });
$('btnResume').onclick = togglePause;
$('btnSave').onclick = () => { localStorage.setItem('suncoast-save', JSON.stringify({ job: S.job, cash: S.cash, rep: S.rep, done: S.done })); toast('SAVED'); };
$('btnLoad').onclick = () => {
  try {
    const d = JSON.parse(localStorage.getItem('suncoast-save') || 'null');
    if (d) { S.job = d.job; S.cash = d.cash; S.rep = d.rep; S.done = d.done; toast('LOADED — JOB ' + S.job + '/8'); }
  } catch (e) { /* ignore */ }
};

function crewCall(who, text) {
  showDialog(who, who === 'Rae' ? 'FIXER' : who === 'Sable' ? 'LOOKOUT' : 'DRIVER', text);
  if (who === 'Rae' && S.wanted > 0) S.wanted--;
  if (who === 'Marlo') { S.fuel = 100; S.cond = 100; }
}
function toast(t) {
  const el = $('toast');
  el.textContent = t;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2600);
}
function togglePause() {
  if (!S.started) return;
  S.paused = !S.paused;
  $('pause').style.display = S.paused ? 'flex' : 'none';
  if (S.paused) {
    $('pauseStats').innerHTML =
      `MONEY ${money(S.cash)} &nbsp;•&nbsp; JOB ${S.job}/8 &nbsp;•&nbsp; ${S.done} JOBS DONE<br>` +
      `TARGETS DOWN ${S.targetsDown}/3 &nbsp;•&nbsp; DRIFT EARNINGS ${money(S.driftCash)} &nbsp;•&nbsp; REP ${S.rep}<br>` +
      `FUEL ${Math.round(S.fuel)}% &nbsp;•&nbsp; WANTED ${'★'.repeat(S.wanted)}${'☆'.repeat(5 - S.wanted)} &nbsp;•&nbsp; HP ${S.hp}`;
  }
}
function toggleHud() {
  S.hudHidden = !S.hudHidden;
  $('hud').classList.toggle('hidden', S.hudHidden);
}
function startGame() {
  S.started = true;
  $('title').style.display = 'none';
  audio.ensure();
  toast('JOB 1/8 — A FAVOR IN THE HEAT');
}
function tryEnterExit() {
  if (!S.started || S.paused) return;
  if (S.driving) {
    S.driving = false;
    player.group.position.copy(hero.group.position).add(new THREE.Vector3(2.5, 0, 0));
    player.group.rotation.y = heading;
    player.group.visible = true;
  } else if (hero.group.position.distanceTo(player.group.position) < 8) {
    S.driving = true;
    player.group.visible = false;
    toast('HEATLINE GT — COND ' + Math.round(S.cond) + '%');
  }
}
function showDialog(who, role, text) {
  $('dialog').classList.remove('hidden');
  $('dlgPort').textContent = who[0];
  $('dlgWho').textContent = who + ' • ' + role;
  $('dlgText').textContent = text;
}
function showPopup(text) {
  const el = $('popup');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(showPopup._t);
  showPopup._t = setTimeout(() => el.classList.add('hidden'), 2400);
}

// Missions.
function job() { return JOBS[S.job - 1]; }
function markerPos() { return job().at; }
function completeJob() {
  const j = job();
  S.cash += j.pay;
  S.done = S.job;
  audio.pickup();
  if (S.job < 8) {
    const next = JOBS[S.job];
    toast(`+$${j.pay.toLocaleString('en-US')} — JOB ${next.n}/8 ${next.title}`);
    S.job++;
    // REP and wanted are read for the NEW job: REP_WHILE / WANTED_WHILE
    // are indexed by job-1 and already include the yard bonus from job 4.
    S.rep = REP_WHILE[S.job - 1];
    S.wanted = WANTED_WHILE[S.job - 1];
    S.elapsed = 0;
    S.targetsDown = 0;
  } else {
    S.rep = REP_FINAL;
    S.complete = true;
    toast(`+$${j.pay.toLocaleString('en-US')} — LOOP COMPLETE`);
    showDialog('RAE', 'FIXER', 'Loop closed. Twenty-two four-fifty, clean. Suncoast is ours tonight.');
  }
}
function checkMarker() {
  const m = markerPos();
  const p = S.driving ? hero.group.position : player.group.position;
  const d = Math.hypot(p.x - m.x, p.z - m.z);
  if (S.job === 4) return d; // yard job completes by combat, not by the marker
  if (d < 5) completeJob();
  return d;
}
function shoot() {
  if (S.driving || !S.started || S.paused) return;
  audio.gunshot();
  player.flashMat.opacity = 1;
  setTimeout(() => { player.flashMat.opacity = 0; }, 90);
  // Raycast from the camera through the crosshair at the yard enemies.
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  ray.far = 70;
  const hits = ray.intersectObjects(enemies.filter((e) => e.group.visible).map((e) => e.group), true);
  if (hits.length) {
    let g = hits[0].object;
    while (g.parent && g.parent !== scene) g = g.parent;
    const e = enemies.find((x) => x.group === g);
    if (e) {
      e.hp = Math.max(0, e.hp - 0.34);
      e.drawBar(e.hp);
      if (e.hp <= 0 && e.group.visible) {
        e.group.visible = false;
        S.targetsDown++;
        S.cash += YARD_BOUNTY;
        showPopup('BOUNTY +$150');
        audio.pickup();
        if (S.targetsDown >= 3 && S.job === 4) {
          $('jobMark').textContent = 'TARGETS 3/3 — SWEEP DONE';
          setTimeout(() => { if (S.job === 4) completeJob(); }, 900);
        }
      }
    }
  }
}

// Camera rigs.
function forwardVec() { return new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)); }
function rightVec() { return new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading)); }
function placeCamera(mode) {
  const car = hero.group.position;
  const fwd = forwardVec();
  const right = rightVec();
  if (mode === 'wide') {
    camera.position.set(-58, 22, 190);
    camera.lookAt(-80, 8, 105);
  } else if (mode === 'chase' || mode === 'chaseWide') {
    const back = mode === 'chase' ? 15 : 12;
    // chaseWide sits further to the side so the hero car reads rear 3/4
    // (length visible, not just the rear) while staying whole in frame.
    const side = mode === 'chase' ? 3.2 : 6.0;
    const up = mode === 'chase' ? 3.2 : 5.0;
    camera.position.copy(car).addScaledVector(fwd, -back).addScaledVector(right, side).add(new THREE.Vector3(0, up, 0));
    // Pan the view toward the ocean (west) so the water is in the frame —
    // but only for the beach-road chase cam. chaseWide (shot 3) pans almost
    // straight ahead: a wide pan pushes the hero car half out of the frame.
    const pan = mode === 'chaseWide' ? 2.0 : 8;
    camera.lookAt(car.clone().addScaledVector(fwd, 10).addScaledVector(right, pan).add(new THREE.Vector3(0, 1.0, 0)));
  } else if (mode === 'foot') {
    const p = player.group.position;
    camera.position.copy(p).addScaledVector(forwardVec(), -4.6).addScaledVector(rightVec(), 2.0).add(new THREE.Vector3(0, 2.3, 0));
    camera.lookAt(p.clone().addScaledVector(forwardVec(), 12).add(new THREE.Vector3(0, 1.2, 0)));
  } else if (mode === 'lighthouse') {
    camera.position.set(-30, 9, -400);
    camera.lookAt(-100, 8, -470);
  } else {
    // Live chase camera.
    camera.position.copy(car).addScaledVector(fwd, -7).addScaledVector(right, 2.4).add(new THREE.Vector3(0, 2.8, 0));
    camera.lookAt(car.clone().addScaledVector(fwd, 9).add(new THREE.Vector3(0, 1.2, 0)));
  }
}

// Shot staging.
let camMode = 'live';
function applyShot(name) {
  const st = SHOTS[name];
  if (!st) return;
  S.job = st.job; S.cash = st.cash; S.rep = st.rep; S.done = st.done;
  S.wanted = st.wanted; S.elapsed = st.elapsed; S.speedKmh = st.speed; S.speed = st.speed / 3.6;
  S.started = true;
  $('title').style.display = 'none';
  camMode = st.cam;
  vel = S.speed;
  const car = hero.group;
  if (name === 'start') {
    heading = Math.PI; // facing north, toward the lighthouse
    car.position.set(-70, 0, 100);
    car.rotation.y = heading;
    vel = 0; S.speedKmh = 0; S.speed = 0; // parked at the boardwalk
    S.driving = true;
    player.group.visible = false;
  } else if (name === 'play' || name === 'chase') {
    // play: north up the beach road, ocean left, boardwalk right.
    // chase: east along the downtown Ocean Ave cross street (z=180) — the
    // shot's own heading/start, so the frame reads as a different district.
    heading = st.heading ?? Math.PI;
    car.position.set(st.startX ?? WORLD.beachRoadX, 0, st.startZ ?? (name === 'play' ? 260 : 210));
    car.rotation.y = heading;
    S.driving = true;
    player.group.visible = false;
    placePolice(st);
    if (st.heli) placeHeli(st.heliOff);
    if (name === 'chase') placeRoadblocks();
  } else if (name === 'mission') {
    // Open ground at the yard entrance: player just outside the gate, three
    // hostiles in a loose arc ahead, the container rows as the backdrop.
    heading = 0; // facing north (+z) into the yard
    player.group.position.set(WORLD.yard.x, 0, WORLD.yard.z - 34);
    player.group.rotation.y = heading;
    player.group.visible = true;
    S.driving = false;
    car.position.set(WORLD.yard.x - 34, 0, WORLD.yard.z + 30);
    car.rotation.y = heading;
    S.targetsDown = st.targets;
    const spots = [[-11, -23], [0, -21], [11, -23]];
    enemies.forEach((e, i) => {
      e.group.visible = true;
      e.group.position.set(WORLD.yard.x + spots[i][0], 0, WORLD.yard.z + spots[i][1]);
      e.group.rotation.y = Math.PI; // facing the player (south)
    });
    enemies[1].hp = 0.4; enemies[1].drawBar(0.4); // mid-fight: centre hostile already hurt
    enemies[0].hp = 1; enemies[0].drawBar(1);
    enemies[2].hp = 0.85; enemies[2].drawBar(0.85);
  } else if (name === 'end') {
    heading = Math.PI;
    car.position.set(-70, 0, -448);
    car.rotation.y = heading;
    player.group.position.set(-65, 0, -448);
    player.group.rotation.y = heading;
    player.group.visible = true;
    S.driving = false;
    S.complete = true;
    vel = 0; S.speedKmh = 0; S.speed = 0;
  }
  if (st.dlg) showDialog(st.dlg.who, st.dlg.role, st.dlg.text);
  if (st.popup) showPopup(st.popup);
  // Marker follows the staged job.
  world.marker.position.set(markerPos().x, 0, markerPos().z);
}
function placePolice(st) {
  // Police sit at the table's distances from the hero car, in slots the
  // chase camera can actually see: the closest unit flanks just behind the
  // camera line, the rest run ahead in the lanes.
  // Slots are (fwd, lat) along the chase heading, so the same table stages
  // the beach-road play shot (heading north) and the downtown chase shot
  // (heading east) with identical relative geometry.
  const car = hero.group.position;
  const fwd = forwardVec();
  const right = rightVec();
  const slots = [
    { fwd: 12, lat: 8 }, // closest unit, ahead-left, in frame
    { fwd: 24, lat: -3.5 },
    { fwd: 38, lat: -3.5 },
    { fwd: 55, lat: 0 },
  ];
  const rows = st.police.filter((r) => r.call !== 'AIR-1 SKY-1');
  rows.forEach((r, i) => {
    const p = policeCars[i];
    p.position.set(car.x + fwd.x * slots[i].fwd + right.x * slots[i].lat, 0,
      car.z + fwd.z * slots[i].fwd + right.z * slots[i].lat);
    p.userData.relFwd = slots[i].fwd;
    p.userData.lat = slots[i].lat;
    p.rotation.y = heading;
    p.visible = true;
  });
  // 3+ traffic cars ahead, pinned to the hero car so they stay in frame.
  const tSlots = [
    { fwd: 20, lat: 3.5 },
    { fwd: 32, lat: -3.5 },
    { fwd: 46, lat: 3.5 },
    { fwd: 60, lat: -3.5 },
  ];
  tSlots.forEach((s, i) => {
    const tr = traffic[i];
    tr.position.set(car.x + fwd.x * s.fwd + right.x * s.lat, 0,
      car.z + fwd.z * s.fwd + right.z * s.lat);
    tr.rotation.y = heading;
    tr.userData.staged = true;
    tr.userData.relFwd = s.fwd;
    tr.userData.lat = s.lat;
  });
}
function placeHeli(off) {
  const car = hero.group.position;
  heli.group.position.set(car.x + off.x, Math.max(off.y, 14), car.z + off.z);
  heli.group.visible = true;
  heli.cone.visible = true;
  heli.pool.visible = true;
  syncSpotlight();
}
function syncSpotlight() {
  // Pool stays on the road under the heli; cone stretches heli -> pool.
  const y = heli.group.position.y;
  heli.pool.position.y = 0.6 - y;
  heli.cone.position.y = (0.6 - y) / 2;
  heli.cone.scale.y = (y - 0.6) / 13;
}
function placeRoadblocks() {
  const car = hero.group.position;
  const fwd = forwardVec();
  const right = rightVec();
  roadblocks.forEach((b, i) => {
    const f = 40 + i * 3, lat = 4 - i * 4;
    b.position.set(car.x + fwd.x * f + right.x * lat, 0.6,
      car.z + fwd.z * f + right.z * lat);
    b.userData.relFwd = f;
    b.userData.lat = lat;
    b.rotation.y = 0.15 * (i - 1);
    b.visible = true;
  });
}

// HUD.
function updateHud(dt) {
  const j = job();
  if (S.complete && shotName === 'end') {
    $('jobTitle').textContent = 'STORY LOOP COMPLETE';
    $('jobObj').textContent = 'North Light done — the loop is closed';
    $('jobNext').textContent = 'NEXT: —';
    $('jobMark').textContent = 'LOOP COMPLETE • $22,450';
    $('jobTimer').textContent = '8 JOBS DONE • REP 10';
  } else {
    $('jobTitle').textContent = `JOB ${S.job}/8 • ${j.title}`;
    $('jobObj').textContent = j.goal;
    $('jobNext').textContent = S.job < 8 ? 'NEXT: ' + JOBS[S.job].title : 'NEXT: LOOP COMPLETE';
    if (S.job === 4) {
      $('jobMark').textContent = `TARGETS ${S.targetsDown}/3`;
    } else {
      const m = markerPos();
      const p = S.driving ? hero.group.position : player.group.position;
      $('jobMark').textContent = 'MARKER ' + Math.round(Math.hypot(p.x - m.x, p.z - m.z)) + ' m';
    }
    $('jobTimer').textContent = `${fmtClock(S.elapsed)} / PAR ${shot ? SHOTS[shotName].par : j.par}`;
  }
  $('cash').textContent = money(S.cash);
  $('hpRep').textContent = `HP ${S.hp}  •  REP ${S.rep}`;
  $('repfill').style.width = Math.min(100, S.rep * 10) + '%';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < S.wanted ? '★' : '<span class="off">☆</span>';
  $('stars').innerHTML = stars;
  const policeOn = S.wanted > 0 || (shot && SHOTS[shotName].police.length > 0);
  $('policeLine').textContent = S.wanted > 0 ? 'POLICE: IN SIGHT'
    : policeOn ? 'POLICE: RESPONDING' : 'POLICE: CLEAR';
  // Named police panel: live distances from the actual car positions.
  // Suppressed when the staged list is empty (mission shot: no panel at all).
  const panel = $('police');
  const rows = $('policeRows');
  const stagedRows = shot ? SHOTS[shotName].police : null;
  if (policeOn && !(stagedRows && stagedRows.length === 0)) {
    panel.classList.remove('hidden');
    const car = hero.group.position;
    let html = '';
    if (shot) {
      for (const r of SHOTS[shotName].police) {
        html += `<div class="row"><span>${r.call}</span><b>${r.d}m</b><span>${r.st}</span></div>`;
      }
    } else {
      const live = policeCars.filter((p) => p.visible).map((p, i) => ({
        call: ['SNOOK-12', 'SNOOK-11', 'SNOOK-13', 'SNOOK-14'][i],
        d: Math.round(p.position.distanceTo(car)),
        st: p.position.distanceTo(car) < 10 ? 'RAMMING' : 'PURSUIT',
      }));
      if (heli.group.visible) live.push({ call: 'AIR-1 SKY-1', d: Math.round(heli.group.position.distanceTo(car)), st: 'SPOTLIGHT' });
      for (const r of live) html += `<div class="row"><span>${r.call}</span><b>${r.d}m</b><span>${r.st}</span></div>`;
    }
    rows.innerHTML = html;
  } else {
    panel.classList.add('hidden');
  }
  $('radioName').textContent = RADIO[S.radio].name;
  $('radioTrack').textContent = RADIO[S.radio].track;
  let wHtml = '';
  WEAPONS.forEach((w, i) => { wHtml += `<span class="w${i === S.weapon ? ' on' : ''}">${i + 1} ${w}</span>`; });
  $('weapons').innerHTML = wHtml;
  $('abilities').innerHTML = CREW.map((c) => `<div><span class="k">${c.key}</span><span class="disc">${c.who}</span>${c.name} ${c.ab} — READY</div>`).join('');
  $('speed').innerHTML = `${Math.round(S.speedKmh)} <small>km/h</small>`;
  $('fuelPct').textContent = Math.round(S.fuel) + '%';
  $('fuelFill').style.width = S.fuel + '%';
  $('condPct').textContent = Math.round(S.cond) + '%';
  $('condFill').style.width = S.cond + '%';
  $('carLabel').textContent = `HEATLINE GT — COND ${Math.round(S.cond)}%`;
  $('cross').classList.toggle('hidden', S.driving);
  const district = S.job === 4 ? 'INDUSTRIAL • Yard Rd' : Math.abs(hero.group.position.x - WORLD.beachRoadX) < 20 ? 'BEACHFRONT • Beachfront Rd' : 'DOWNTOWN • Ocean Ave';
  const tod = shotName === 'chase' ? 'DUSK' : shotName === 'end' ? 'LAST LIGHT' : 'GOLDEN';
  $('mapLabel').innerHTML = `${district}<br>${tod} • ${S.done} JOBS DONE`;
  drawMinimap();
}
function drawMinimap() {
  const c = $('minimap');
  const g = c.getContext('2d');
  const W = 150, H = 150;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#1c2430';
  g.beginPath(); g.arc(75, 75, 74, 0, 7); g.fill();
  g.save();
  g.beginPath(); g.arc(75, 75, 74, 0, 7); g.clip();
  const toMap = (x, z) => [75 + (x / 600) * 72, 75 + (z / 600) * 72];
  g.fillStyle = '#1d4e6e'; g.fillRect(0, 0, 61, 150); // ocean strip
  g.fillStyle = '#d9b380'; g.fillRect(61, 0, 6, 150); // sand
  g.strokeStyle = '#666'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(...toMap(WORLD.beachRoadX, -600)); g.lineTo(...toMap(WORLD.beachRoadX, 600)); g.stroke();
  g.strokeStyle = '#555'; g.lineWidth = 3;
  for (const z of [-360, -180, 0, 180, 360]) {
    g.beginPath(); g.moveTo(...toMap(-200, z)); g.lineTo(...toMap(500, z)); g.stroke();
  }
  const m = markerPos();
  const [mx, my] = toMap(m.x, m.z);
  g.fillStyle = '#ffd23e';
  g.beginPath(); g.arc(mx, my, 4 + Math.sin(S.playT * 4) * 1.5, 0, 7); g.fill();
  g.fillStyle = '#ff3b30';
  for (const p of policeCars.filter((x) => x.visible)) {
    const [px, py] = toMap(p.position.x, p.position.z);
    g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill();
  }
  const car = hero.group.position;
  const [cx, cy] = toMap(car.x, car.z);
  g.fillStyle = '#ffd23e';
  g.save();
  g.translate(cx, cy);
  g.rotate(Math.atan2(Math.sin(heading), Math.cos(heading)) + Math.PI);
  g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill();
  g.restore();
  g.restore();
}

// Main loop.
const clock = new THREE.Clock();
let fpsFrames = 0, fpsT = 0, fpsVal = 0;
window.__fps = () => fpsVal;
let readySent = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (!S.paused) {
    S.playT += dt;
    if (S.started && !shot) S.elapsed += dt;
    if (shot) S.elapsed = SHOTS[shotName].elapsed + S.playT;
    world.animate(t, dt);
    updateWorld(dt, t);
    updateHud(dt);
  }
  renderer.render(scene, camera);
  fpsFrames++; fpsT += dt;
  if (fpsT >= 1) { fpsVal = Math.round(fpsFrames / fpsT); fpsFrames = 0; fpsT = 0; }
  if (!readySent && S.playT > 0.5) {
    readySent = true;
    window.__ready = true;
    window.__suncoast = {
      shot: shotName, state, ready: true,
      teleport(x, z) {
        if (S.driving) hero.group.position.set(x, 0, z);
        else player.group.position.set(x, 0, z);
      },
    };
  }
}

function updateWorld(dt, t) {
  const car = hero.group;
  // Driving / walking.
  if (S.started && !shot) {
    if (S.driving) {
      const accel = keys.KeyW || keys.ArrowUp ? 14 : 0;
      const brake = keys.KeyS || keys.ArrowDown ? 22 : 0;
      vel += (accel - brake) * dt;
      vel -= vel * 0.55 * dt; // drag
      if (keys.KeyS && vel < 0.5) vel = Math.max(vel - 6 * dt, -6);
      vel = Math.max(-8, Math.min(vel, 55));
      const steer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
      const steerAmt = steer * 1.5 * dt * Math.min(1, Math.abs(vel) / 8) * Math.sign(vel || 1);
      heading += steerAmt;
      // Drift: Space while steering hard at speed.
      const drifting = keys.Space && Math.abs(vel) > 14 && steer !== 0;
      if (drifting) {
        driftT += dt;
        puff(car.position.x - Math.sin(heading) * 1.4, 0.4, car.position.z - Math.cos(heading) * 1.4);
        hero.parts.brakeMat.emissiveIntensity = 2.2;
        if (driftT > 1.2) {
          S.drift++;
          driftT = 0;
          const gain = 50 * S.drift;
          S.cash += gain; S.driftCash += gain;
          showPopup(`DRIFT x${S.drift} +$${gain}`);
        }
      } else {
        driftT = 0;
        hero.parts.brakeMat.emissiveIntensity = brake ? 2.2 : 0.7;
      }
      car.position.x += Math.sin(heading) * vel * dt;
      car.position.z += Math.cos(heading) * vel * dt;
      car.position.x = Math.max(-160, Math.min(480, car.position.x));
      car.position.z = Math.max(-580, Math.min(580, car.position.z));
      car.rotation.y = heading;
      // Near-miss: fast pass next to traffic.
      for (const tr of traffic) {
        const d = Math.hypot(tr.position.x - car.position.x, tr.position.z - car.position.z);
        if (d < 4.5 && Math.abs(vel) > 22 && !tr.userData.nm) {
          tr.userData.nm = true;
          S.cash += 50; S.nearMiss++;
          showPopup('NEAR MISS +$50');
          setTimeout(() => { tr.userData.nm = false; }, 4000);
        }
      }
      S.speedKmh = Math.abs(vel) * 3.6;
      S.fuel = Math.max(0, S.fuel - dt * 0.15);
      audio.setEngine(S.speedKmh, true);
      checkMarker();
    } else {
      // On foot.
      const sp = 6;
      const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
      const r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
      player.group.position.x += (Math.sin(heading) * f + Math.cos(heading) * r) * sp * dt;
      player.group.position.z += (Math.cos(heading) * f - Math.sin(heading) * r) * sp * dt;
      player.group.rotation.y = heading;
      const swing = Math.sin(t * 9) * 0.5 * (f || r ? 1 : 0);
      player.legL.rotation.x = swing;
      player.legR.rotation.x = -swing;
      S.speedKmh = 0;
      audio.setEngine(0, false);
      checkMarker();
    }
  }
  if (shot && (shotName === 'play' || shotName === 'chase')) {
    // Staged chase: the car keeps rolling along the shot's heading at staged
    // speed; police, staged traffic and roadblocks stay pinned to it in
    // (fwd, lat) slots.
    const fwd = forwardVec();
    const right = rightVec();
    car.position.addScaledVector(fwd, S.speed * dt);
    if (car.position.z < -560) car.position.z = 560;
    if (car.position.z > 560) car.position.z = -560;
    if (car.position.x > 470) car.position.x = -220;
    if (car.position.x < -230) car.position.x = 470;
    car.rotation.y = heading;
    for (const p of policeCars) {
      if (!p.visible) continue;
      p.position.set(car.position.x + fwd.x * p.userData.relFwd + right.x * p.userData.lat, 0,
        car.position.z + fwd.z * p.userData.relFwd + right.z * p.userData.lat);
    }
    for (const tr of traffic) {
      if (!tr.userData.staged) continue;
      tr.position.set(car.position.x + fwd.x * tr.userData.relFwd + right.x * tr.userData.lat, 0,
        car.position.z + fwd.z * tr.userData.relFwd + right.z * tr.userData.lat);
    }
    for (const b of roadblocks) {
      if (!b.visible) continue;
      b.position.set(car.position.x + fwd.x * b.userData.relFwd + right.x * b.userData.lat, 0.6,
        car.position.z + fwd.z * b.userData.relFwd + right.z * b.userData.lat);
    }
    // Keep the staged heli glued above the car.
    if (heli.group.visible) {
      heli.group.position.x = car.position.x + SHOTS[shotName].heliOff.x;
      heli.group.position.z = car.position.z + SHOTS[shotName].heliOff.z;
      heli.group.position.y = Math.max(SHOTS[shotName].heliOff.y, 14);
      syncSpotlight();
    }
    // Sun glitter follows the car so the water reads in the chase frames.
    world.glitter.position.z = car.position.z - 10;
    S.speedKmh = S.speed * 3.6;
    // The drift popup must still be on screen at capture time: re-show it
    // on wall-clock time.
    if (shotName === 'chase' && Math.floor(t / 2.5) !== popupTick) {
      popupTick = Math.floor(t / 2.5);
      showPopup('DRIFT x3 +$150');
    }
  }
  if (shotName === 'mission') {
    // Staged fire: the muzzle flash stays lit so it is in the frame.
    player.flashMat.opacity = 0.95;
    if (t - lastShotT > 1.4) {
      lastShotT = t;
      audio.gunshot();
      const e = enemies[1];
      if (e.hp > 0.25) { e.hp = Math.max(0.25, e.hp - 0.05); e.drawBar(e.hp); }
    }
  }
  // Traffic loops along the road (staged cars are pinned to the hero car).
  for (const tr of traffic) {
    if (tr.userData.staged) continue;
    tr.position.z += tr.userData.dir * tr.userData.speed * dt;
    if (tr.position.z > 620) tr.position.z = -620;
    if (tr.position.z < -620) tr.position.z = 620;
    // Keep traffic out of the staged chase lane near the hero car.
    if (shot && Math.abs(tr.position.z - car.position.z) < 12 && Math.abs(tr.position.x - car.position.x) < 6) {
      tr.position.x += (tr.position.x > car.position.x ? 1 : -1) * 6;
    }
  }
  // Walkers: stroll, scatter from the speeding car.
  for (const w of walkers) {
    const g = w.group;
    const dCar = Math.hypot(g.position.x - car.position.x, g.position.z - car.position.z);
    if (dCar < 7 && S.speedKmh > 25) {
      g.position.x += (g.position.x > car.position.x ? 1 : -1) * 6 * dt;
      g.rotation.y = g.position.x > car.position.x ? Math.PI / 2 : -Math.PI / 2;
    } else {
      g.position.z += g.userData.dir * g.userData.speed * dt;
      if (g.position.z > 580 || g.position.z < -580) g.userData.dir *= -1;
      g.rotation.y = g.userData.dir > 0 ? 0 : Math.PI;
    }
    const sw = Math.sin(t * 7 + g.userData.phase) * 0.45;
    w.armL.rotation.x = sw; w.armR.rotation.x = -sw;
    w.legL.rotation.x = -sw; w.legR.rotation.x = sw;
  }
  // Police: live pursuit when wanted, parked otherwise.
  // Pursuit steering is collision-aware: each unit steers toward the hero
  // car but eases off and slides sideways when another unit is directly
  // ahead, so the pack does not stack into one car.
  if (!shot) {
    const want = S.wanted > 0;
    heli.group.visible = want && S.wanted >= 3;
    policeCars.forEach((p, i) => {
      p.visible = want;
      if (!want) return;
      const target = car.position;
      const dx = target.x - p.position.x, dz = target.z - p.position.z;
      const d = Math.hypot(dx, dz) || 1;
      const sp = 16 + i * 1.5;
      // Avoidance: if a sibling unit is close ahead on the pursuit line,
      // veer sideways instead of ramming through it.
      let vx = dx / d, vz = dz / d;
      for (let k = 0; k < policeCars.length; k++) {
        if (k === i) continue;
        const o = policeCars[k];
        if (!o.visible) continue;
        const ox = o.position.x - p.position.x, oz = o.position.z - p.position.z;
        const od = Math.hypot(ox, oz);
        if (od > 0.1 && od < 9 && (ox * vx + oz * vz) > 0.5 * od) {
          const side = (ox * vz - oz * vx) > 0 ? 1 : -1;
          const nx = vx + vz * 0.7 * side;
          const nz = vz - vx * 0.7 * side;
          const nl = Math.hypot(nx, nz) || 1;
          vx = nx / nl;
          vz = nz / nl;
          break;
        }
      }
      p.position.x += vx * sp * dt;
      p.position.z += vz * sp * dt;
      p.rotation.y = Math.atan2(dx, dz);
    });
    if (heli.group.visible) {
      const a = t * 0.35;
      heli.group.position.set(
        car.position.x + Math.cos(a) * 38,
        16 + Math.sin(t * 0.5) * 1.5,
        car.position.z + Math.sin(a) * 38);
      heli.group.rotation.y = -a;
      syncSpotlight();
    }
  }
  if (heli.group.visible) {
    heli.rotor.rotation.y += dt * 22;
    heli.tailRotor.rotation.x += dt * 30;
    // Spotlight cone swings gently over the car.
    heli.cone.rotation.z = Math.sin(t * 0.6) * 0.12;
  }
  // Smoke puffs fade.
  for (const p of smokePool) {
    if (p.life > 0) {
      p.life -= dt;
      p.s.material.opacity = Math.max(0, p.life * 0.6);
      p.s.position.y += dt * 1.2;
      p.s.scale.setScalar(2 + (0.9 - p.life) * 3);
    }
  }
  // Camera.
  if (shot) placeCamera(camMode);
  else if (S.driving) placeCamera('live');
  else {
    const p = player.group.position;
    camera.position.copy(p).addScaledVector(forwardVec(), -4.6).addScaledVector(rightVec(), 1.3).add(new THREE.Vector3(0, 2.3, 0));
    camera.lookAt(p.clone().addScaledVector(forwardVec(), 12).add(new THREE.Vector3(0, 1.2, 0)));
  }
  hero.parts.wheels.forEach((w) => { w.rotation.x += (S.speedKmh / 3.6) * dt * 2.4; });
}

// Boot.
if (shot) {
  applyShot(shotName);
} else {
  world.marker.position.set(markerPos().x, 0, markerPos().z);
}
animate();
