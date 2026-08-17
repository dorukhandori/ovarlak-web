import * as THREE from "three";

const GROVE = 0xd7ebc8;
const MOSS = new THREE.Color("#3f8f55");
const LEAF = new THREE.Color("#6fbf6a");
const POLLEN = new THREE.Color("#e7f3a8");
const PETAL = new THREE.Color("#f0b7c4");

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isFinePointer = () => window.matchMedia("(hover: hover)").matches;

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRipple;
  uniform float uRippleAmp;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vFoam;

  float wave(vec2 p, float t) {
    return sin(p.x * 0.48 + t * 0.72) * 0.06
      + sin(p.y * 0.36 - t * 0.58) * 0.05
      + sin((p.x + p.y) * 0.82 + t * 1.05) * 0.022;
  }

  void main() {
    vec3 p = position;
    p.z += wave(p.xy, uTime);
    float d = length(p.xy - uRipple);
    p.z += sin(d * 5.2 - uTime * 3.8) * exp(-d * 0.65) * uRippleAmp;
    vec3 px = vec3(p.x + 0.14, p.y, position.z + wave(vec2(p.x + 0.14, p.y), uTime));
    vec3 py = vec3(p.x, p.y + 0.14, position.z + wave(vec2(p.x, p.y + 0.14), uTime));
    vNormalW = normalize(mat3(modelMatrix) * normalize(cross(px - p, py - p)));
    vFoam = smoothstep(0.02, 0.09, p.z);
    vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WATER_FRAG = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uCam;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vFoam;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 view = normalize(uCam - vWorld);
    float fres = pow(1.0 - max(dot(n, view), 0.0), 2.4);
    vec3 col = mix(uDeep, uShallow, fres * 0.75 + 0.18);
    col = mix(col, uSky, fres * 0.45);
    col += vec3(0.92, 0.97, 0.9) * vFoam * 0.28;
    float spec = pow(max(dot(reflect(-view, n), vec3(0.35, 0.82, 0.4)), 0.0), 36.0);
    col += vec3(0.95, 0.98, 0.88) * spec * 0.55;
    gl_FragColor = vec4(col, 0.92);
  }
