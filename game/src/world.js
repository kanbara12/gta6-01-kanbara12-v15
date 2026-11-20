// SUNCOAST: HEATLINE — the world: sunset sky, ocean, beach, city, landmarks.
// Every texture is painted on a canvas at runtime; nothing is fetched.

import * as THREE from 'three';
import { WORLD, rng32 } from './config.js';

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft round glow (sun halo, clouds): radial falloff, no hard edges.
function glowTexture(inner, outer) {
  return canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    r.addColorStop(0, inner);
    r.addColorStop(1, outer);
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });
}

// Facade texture: warm lit windows on a dark front, some dark, some lit.
function facadeTexture(base, lit) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const rnd = rng32(w * 7 + h);
    for (let y = 10; y < h - 8; y += 18) {
      for (let x = 8; x < w - 8; x += 16) {
        g.fillStyle = rnd() < 0.55 ? lit : 'rgba(20,22,34,0.9)';
        g.fillRect(x, y, 10, 12);
      }
    }
  });
}

export function buildScene(scene, seed) {
  const rnd = rng32(seed);
  const out = { clouds: [], ferris: null, ocean: null, marker: null };

  // Sky dome: gradient shader, purple top to orange horizon.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x2b2350) },
        mid: { value: new THREE.Color(0xc24a6e) },
        low: { value: new THREE.Color(0xff8a3c) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 top, mid, low;
        void main(){ float h = normalize(vP).y;
          vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.9, h)) : mix(low, mid, smoothstep(-0.05, 0.25, h));
          gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  scene.add(sky);

  // Low sun over the water (west): halo, disc, bright core.
  const sunGroup = new THREE.Group();
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,190,90,0.85)', 'rgba(255,120,40,0)'), transparent: true, depthWrite: false, fog: false }));
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 40),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(15, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  sunGroup.add(halo, disc, core);
  sunGroup.position.set(-760, 95, -80);
  sunGroup.lookAt(0, 40, 0);
  scene.add(sunGroup);
  out.sun = sunGroup;

  // Warm sun light plus warm bounce so sunset-facing walls never go black.
  const sun = new THREE.DirectionalLight(0xffb066, 2.4);
  sun.position.set(-300, 160, -60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xff9a5c, 0x3a2a4a, 1.15));
  scene.add(new THREE.AmbientLight(0x60405a, 0.55));
  scene.fog = new THREE.Fog(0x8a4a5e, 260, 900);

  // Soft clouds: stretched glow blobs, never hard rectangles.
  const cloudTex = glowTexture('rgba(255,205,180,0.75)', 'rgba(255,150,120,0)');
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(120 + rnd() * 160, 22 + rnd() * 26),
      new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.5 + rnd() * 0.3, depthWrite: false, fog: false }));
    const ang = rnd() * Math.PI * 2;
    m.position.set(Math.cos(ang) * (420 + rnd() * 320), 150 + rnd() * 130, Math.sin(ang) * (420 + rnd() * 320));
    m.lookAt(0, 60, 0);
    m.userData.drift = 0.4 + rnd() * 0.8;
    scene.add(m);
    out.clouds.push(m);
  }

  // Ocean: animated plane, sun glitter streak, foam strip at the waterline.
  const oceanGeo = new THREE.PlaneGeometry(700, 1300, 40, 60);
  oceanGeo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(
    oceanGeo,
    new THREE.MeshStandardMaterial({ color: 0x27678f, roughness: 0.25, metalness: 0.55 }));
  ocean.position.set(-465, 0.4, 0);
  scene.add(ocean);
  out.ocean = ocean;
  out.oceanBase = oceanGeo.attributes.position.array.slice();
  const glitterTex = canvasTex(256, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(255,150,60,0)');
    grad.addColorStop(0.55, 'rgba(255,180,90,0.35)');
    grad.addColorStop(1, 'rgba(255,210,130,0.85)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const glitter = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 70),
    new THREE.MeshBasicMaterial({ map: glitterTex, transparent: true, opacity: 0.55, depthWrite: false }));
  glitter.rotation.x = -Math.PI / 2;
  glitter.position.set(-230, 0.55, -60);
  scene.add(glitter);
  out.glitter = glitter;
  const foamTex = canvasTex(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7);
      g.fill();
    }
  });
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 1300),
    new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, opacity: 0.85, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(WORLD.seaX + 4, 0.7, 0);
  scene.add(foam);
  out.foam = foam;

  // Sand strip between the waterline and the beach road.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.sandX - WORLD.seaX + 6, 1300),
    new THREE.MeshStandardMaterial({ color: 0xd9b380, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set((WORLD.sandX + WORLD.seaX) / 2, 0.2, 0);
  scene.add(sand);

  // Ground, beach road with centre dashes, and five cross streets.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshStandardMaterial({ color: 0x3d3a44, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x23232c, roughness: 0.35, metalness: 0.25 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 1300), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(WORLD.beachRoadX, 0.35, 0);
  scene.add(road);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c25a });
  for (let z = -620; z < 620; z += 14) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 4), dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(WORLD.beachRoadX, 0.4, z);
    scene.add(d);
  }
  for (const z of [-360, -180, 0, 180, 360]) {
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(700, 12), roadMat);
    cross.rotation.x = -Math.PI / 2;
    cross.position.set(120, 0.32, z);
    scene.add(cross);
  }

  // City: ~190 buildings, varied heights and palettes, lit windows.
  const palettes = [
    ['#4a3f55', '#ffd28a'], ['#54423a', '#ffe0a0'], ['#39415a', '#ffd28a'],
    ['#5a3a44', '#ffe9b0'], ['#3a4a4a', '#ffd28a'], ['#5c4a2e', '#ffdf9e'],
  ];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const cityRnd = rng32(seed + 11);
  let count = 0;
  for (let gx = 0; gx < 14 && count < 196; gx++) {
    for (let gz = 0; gz < 16 && count < 196; gz++) {
      if (cityRnd() < 0.12) continue; // gaps: plazas, parking
      const bx = -20 + gx * 42 + (cityRnd() - 0.5) * 10;
      const bz = -560 + gz * 76 + (cityRnd() - 0.5) * 14;
      if (Math.abs(bx - WORLD.beachRoadX) < 22) continue;
      if (Math.hypot(bx - WORLD.yard.x, bz - WORLD.yard.z) < 55) continue; // yard stays clear
      const h = 9 + cityRnd() * cityRnd() * 62;
      const pal = palettes[Math.floor(cityRnd() * palettes.length)];
      const tex = facadeTexture(pal[0], pal[1]);
      const mat = new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.85,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35,
      });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(20 + cityRnd() * 16, h, 18 + cityRnd() * 14);
      b.position.set(bx, 0, bz);
      scene.add(b);
      count++;
      if (cityRnd() < 0.18) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(10, 2.2, 0.6),
          new THREE.MeshBasicMaterial({ color: [0xff5a6e, 0x37c8ff, 0xffb02e][Math.floor(cityRnd() * 3)] }));
        sign.position.set(bx, h + 1.4, bz);
        scene.add(sign);
      }
    }
  }
  out.buildingCount = count;

  // Palms: trunk plus seven drooping fronds, two greens, varied lean.
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 7, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 });
  const frondGeo = new THREE.PlaneGeometry(0.9, 4.4);
  frondGeo.translate(0, -2.0, 0);
  const frondMats = [0x2f7a3a, 0x3f9440, 0x2a6b35].map((c) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }));
  const palmSpots = [];
  for (let z = -600; z <= 600; z += 26) {
    palmSpots.push([WORLD.sandX - 8, z + (rnd() - 0.5) * 8]);
    palmSpots.push([WORLD.beachRoadX - 12, z + 13 + (rnd() - 0.5) * 6]);
    if (rnd() < 0.5) palmSpots.push([WORLD.beachRoadX + 12, z + 6 + (rnd() - 0.5) * 8]);
  }
  for (const [px, pz] of palmSpots) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = (rnd() - 0.5) * 0.14;
    palm.add(trunk);
    const fm = frondMats[Math.floor(rnd() * frondMats.length)];
    for (let f = 0; f < 7; f++) {
      const fr = new THREE.Mesh(frondGeo, fm);
      const a = (f / 7) * Math.PI * 2 + rnd() * 0.5;
      fr.position.y = 7;
      fr.rotation.order = 'YXZ';
      fr.rotation.y = a;
      fr.rotation.x = 0.85 + rnd() * 0.35;
      palm.add(fr);
    }
    palm.position.set(px, 0, pz);
    palm.scale.setScalar(0.85 + rnd() * 0.45);
    scene.add(palm);
  }
  out.palmCount = palmSpots.length;

  // Ferris wheel on the boardwalk, turning slowly.
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(
    new THREE.TorusGeometry(17, 0.7, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 })));
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 33, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.6 }));
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
  }
  const gondolaGeo = new THREE.BoxGeometry(2.4, 2, 2);
  const gondolaMat = new THREE.MeshStandardMaterial({ color: 0xff5a6e, roughness: 0.5 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const g = new THREE.Mesh(gondolaGeo, gondolaMat);
    g.position.set(Math.cos(a) * 17, Math.sin(a) * 17, 0);
    wheel.add(g);
  }
  const legMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 20, 0.9), legMat);
    leg.position.set(sx * 7, -10, 0);
    leg.rotation.z = -sx * 0.35;
    wheel.add(leg);
  }
  wheel.position.set(-92, 21, 120);
  scene.add(wheel);
  out.ferris = wheel;

  // Boardwalk kiosks: pitched roof, sign board, warm glow.
  const kioskRoof = new THREE.ConeGeometry(3.4, 2.2, 4);
  const kioskRows = [];
  for (let i = 0; i < 7; i++) kioskRows.push([-84, -140 + i * 52]);
  for (let i = 0; i < 5; i++) kioskRows.push([-38, -110 + i * 58]);
  for (let i = 0; i < kioskRows.length; i++) {
    const [kx, kz] = kioskRows[i];
    const k = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: [0x7a5a3a, 0x5a6e7a, 0x8a4a3a][i % 3], roughness: 0.9 }));
    base.position.y = 1.6;
    const roof = new THREE.Mesh(
      kioskRoof,
      new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.7 }));
    roof.position.y = 4.3;
    roof.rotation.y = Math.PI / 4;
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 1, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    sign.position.set(0, 3.1, 2.1);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 2.6),
      new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.85 }));
    glow.position.set(0, 1.6, 2.05);
    k.add(base, roof, sign, glow);
    k.position.set(kx, 0, kz);
    scene.add(k);
  }

  // Pier reaching into the ocean.
  const pier = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1, 70),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  deck.position.y = 1.2;
  pier.add(deck);
  for (let i = 0; i < 8; i++) {
    for (const sx of [-3.4, 3.4]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1 }));
      post.position.set(sx, 0.4, -30 + i * 9);
      pier.add(post);
    }
  }
  pier.position.set(WORLD.pier.x, 0, WORLD.pier.z);
  scene.add(pier);

  // Lighthouse at the north end, with a slow sweeping beam.
  const light = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 4.6, 26, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 }));
  tower.position.y = 13;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(3.7, 3.7, 3, 12),
    new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.8 }));
  band.position.y = 18;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  lamp.position.y = 27.5;
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(7, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2;
  beam.position.set(32, 27.5, 0);
  light.add(tower, band, lamp, beam);
  light.position.set(WORLD.lighthouse.x, 0, WORLD.lighthouse.z);
  scene.add(light);
  out.lighthouseBeam = beam;

  // Industrial yard: stacked containers, crates, fencing. The south side
  // stays low so a camera south of the yard can see in over it.
  const yard = new THREE.Group();
  const contCols = [0x2e6e8e, 0xb05a2a, 0x5a7a3a, 0x8e2e3e, 0x3a5a8e];
  const contGeo = new THREE.BoxGeometry(12, 2.6, 2.6);
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(
      contGeo,
      new THREE.MeshStandardMaterial({ color: contCols[i % contCols.length], roughness: 0.85 }));
    const row = Math.floor(i / 5), col = i % 5;
    c.position.set(-22 + col * 13, 1.3 + (i % 3 === 2 ? 2.6 : 0), -18 + row * 16);
    c.rotation.y = (i % 2) * 0.06;
    yard.add(c);
  }
  const crateGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1 });
  for (let i = 0; i < 10; i++) {
    const cr = new THREE.Mesh(crateGeo, crateMat);
    cr.position.set(-14 + rnd() * 34, 1.1, -8 + rnd() * 26);
    cr.rotation.y = rnd() * 1.5;
    yard.add(cr);
  }
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.7, metalness: 0.6 });
  for (const [fx, fz, w, d] of [[0, 26, 52, 0.4], [-26, 0, 0.4, 52], [26, 0, 0.4, 52]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), fenceMat);
    f.position.set(fx, 1.5, fz);
    yard.add(f);
  }
  const gate = new THREE.Mesh(new THREE.BoxGeometry(52, 1.1, 0.4), fenceMat);
  gate.position.set(0, 0.55, -27);
  yard.add(gate);
  yard.position.set(WORLD.yard.x, 0, WORLD.yard.z);
  scene.add(yard);
  out.yard = yard;

  // Garage (lose-the-heat) and safehouse: simple readable blocks.
  const garage = new THREE.Mesh(
    new THREE.BoxGeometry(16, 7, 12),
    new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.8 }));
  garage.position.set(WORLD.garage.x, 3.5, WORLD.garage.z);
  scene.add(garage);
  const sh = new THREE.Mesh(
    new THREE.BoxGeometry(12, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x6a4a5a, roughness: 0.85 }));
  sh.position.set(WORLD.safehouse.x, 3, WORLD.safehouse.z);
  scene.add(sh);

  // Mission marker: glowing ring + modest beam, never a pillar.
  const marker = new THREE.Group();
  const discM = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  discM.rotation.x = -Math.PI / 2;
  discM.position.y = 0.5;
  const beamM = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 9, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  beamM.position.y = 4.5;
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe27a }));
  dot.rotation.x = -Math.PI / 2;
  dot.position.y = 0.52;
  marker.add(discM, beamM, dot);
  marker.position.set(WORLD.marker1.x, 0, WORLD.marker1.z);
  scene.add(marker);
  out.marker = marker;

  // Street lamps along the beach road, warm pools of light.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.5 });
  for (let z = -580; z <= 580; z += 58) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), lampMat);
    pole.position.set(WORLD.beachRoadX + 9, 3.5, z);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    head.position.set(WORLD.beachRoadX + 9, 7.1, z);
    scene.add(pole, head);
  }

  out.animate = (t, dt) => {
    // Ocean swell.
    const pos = ocean.geometry.attributes.position;
    const base = out.oceanBase;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3], bz = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(bx * 0.08 + t * 1.1) * 0.35 + Math.cos(bz * 0.05 + t * 0.7) * 0.3;
    }
    pos.needsUpdate = true;
    out.ferris.rotation.z += dt * 0.12;
    out.lighthouseBeam.rotation.y += dt * 0.5;
    for (const c of out.clouds) {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 760) c.position.x = -760;
    }
    discM.material.opacity = 0.85 + Math.sin(t * 2.2) * 0.15;
    out.foam.material.opacity = 0.6 + Math.sin(t * 0.9) * 0.25;
  };
  return out;
}
