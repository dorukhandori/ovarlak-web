import * as THREE from "three";
import { makePoints, makePointsMaterial } from "./sea.js";

// One procedural island per game. Each builder returns
// { group, update(t, dt) } and is placed by world.js.

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const stone = (color, rough = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });

const SAND = new THREE.Color("#e8d6a8");
const GRASS = new THREE.Color("#5f9f55");
const DEEP_GRASS = new THREE.Color("#3f7d47");
const ROCK = new THREE.Color("#b9a98a");

function noise3(v, s) {
  return (
    Math.sin(v.x * 1.7 + s) * Math.cos(v.z * 1.3 - s * 0.7) * 0.5 +
    Math.sin(v.x * 3.9 - v.z * 2.7 + s * 1.9) * 0.22 +
    Math.cos(v.y * 4.4 + v.x * 2.1 + s) * 0.12
  );
}

function makeLand({ r, h, seed, grass = GRASS, rock = ROCK, detail = 4, rough = 0.28 }) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const colors = [];
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const n = noise3(v, seed);
    v.multiplyScalar(1 + n * rough);
    v.x *= r;
    v.z *= r;
    v.y = v.y > 0 ? v.y * h : v.y * 0.6;
    pos.setXYZ(i, v.x, v.y, v.z);
    const up = THREE.MathUtils.smoothstep(v.y, 0.12, 0.55);
    const c = SAND.clone().lerp(grass, up);
    const steep = THREE.MathUtils.smoothstep(Math.abs(n), 0.32, 0.5);
    c.lerp(rock, steep * 0.7 * up);
    c.lerp(DEEP_GRASS, THREE.MathUtils.smoothstep(v.y, h * 0.5, h) * 0.5);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }),
  );
}

// Drop a ray from above to sit props on the terrain.
const ray = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
function groundAt(land, x, z) {
  land.updateMatrixWorld(true);
  ray.set(new THREE.Vector3(x, 50, z), DOWN);
  const hit = ray.intersectObject(land, false)[0];
  return hit ? hit.point.y : 0;
}

function makeCypress(height) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 5), stone(0x6b5338));
  trunk.position.y = 0.25;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.42, height, 7), stone(0x2f6a3d, 0.9));
  crown.position.y = 0.4 + height / 2;
  g.add(trunk, crown);
  return g;
}

function makeOlive(rand) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 5), stone(0x7a6040));
  trunk.position.y = 0.55;
  trunk.rotation.z = 0.12;
  g.add(trunk);
  const leaf = stone(0x7aa86a, 0.95);
  const ball = new THREE.IcosahedronGeometry(0.55, 0);
  for (let i = 0; i < 5; i += 1) {
    const m = new THREE.Mesh(ball, leaf);
    m.position.set((rand() - 0.5) * 1.1, 1.2 + rand() * 0.5, (rand() - 0.5) * 1.1);
    m.scale.setScalar(0.6 + rand() * 0.5);
    g.add(m);
  }
  return g;
}

function makeColumn(height, broken) {
  const g = new THREE.Group();
  const mat = stone(0xefe4cc, 0.7);
  const h = broken ? height * 0.5 : height;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, h, 10), mat);
  shaft.position.y = h / 2 + 0.12;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.6), mat);
  base.position.y = 0.07;
  g.add(shaft, base);
  if (!broken) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.58), mat);
    cap.position.y = h + 0.18;
    g.add(cap);
  }
  return g;
}

function makeLotus(scale) {
  const g = new THREE.Group();
  const petal = new THREE.SphereGeometry(0.22, 10, 8);
  petal.scale(1, 0.22, 0.58);
  const pmat = new THREE.MeshStandardMaterial({
    color: 0xf4c2ce,
    roughness: 0.45,
    emissive: 0x7a3040,
    emissiveIntensity: 0.12,
  });
  for (let i = 0; i < 8; i += 1) {
    const m = new THREE.Mesh(petal, pmat);
    const a = (i / 8) * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.18, 0.06, Math.sin(a) * 0.18);
    m.rotation.set(0, a, 0.4);
    g.add(m);
  }
  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xf0d056, emissive: 0x8a6a10, emissiveIntensity: 0.3 }),
  );
  heart.position.y = 0.08;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.03, 16), stone(0x3d8a52, 0.8));
  g.add(heart, pad);
  g.scale.setScalar(scale);
  return g;
}

function placeOn(land, obj, x, z, sink = 0.05) {
  obj.position.set(x, groundAt(land, x, z) - sink, z);
  return obj;
}

