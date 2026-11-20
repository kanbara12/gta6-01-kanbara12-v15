// SUNCOAST: HEATLINE — vehicles and characters (v15).
// The hero coupe is shaped to read as a sports car from a low rear 3/4
// camera: sloped hood, raked glass, flared arches, spoiler, twin exhausts
// and a driver visible through the glass.

import * as THREE from 'three';

const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.08, metalness: 0.9 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.25, metalness: 0.9 });

function makeWheel(r = 0.42) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 18), tyreMat);
  tyre.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.34, 12), rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(tyre, rim);
  return g;
}

// Flared arch: a half-torus hugging the wheel.
function archFor(mat) {
  const a = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.09, 8, 16, Math.PI), mat);
  a.rotation.y = Math.PI / 2;
  return a;
}

export function buildCoupe() {
  const paint = new THREE.MeshStandardMaterial({ color: 0xb3121f, roughness: 0.22, metalness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.6 });
  const car = new THREE.Group();
  const parts = {};

  // Low sloped hood: the nose sits clearly below the cabin roofline.
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.7), paint);
  hood.position.set(0, 0.72, 1.55);
  hood.rotation.x = -0.16;
  car.add(hood);
  // Main body slab.
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.42, 3.1), paint);
  body.position.set(0, 0.62, -0.25);
  car.add(body);
  // Cabin with raked glass: windshield and rear glass lean back hard.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 1.7), paint);
  cabin.position.set(0, 0.98, -0.55);
  car.add(cabin);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), glassMat);
  shield.position.set(0, 1.08, 0.32);
  shield.rotation.x = -0.62;
  car.add(shield);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), glassMat);
  rearGlass.position.set(0, 1.08, -1.35);
  rearGlass.rotation.x = 0.62;
  car.add(rearGlass);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 1.5), glassMat);
    side.position.set(sx * 0.86, 1.0, -0.55);
    car.add(side);
  }
  // Front bumper and grille band below the hood.
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.3, 0.4), dark);
  bumper.position.set(0, 0.42, 2.35);
  car.add(bumper);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.08), dark);
  grille.position.set(0, 0.62, 2.42);
  car.add(grille);
  // Rear spoiler on short mounts: a wing, not a flat board.
  for (const sx of [-0.6, 0.6]) {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), dark);
    mount.position.set(sx, 1.02, -1.85);
    car.add(mount);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.42), paint);
  wing.position.set(0, 1.16, -1.85);
  wing.rotation.x = -0.12;
  car.add(wing);
  // Twin exhausts at the rear lower edge.
  for (const sx of [-0.45, 0.45]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10), dark);
    ex.rotation.x = Math.PI / 2;
    ex.position.set(sx, 0.38, -1.88);
    car.add(ex);
  }
  // Emissive brake-light bar.
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 0.7 });
  const brake = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.06), brakeMat);
  brake.position.set(0, 0.82, -1.83);
  car.add(brake);
  parts.brakeMat = brakeMat;
  // Wheels and flared arches, all four visible from the side.
  parts.wheels = [];
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.25], [0.95, -1.25]]) {
    const w = makeWheel();
    w.position.set(wx, 0.42, wz);
    car.add(w);
    parts.wheels.push(w);
    const a = archFor(paint);
    a.position.set(wx, 0.42, wz);
    car.add(a);
  }
  // Driver: torso and helmet readable through the glass and above the door line.
  const driver = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x2a4a8a, roughness: 0.8 }));
  torso.position.y = 0.3;
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3 }));
  helmet.position.y = 0.72;
  driver.add(torso, helmet);
  driver.position.set(-0.35, 0.62, -0.55);
  car.add(driver);
  parts.driver = driver;

  car.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return { group: car, parts };
}

export function buildTraffic(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 3.6), paint);
  body.position.y = 0.62;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.9), paint);
  top.position.set(0, 1.05, -0.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.4, 1.7), glassMat);
  glass.position.set(0, 1.05, -0.2);
  g.add(body, top, glass);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const sx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), headMat);
    h.position.set(sx, 0.62, 1.82);
    g.add(h);
    for (const wz of [1.2, -1.2]) {
      const w = makeWheel(0.38);
      w.position.set(sx * 1.05, 0.38, wz);
      g.add(w);
    }
  }
  return g;
}

export function buildPolice() {
  const g = buildTraffic(0x1a1a22);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.18, 3.62),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  stripe.position.y = 0.62;
  g.add(stripe);
  const redBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.14, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 1.6 }));
  redBar.position.set(0, 1.38, -0.2);
  g.add(redBar);
  const blueBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.14, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0x2040ff, emissiveIntensity: 1.6 }));
  blueBar.position.set(0.75, 1.38, -0.2);
  g.add(blueBar);
  return g;
}