`;

function makeLotus(scale = 1) {
  const group = new THREE.Group();
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xf4c2ce,
    roughness: 0.42,
    metalness: 0.02,
    emissive: 0x7a3040,
    emissiveIntensity: 0.08,
  });
  const petalGeo = new THREE.SphereGeometry(0.22, 16, 12);
  petalGeo.scale(1, 0.2, 0.58);
  for (let i = 0; i < 8; i += 1) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    const a = (i / 8) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.18, 0.05, Math.sin(a) * 0.18);
    petal.rotation.y = a;
    petal.rotation.z = 0.38;
    group.add(petal);
  }
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf0d056,
      roughness: 0.32,
      emissive: 0x8a6a10,
      emissiveIntensity: 0.28,
    }),
  );
  center.position.y = 0.07;
  group.add(center);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.54, 0.03, 22),
    new THREE.MeshStandardMaterial({ color: 0x3d8a52, roughness: 0.78 }),
  );
  pad.position.y = -0.03;
  group.add(pad);
  group.scale.setScalar(scale);
  return group;
}

function makeColumn(height = 2.6, broken = false) {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({
    color: 0xefe4cc,
    roughness: 0.74,
    metalness: 0.04,
  });
  const h = broken ? height * 0.55 : height;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, h, 14), stone);
  shaft.position.y = h / 2;
  group.add(shaft);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.12, 16), stone);
  base.position.y = 0.06;
  group.add(base);
  if (!broken) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.52), stone);
    cap.position.y = h + 0.04;
    group.add(cap);
  } else {
    shaft.rotation.z = 0.08;
    shaft.rotation.x = 0.04;
  }
  return group;
}

function makeCanopy() {
  const group = new THREE.Group();
  const colors = [0x3a7d44, 0x4f9a52, 0x2d6238, 0x6bb35c, 0x88c56a];
  const geo = new THREE.SphereGeometry(1, 14, 12);
  for (let i = 0; i < 16; i += 1) {
    const mat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      roughness: 0.92,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
    mesh.position.set(
      Math.cos(a) * (0.35 + Math.random() * 1.15),
      Math.random() * 0.95,
      Math.sin(a) * (0.25 + Math.random() * 0.9),
    );
    mesh.scale.set(
      0.38 + Math.random() * 0.45,
      0.28 + Math.random() * 0.38,
      0.38 + Math.random() * 0.45,
    );
    group.add(mesh);
  }
  return group;
}

function makeMossRock() {
  const geo = new THREE.IcosahedronGeometry(1.35, 5);
  const pos = geo.attributes.position;
  const colors = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const n =
      0.22 *
      Math.sin(v.x * 3.6 + v.z * 2.8) *
      Math.cos(v.y * 4.1 + v.x * 1.7);
    v.addScaledVector(v.clone().normalize(), n);
    if (v.y < -0.15) v.y *= 0.42;
    pos.setXYZ(i, v.x, v.y, v.z);
    const moss = THREE.MathUtils.smoothstep(v.y, -0.2, 0.7);
    const c = new THREE.Color().lerpColors(
      new THREE.Color("#cbb892"),
      new THREE.Color("#3d8a4a"),
      moss * 0.85 + Math.random() * 0.08,
    );
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: false,
    }),
  );
}

function makeGrass(count) {
  const geo = new THREE.ConeGeometry(0.035, 0.55, 4);
  geo.translate(0, 0.275, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4ea056,
    roughness: 0.8,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(
      (Math.random() - 0.2) * 6.5,
      -0.02,
      (Math.random() - 0.45) * 4.5,
    );
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.rotation.z = (Math.random() - 0.5) * 0.2;
    dummy.scale.setScalar(0.55 + Math.random() * 0.9);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    seeds.push(Math.random() * Math.PI * 2);
  }
  mesh.userData = { dummy, seeds };
  return mesh;
}

function makeButterfly() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc6e86a,
    side: THREE.DoubleSide,
    roughness: 0.45,
    emissive: 0x4a7a20,
    emissiveIntensity: 0.2,
  });
  const geo = new THREE.PlaneGeometry(0.22, 0.14);
  const left = new THREE.Mesh(geo, mat);
  const right = new THREE.Mesh(geo, mat);
  left.position.x = -0.1;
  right.position.x = 0.1;
  left.rotation.y = 0.4;
  right.rotation.y = -0.4;
  group.add(left, right);
  group.userData = { left, right };
  return group;
}

function makeParticles(count) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.25) * 12;
    positions[i * 3 + 1] = Math.random() * 5.2 - 0.2;
    positions[i * 3 + 2] = (Math.random() - 0.25) * 8;
    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = 0.45 + Math.random() * 1.2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector3(1.4, 1.0, 1.6) },
      uA: { value: LEAF },
      uB: { value: POLLEN },
      uC: { value: PETAL },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform vec3 uPointer;
      varying float vMix;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * aSeed.w + aSeed.x * 6.2) * 0.18;
        p.x += cos(uTime * 0.22 + aSeed.y * 7.0) * 0.14;
        vec3 to = uPointer - p;
        float d = length(to);
        float pull = smoothstep(2.6, 0.12, d);
        vec3 orbit = normalize(cross(to, vec3(0.0, 1.0, 0.0)) + vec3(0.001));
        p += to * pull * 0.2 + orbit * pull * 0.62;
        vMix = aSeed.z;
        vAlpha = 0.32 + pull * 0.68;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (aSeed.w * 5.5 + pull * 9.0) * (150.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uA;
      uniform vec3 uB;
      uniform vec3 uC;
      varying float vMix;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = pow(1.0 - d * 2.0, 1.6);
        vec3 col = mix(uA, mix(uB, uC, step(0.66, vMix)), vMix);
        gl_FragColor = vec4(col * glow, glow * vAlpha);
      }
    `,
  });
  return new THREE.Points(geo, mat);
}