/* I. Lotophagoi: low green island, olive grove, ruined columns, lotus ring. */
export function lotophagoi() {
  const rand = seeded(11);
  const group = new THREE.Group();
  const land = makeLand({ r: 4.6, h: 1.5, seed: 1.3 });
  group.add(land);
  for (const [x, z, h] of [[-1.2, -1.4, 2.6], [-0.4, -1.9, 3.2], [1.9, -1.1, 2.4]]) {
    group.add(placeOn(land, makeCypress(h), x, z));
  }
  for (const [x, z] of [[0.9, 0.6], [-2.2, 0.3]]) {
    const o = placeOn(land, makeOlive(rand), x, z);
    o.rotation.y = rand() * 6;
    group.add(o);
  }
  group.add(placeOn(land, makeColumn(2.2, false), 0.2, 1.7));
  const broken = placeOn(land, makeColumn(2.2, true), 1.5, 1.9);
  broken.rotation.z = 0.1;
  group.add(broken);

  const lotuses = [];
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2 + rand() * 0.3;
    const d = 5.3 + rand() * 2.4;
    const l = makeLotus(0.55 + rand() * 0.5);
    l.position.set(Math.cos(a) * d, 0.08, Math.sin(a) * d);
    l.userData.phase = rand() * 6.28;
    group.add(l);
    lotuses.push(l);
  }

  const count = 70;
  const petals = makePoints(count, makePointsMaterial({ color: "#f2b6c6", size: 0.16 }));
  const seeds = Array.from({ length: count }, () => [rand() * 9 - 4.5, rand() * 3, rand() * 9 - 4.5, rand()]);
  group.add(petals);

  return {
    group,
    update(t) {
      for (const l of lotuses) {
        l.position.y = 0.08 + Math.sin(t * 0.9 + l.userData.phase) * 0.08;
        l.rotation.y = Math.sin(t * 0.2 + l.userData.phase) * 0.4;
      }
      const p = petals.geometry.attributes.position;
      seeds.forEach(([x, y, z, s], i) => {
        const fall = (y + 3 - ((t * (0.15 + s * 0.2)) % 3.6)) % 3.6;
        p.setXYZ(i, x + Math.sin(t * 0.6 + s * 9) * 0.6, fall + 0.6, z + Math.cos(t * 0.5 + s * 7) * 0.6);
      });
      p.needsUpdate = true;
    },
  };
}

function jaggedLathe(profile, seed, segments = 18) {
  const rand = seeded(seed);
  const pts = profile.map(([r, y]) => new THREE.Vector2(r * (0.88 + rand() * 0.24), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + noise3(v, seed) * 0.16;
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeDragon(body, wing) {
  const g = new THREE.Group();
  const mat = stone(body, 0.6);
  const torso = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.5, 6), mat);
  torso.rotation.x = Math.PI / 2;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.6, 5), mat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -1.45;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.55, 5), mat);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0.1, 0.95);
  g.add(torso, tail, head);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.35);
  shape.lineTo(1.9, 0.15);
  shape.lineTo(1.5, -0.25);
  shape.lineTo(0.95, -0.05);
  shape.lineTo(0.55, -0.4);
  shape.lineTo(0, -0.35);
  const wgeo = new THREE.ShapeGeometry(shape);
  wgeo.rotateX(-Math.PI / 2);
  const wmat = new THREE.MeshStandardMaterial({ color: wing, side: THREE.DoubleSide, roughness: 0.7, flatShading: true });
  const left = new THREE.Mesh(wgeo, wmat);
  const right = new THREE.Mesh(wgeo, wmat);
  right.scale.x = -1;
  g.add(left, right);
  g.userData = { left, right };
  return g;
}