// SKY-1: a big detailed heli. The rotor is a wide thin disc plus blades;
// the spotlight is a translucent cone plus a bright pool ellipse on the road.
export function buildHeli() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 4.6), bodyMat);
  g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), glassMat);
  nose.position.set(0, 0.1, 2.3);
  nose.scale.set(1, 0.85, 1);
  g.add(nose);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 4.4, 8), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.35, -4.2);
  g.add(boom);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 1.1), bodyMat);
  tail.position.set(0, 0.9, -6.2);
  g.add(tail);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.3), rimMat);
  tailRotor.position.set(0.3, 0.9, -6.2);
  g.add(tailRotor);
  for (const sx of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.4), rimMat);
    skid.position.set(sx, -1.15, 0);
    g.add(skid);
  }
  // Main rotor: two long blades plus a translucent blur disc so the spin reads.
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  blur.rotation.x = -Math.PI / 2;
  rotor.add(blur);
  rotor.position.y = 1.35;
  g.add(rotor);
  // Spotlight cone hanging below, and the pool it throws on the road.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 13, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = -6.9; // apex up at the heli, wide end down at the road
  g.add(cone);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.55, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -13.4;
  g.add(pool);
  return { group: g, rotor, tailRotor, cone, pool };
}

export function buildWalker(color) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.9 });
  const shirt = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const legs = new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  head.position.y = 1.72;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), shirt);
  armL.position.set(-0.36, 1.15, 0);
  const armR = armL.clone();
  armR.position.x = 0.36;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), legs);
  legL.position.set(-0.14, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;
  g.add(torso, head, armL, armR, legL, legR);
  return { group: g, armL, armR, legL, legR };
}

// On-foot player with a pistol that stays visible from the shot camera.
export function buildPlayer() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x8a1f2a, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x23232c, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.34), jacket);
  torso.position.y = 1.18;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skin);
  head.position.y = 1.78;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
  cap.position.y = 1.95;
  const armR = new THREE.Group();
  const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), jacket);
  armMesh.position.y = -0.28;
  armR.add(armMesh);
  armR.position.set(0.38, 1.45, 0.1);
  armR.rotation.x = -1.25; // arm raised forward, aiming
  const armL = new THREE.Group();
  const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), jacket);
  armLMesh.position.y = -0.28;
  armL.add(armLMesh);
  armL.position.set(-0.38, 1.45, 0.1);
  armL.rotation.x = -1.1;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), pants);
  legL.position.set(-0.16, 0.4, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  // Pistol held out in front of the right hand, big enough to read on camera.
  const pistol = new THREE.Group();
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.35, metalness: 0.8 });
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.7), gunMetal);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.14), gunMetal);
  grip.position.set(0, -0.18, -0.22);
  pistol.add(barrel, grip);
  pistol.position.set(0.46, 1.28, 0.72);
  // Muzzle flash: a glowing ball at the barrel tip, reads from any angle.
  const flashC = document.createElement('canvas');
  flashC.width = flashC.height = 64;
  const fg = flashC.getContext('2d');
  const fr = fg.createRadialGradient(32, 32, 2, 32, 32, 30);
  fr.addColorStop(0, 'rgba(255,240,170,1)');
  fr.addColorStop(0.4, 'rgba(255,200,80,0.9)');
  fr.addColorStop(1, 'rgba(255,150,40,0)');
  fg.fillStyle = fr;
  fg.fillRect(0, 0, 64, 64);
  const flashTex = new THREE.CanvasTexture(flashC);
  const flashMat = new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, depthWrite: false });
  const flash = new THREE.Sprite(flashMat);
  flash.scale.set(0.9, 0.9, 1);
  flash.position.set(0.46, 1.28, 1.25);
  g.add(torso, head, cap, armR, armL, legL, legR, pistol, flash);
  return { group: g, pistol, flash, flashMat, legL, legR };
}

// Yard enemy with a floating health-bar sprite above the head.
export function buildYardEnemy(hp) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), shirt);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), skin);
  head.position.y = 1.76;
  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.4, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x5a2a2a, roughness: 0.9 }));
  vest.position.y = 1.25;
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.78, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.9 }));
  legL.position.set(-0.16, 0.39, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  // Enemy rifle, held across the body so it reads as armed.
  const rifle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 }));
  rifle.position.set(0, 1.2, 0.35);
  rifle.rotation.y = 0.5;
  g.add(torso, head, vest, legL, legR, rifle);
  // Health bar: canvas sprite, green fill on a dark backing, 1.6 m wide.
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 8;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  const drawBar = (frac) => {
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillStyle = frac > 0.5 ? '#4be364' : frac > 0.25 ? '#ffb02e' : '#ff3b30';
    ctx.fillRect(1, 1, 62 * Math.max(0, frac), 6);
    tex.needsUpdate = true;
  };
  drawBar(hp);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  bar.scale.set(1.7, 0.21, 1);
  bar.position.y = 2.25;
  g.add(bar);
  return { group: g, hp, drawBar };
}