export function createWorld(canvas) {
  if (reduced()) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(GROVE, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GROVE);
  scene.fog = new THREE.Fog(GROVE, 11, 32);

  const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    80,
  );
  const camHome = new THREE.Vector3(-3.05, 1.55, 7.6);
  camera.position.copy(camHome);
  const lookAt = new THREE.Vector3(1.55, 0.55, 0.1);

  scene.add(new THREE.AmbientLight(0xeaf3d8, 0.85));
  scene.add(new THREE.HemisphereLight(0xe7f2c8, 0x3d6b3a, 0.72));
  const sun = new THREE.DirectionalLight(0xfff4d2, 2.15);
  sun.position.set(6.5, 8.2, 4.2);
  scene.add(sun);
  const bounce = new THREE.PointLight(0x8fd99a, 8, 18, 1.4);
  bounce.position.set(1.2, 0.4, 3.2);
  scene.add(bounce);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 24, 130, 90),
    new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uRipple: { value: new THREE.Vector2(1.4, 0.8) },
        uRippleAmp: { value: 0 },
        uDeep: { value: new THREE.Color("#1b7a62") },
        uShallow: { value: new THREE.Color("#7ee0b2") },
        uSky: { value: new THREE.Color("#e5f2c4") },
        uCam: { value: camera.position },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(1.2, -0.55, 1.4);
  scene.add(water);

  const rock = makeMossRock();
  rock.position.set(2.15, -0.15, -0.35);
  rock.scale.set(2.15, 1.35, 1.85);
  rock.rotation.y = -0.35;
  scene.add(rock);

  const colA = makeColumn(2.7, false);
  colA.position.set(0.42, -0.48, 0.55);
  colA.rotation.y = 0.18;
  scene.add(colA);
  const colB = makeColumn(2.2, true);
  colB.position.set(2.85, -0.32, -0.55);
  colB.rotation.y = -0.22;
  scene.add(colB);

  const canopy = makeCanopy();
  canopy.position.set(3.4, 1.85, -0.4);
  canopy.scale.setScalar(1.35);
  scene.add(canopy);
  const canopy2 = makeCanopy();
  canopy2.position.set(1.1, 2.15, -1.6);
  canopy2.scale.setScalar(0.85);
  scene.add(canopy2);

  const lotuses = [];
  const spots = [
    [-1.6, -0.5, 2.6, 0.72],
    [-0.55, -0.52, 3.35, 0.48],
    [0.7, -0.51, 2.15, 0.58],
    [3.55, -0.5, 2.4, 0.8],
    [2.55, -0.52, 3.2, 0.42],
    [4.15, -0.51, 1.55, 0.5],
    [-2.35, -0.53, 1.7, 0.4],
  ];
  for (const [x, y, z, s] of spots) {
    const lotus = makeLotus(s);
    lotus.position.set(x, y, z);
    lotus.userData.phase = Math.random() * Math.PI * 2;
    scene.add(lotus);
    lotuses.push(lotus);
  }

  const grass = makeGrass(window.innerWidth < 800 ? 70 : 140);
  grass.position.set(1.6, -0.48, 0.2);
  scene.add(grass);

  const butterfly = makeButterfly();
  scene.add(butterfly);

  const particles = makeParticles(window.innerWidth < 800 ? 180 : 420);
  scene.add(particles);

  const pointerNdc = new THREE.Vector2(0.15, 0.05);
  const pointerWorld = new THREE.Vector3(1.4, 1.0, 1.6);
  const targetOrbit = new THREE.Vector2(0, 0);
  const orbit = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.55);
  const hit = new THREE.Vector3();
  let rippleAmp = 0;
  let running = true;

  const onMove = (event) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    pointerNdc.set(x, y);
    targetOrbit.set(x * 0.9, y * 0.55);
    raycaster.setFromCamera(pointerNdc, camera);
    if (raycaster.ray.intersectPlane(waterPlane, hit)) {
      water.material.uniforms.uRipple.value.set(hit.x, -hit.z);
      rippleAmp = isFinePointer() ? 0.16 : 0.09;
      pointerWorld.set(hit.x, 0.85, hit.z);
    } else {
      pointerWorld.set(x * 3.4, y * 1.7 + 0.7, 1.4);
    }
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();
  let frame = 0;

  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (!running) return;
    const t = clock.getElapsedTime();
    orbit.lerp(targetOrbit, 0.05);

    camera.position.lerp(
      new THREE.Vector3(
        camHome.x + orbit.x * 0.95 + Math.sin(t * 0.15) * 0.08,
        camHome.y + orbit.y * 0.4 + Math.cos(t * 0.12) * 0.05,
        camHome.z + Math.abs(orbit.x) * 0.14,
      ),
      0.07,
    );
    camera.lookAt(
      lookAt.x + orbit.x * 0.2,
      lookAt.y + orbit.y * 0.1,
      lookAt.z,
    );

    water.material.uniforms.uTime.value = t;
    water.material.uniforms.uRippleAmp.value = rippleAmp;
    water.material.uniforms.uCam.value.copy(camera.position);
    rippleAmp *= 0.955;

    rock.rotation.y = -0.35 + Math.sin(t * 0.12) * 0.02;
    canopy.rotation.y = Math.sin(t * 0.08) * 0.04;
    canopy.position.y = 1.85 + Math.sin(t * 0.7) * 0.04;

    for (const lotus of lotuses) {
      lotus.position.y =
        -0.51 + Math.sin(t * 0.8 + lotus.userData.phase) * 0.035;
      lotus.rotation.y = Math.sin(t * 0.14 + lotus.userData.phase) * 0.2;
    }

    const { left, right } = butterfly.userData;
    const flap = 0.55 + Math.sin(t * 14) * 0.55;
    left.rotation.y = flap;
    right.rotation.y = -flap;
    butterfly.position.set(
      1.15 + Math.sin(t * 0.45) * 1.6,
      1.05 + Math.sin(t * 0.7) * 0.35,
      1.4 + Math.cos(t * 0.38) * 1.1,
    );
    butterfly.rotation.y = t * 0.45;
    butterfly.rotation.z = Math.sin(t * 0.8) * 0.15;

    particles.material.uniforms.uTime.value = t;
    particles.material.uniforms.uPointer.value.lerp(pointerWorld, 0.12);

    renderer.render(scene, camera);
  };
  tick();

  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState === "visible";
    if (running) clock.getDelta();
  });

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    },
  };
}