/* II. WyrmWar: a sea stack and three dragons circling it. */
export function wyrmwar() {
  const group = new THREE.Group();
  const base = makeLand({ r: 3.4, h: 0.9, seed: 4.1, grass: new THREE.Color("#8a9a62") });
  group.add(base);
  const spire = new THREE.Mesh(
    jaggedLathe(
      [[0, -1], [2.6, -1], [2.4, 1.2], [1.9, 2.8], [1.7, 4.4], [1.2, 6.2], [1.35, 7.4], [0.9, 8.6], [0.35, 9.3], [0, 9.4]],
      7,
    ),
    stone(0xc4b394),
  );
  group.add(spire);
  const cap = makeLand({ r: 0.9, h: 0.4, seed: 2, detail: 2 });
  cap.position.y = 9.1;
  group.add(cap);

  const dragons = [
    { d: makeDragon(0x9c3a2e, 0xd0643e), r: 6.5, y: 7.5, speed: 0.42, phase: 0 },
    { d: makeDragon(0x2f5f6a, 0x4f9aa0), r: 8.5, y: 10, speed: -0.33, phase: 2.1 },
    { d: makeDragon(0x5b3f78, 0x9a72c0), r: 5.2, y: 12, speed: 0.5, phase: 4 },
  ];
  for (const { d } of dragons) group.add(d);
  const ahead = new THREE.Vector3();

  return {
    group,
    update(t) {
      for (const { d, r, y, speed, phase } of dragons) {
        const a = t * speed + phase;
        const bob = Math.sin(t * 1.3 + phase) * 0.6;
        d.position.set(Math.cos(a) * r, y + bob, Math.sin(a) * r);
        const a2 = a + Math.sign(speed) * 0.1;
        ahead.set(Math.cos(a2) * r, y + Math.sin((t + 0.2) * 1.3 + phase) * 0.6, Math.sin(a2) * r);
        d.lookAt(ahead.add(group.position));
        d.rotateZ(-Math.sign(speed) * 0.45);
        const flap = Math.sin(t * 5 + phase) * 0.55;
        d.userData.left.rotation.z = flap;
        d.userData.right.rotation.z = -flap;
      }
    },
  };
}

function stripedTop(profile, a, b) {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 16);
  const pos = geo.attributes.position;
  const colors = [];
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  for (let i = 0; i < pos.count; i += 1) {
    const ang = Math.atan2(pos.getZ(i), pos.getX(i));
    const c = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 6) % 2 ? ca : cb;
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.35, flatShading: true }),
  );
}

const TOP = [[0, 0], [0.06, 0.03], [0.32, 0.28], [0.44, 0.4], [0.4, 0.5], [0.14, 0.56], [0.06, 0.78], [0, 0.8]];

/* III. Devran: a stone bowl where two tops fight; sparks when they meet. */
export function devran() {
  const group = new THREE.Group();
  const land = makeLand({ r: 4.4, h: 0.9, seed: 9.2, grass: new THREE.Color("#a4b26a") });
  group.add(land);
  const floor = groundAt(land, 0, 0);
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(
      [[0, 0.05], [0.9, 0.08], [1.7, 0.26], [2.3, 0.58], [2.5, 0.8], [2.75, 0.8], [2.85, 0.4], [2.8, 0]].map(
        ([r, y]) => new THREE.Vector2(r, y),
      ),
      36,
    ),
    new THREE.MeshStandardMaterial({ color: 0xd8c9a4, roughness: 0.6, side: THREE.DoubleSide, flatShading: true }),
  );
  bowl.position.y = floor - 0.1;
  group.add(bowl);

  const tops = [stripedTop(TOP, 0xe0a83e, 0x8a4f1c), stripedTop(TOP, 0x3f9a92, 0x1d4f55)];
  for (const top of tops) {
    top.scale.setScalar(1.5);
    group.add(top);
  }

  const n = 36;
  const sparks = makePoints(n, makePointsMaterial({ color: "#ffd27a", size: 0.12, additive: true }));
  group.add(sparks);
  const vel = Array.from({ length: n }, () => new THREE.Vector3());
  const life = new Float32Array(n);
  let cooldown = 0;
  const hit = new THREE.Vector3();

  const bowlY = (r) => bowl.position.y + 0.05 + r * r * 0.1;

  return {
    group,
    update(t, dt) {
      const r0 = 1.1 + Math.sin(t * 0.7) * 0.35;
      const angles = [t * 1.1, -t * 0.9 + 1];
      tops.forEach((top, i) => {
        const r = i ? 1.35 - Math.sin(t * 0.6) * 0.3 : r0;
        top.position.set(Math.cos(angles[i]) * r, bowlY(r), Math.sin(angles[i]) * r);
        top.rotation.y += dt * (i ? -22 : 25);
        top.rotation.x = Math.sin(t * 3 + i) * 0.12;
        top.rotation.z = Math.cos(t * 2.6 + i) * 0.12;
      });
      const p = sparks.geometry.attributes.position;
      const a = sparks.geometry.attributes.aAlpha;
      cooldown -= dt;
      if (tops[0].position.distanceTo(tops[1].position) < 1.4 && cooldown <= 0) {
        cooldown = 0.5;
        hit.addVectors(tops[0].position, tops[1].position).multiplyScalar(0.5);
        hit.y += 0.5;
        for (let i = 0; i < n; i += 1) {
          p.setXYZ(i, hit.x, hit.y, hit.z);
          vel[i].set(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).multiplyScalar(5);
          life[i] = 0.5 + Math.random() * 0.4;
        }
      }
      for (let i = 0; i < n; i += 1) {
        life[i] = Math.max(0, life[i] - dt);
        vel[i].y -= 9 * dt;
        p.setXYZ(i, p.getX(i) + vel[i].x * dt, p.getY(i) + vel[i].y * dt, p.getZ(i) + vel[i].z * dt);
        a.setX(i, Math.min(1, life[i] * 2.5));
      }
      p.needsUpdate = true;
      a.needsUpdate = true;
    },
  };
}

const ROCK_GREY = new THREE.Color("#8f8270");

function makeCliff() {
  const geo = jaggedLathe(
    [[0, -1], [6.2, -1], [5.8, 0.5], [5.3, 1.8], [5.2, 3.2], [4.7, 4.3], [3.4, 5], [1.6, 5.3], [0, 5.35]],
    41,
    22,
  );
  const pos = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const c = SAND.clone().lerp(ROCK_GREY, THREE.MathUtils.smoothstep(y, 0.1, 0.8));
    c.lerp(new THREE.Color("#7f9a58"), THREE.MathUtils.smoothstep(y, 4.2, 4.9));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }),
  );
  mesh.scale.set(1, 1, 0.8);
  return mesh;
}

/* IV. Kiklop Mağarası: a cliff with a dark cave and one eye that blinks. */
export function kiklop(facing) {
  const rand = seeded(31);
  const group = new THREE.Group();
  const land = makeCliff();
  group.add(land);
  for (const [x, z, sz] of [[-6.6, -0.6, 1.4], [5.6, 2.8, 1.1], [6.2, -2.6, 1.8], [-5.8, -2.6, 1.6]]) {
    const boulder = makeLand({ r: sz, h: sz * 1.2, seed: x * z, grass: ROCK_GREY, rock: ROCK_GREY, rough: 0.5, detail: 1 });
    boulder.position.set(x, -0.2, z);
    group.add(boulder);
  }
  land.updateMatrixWorld(true);

  const dir = facing.clone().setY(0).normalize();
  ray.set(dir.clone().multiplyScalar(30).setY(1.6), dir.clone().negate());
  const hitP = ray.intersectObject(land, false)[0]?.point ?? dir.clone().multiplyScalar(5).setY(1.6);
  const mouth = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x14100c }),
  );
  mouth.scale.set(1.6, 2.1, 1);
  mouth.position.copy(hitP).addScaledVector(dir, 0.35).setY(0.15);
  mouth.lookAt(mouth.position.clone().add(dir));
  group.add(mouth);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffb340 }),
  );
  eye.position.copy(mouth.position).addScaledVector(dir, 0.02).setY(1.15);
  eye.scale.z = 0.3;
  group.add(eye);
  const glow = makePoints(1, makePointsMaterial({ color: "#ff9a30", size: 2.2, additive: true, opacity: 0.55 }));
  glow.geometry.attributes.position.setXYZ(0, eye.position.x, eye.position.y, eye.position.z);
  group.add(glow);

  const wool = stone(0xf4efe2, 0.95);
  const puff = new THREE.IcosahedronGeometry(0.28, 1);
  const sheep = [];
  for (let i = 0; i < 6; i += 1) {
    const x = (rand() - 0.5) * 4.5;
    const z = (rand() - 0.5) * 3.2;
    const s = placeOn(land, new THREE.Mesh(puff, wool), x, z, -0.12);
    s.scale.set(1.3, 0.9, 1);
    s.userData.base = s.position.y;
    s.userData.phase = rand() * 6;
    group.add(s);
    sheep.push(s);
  }

  return {
    group,
    update(t) {
      const cycle = t % 4.2;
      eye.scale.y = cycle > 3.95 ? 0.12 : 1;
      const look = Math.sin(t * 0.5) * 0.12;
      eye.position.x = mouth.position.x + dir.z * look;
      eye.position.z = mouth.position.z - dir.x * look + dir.z * 0.02;
      glow.material.uniforms.uOpacity.value = eye.scale.y * (0.45 + Math.sin(t * 2) * 0.1);
      for (const s of sheep) s.position.y = s.userData.base + Math.abs(Math.sin(t * 2 + s.userData.phase)) * 0.06;
    },
  };
}

function makeShip() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 3, 6, 1, false, 0, Math.PI), stone(0x6b4a2e, 0.8));
  hull.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  hull.position.y = 0.35;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.6, 5), stone(0x5a3e26));
  mast.position.y = 1.6;
  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.4, 4, 4),
    new THREE.MeshStandardMaterial({ color: 0xf2e6cc, side: THREE.DoubleSide, roughness: 0.9 }),
  );
  sail.position.set(0, 1.9, 0.06);
  g.add(hull, mast, sail);
  g.userData.sail = sail;
  return g;
}

/* V. Sirenler Geçidi: twin rocks, a passing ship, mist and song rings. */
export function sirenler() {
  const rand = seeded(53);
  const group = new THREE.Group();
  const rocks = [
    { x: -3.4, h: 6.5, seed: 12 },
    { x: 3.2, h: 4.8, seed: 19 },
  ];
  for (const { x, h, seed } of rocks) {
    const geo = jaggedLathe([[0, -1], [1.9, -1], [1.6, h * 0.3], [1.1, h * 0.6], [0.5, h * 0.9], [0, h]], seed, 12);
    const m = new THREE.Mesh(geo, stone(0x9a8f86));
    m.position.x = x;
    m.rotation.z = (rand() - 0.5) * 0.15;
    group.add(m);
  }
  const ship = makeShip();
  group.add(ship);

  const mistN = 46;
  const mist = makePoints(mistN, makePointsMaterial({ color: "#ffffff", size: 3.2, opacity: 0.32 }));
  const mistSeeds = Array.from({ length: mistN }, () => [rand() * 16 - 8, rand() * 1.6 + 0.3, rand() * 10 - 5, rand()]);
  group.add(mist);

  const glowN = 8;
  const glows = makePoints(glowN, makePointsMaterial({ color: "#ff9cc0", size: 0.55, additive: true }));
  for (let i = 0; i < glowN; i += 1) {
    const rock = rocks[i % 2];
    glows.geometry.attributes.position.setXYZ(i, rock.x + (rand() - 0.5) * 1.6, 0.8 + rand() * rock.h * 0.6, 1 + rand() * 0.8);
  }
  group.add(glows);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd6e4, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const rings = Array.from({ length: 3 }, (_, i) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 48), ringMat.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.userData.offset = i / 3;
    group.add(ring);
    return ring;
  });

  return {
    group,
    update(t) {
      const sx = Math.sin(t * 0.12) * 1.4;
      ship.position.set(sx, Math.sin(t * 1.1) * 0.08, 2.2);
      ship.rotation.z = Math.sin(t * 0.9) * 0.05;
      ship.rotation.y = Math.cos(t * 0.12) * 0.25;
      ship.userData.sail.rotation.y = Math.sin(t * 0.7) * 0.12;
      const p = mist.geometry.attributes.position;
      mistSeeds.forEach(([x, y, z, s], i) => p.setXYZ(i, x + Math.sin(t * 0.1 + s * 6) * 1.5, y, z));
      p.needsUpdate = true;
      const a = glows.geometry.attributes.aAlpha;
      for (let i = 0; i < glowN; i += 1) a.setX(i, 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.6 + i * 1.3)));
      a.needsUpdate = true;
      for (const ring of rings) {
        const k = (t * 0.22 + ring.userData.offset) % 1;
        ring.scale.setScalar(1 + k * 9);
        ring.position.set(rocks[0].x, 0.25, 0);
        ring.material.opacity = (1 - k) * 0.35;
      }
    },
  };
}

/* Gulls that drift along the whole route. */
export function gulls(count, spanZ) {
  const group = new THREE.Group();
  const rand = seeded(77);
  const wing = new THREE.PlaneGeometry(0.5, 0.12);
  wing.translate(0.25, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0x3b4a42, side: THREE.DoubleSide });
  const birds = Array.from({ length: count }, () => {
    const b = new THREE.Group();
    const l = new THREE.Mesh(wing, mat);
    const r = new THREE.Mesh(wing, mat);
    r.scale.x = -1;
    b.add(l, r);
    b.userData = { l, r, cx: rand() * 30 - 15, cz: -rand() * spanZ, rad: 3 + rand() * 6, y: 6 + rand() * 6, sp: 0.2 + rand() * 0.25, ph: rand() * 6 };
    group.add(b);
    return b;
  });
  return {
    group,
    update(t) {
      for (const b of birds) {
        const u = b.userData;
        const a = t * u.sp + u.ph;
        b.position.set(u.cx + Math.cos(a) * u.rad, u.y + Math.sin(t + u.ph) * 0.4, u.cz + Math.sin(a) * u.rad);
        b.rotation.y = -a;
        const f = Math.sin(t * 7 + u.ph) * 0.5;
        u.l.rotation.y = f;
        u.r.rotation.y = -f;
      }
    },
  };
}
