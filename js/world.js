import * as THREE from "three";
import { FOG_DENSITY, HORIZON, makeSea, makeSky } from "./sea.js";
import { devran, gulls, kiklop, lotophagoi, sirenler, wyrmwar } from "./islands.js";

// Scroll-driven voyage across the archipelago. Every <section data-stop>
// in the page maps to one camera stop below, in document order.

const ISLANDS = {
  lotophagoi: new THREE.Vector3(-6, 0, 0),
  wyrmwar: new THREE.Vector3(10, 0, -20),
  devran: new THREE.Vector3(-8, 0, -40),
  kiklop: new THREE.Vector3(11, 0, -60),
  sirenler: new THREE.Vector3(-4, 0, -80),
};

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const at = (key, x, y, z) => ISLANDS[key].clone().add(v(x, y, z));

// side: +1 frames the subject to the right of the panel, -1 to the left.
const STOPS = {
  top: { pos: v(-16, 13, 24), look: v(5, 0, -30), side: 0.75 },
  lotophagoi: { pos: at("lotophagoi", 10, 3.6, 11), look: at("lotophagoi", 0, 1.2, 0), side: 1 },
  wyrmwar: { pos: at("wyrmwar", -24, 8, 14), look: at("wyrmwar", 0, 6.5, 0), side: -1 },
  devran: { pos: at("devran", 9.5, 6.5, 11.5), look: at("devran", 0, 0.5, 0), side: 1 },
  kiklop: { pos: at("kiklop", 17, 4.5, 17), look: at("kiklop", 0, 2.6, 0), side: -1 },
  sirenler: { pos: at("sirenler", -14, 4.2, 18), look: at("sirenler", 0, 2.6, 0), side: 1 },
  studio: { pos: v(2, 10, -92), look: v(0, 6, -200), side: 0 },
};

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const smooth = (f) => f * f * (3 - 2 * f);

export function createWorld(canvas, sections) {
  if (reduced()) return null;
  const small = () => window.innerWidth < 800;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small() ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = HORIZON;
  scene.fog = new THREE.FogExp2(HORIZON, FOG_DENSITY);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 900);

  scene.add(new THREE.HemisphereLight(0xf4f0d8, 0x2f6a5a, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0cf, 2.6);
  sun.position.set(-20, 30, 25);
  scene.add(sun);
  const back = new THREE.DirectionalLight(0xffd59a, 0.9);
  back.position.set(8, 6, -120);
  scene.add(back);

  scene.add(makeSky());
  const sea = makeSea(small() ? 140 : 220);
  scene.add(sea);

  const builders = { lotophagoi, wyrmwar, devran, sirenler };
  const actors = [];
  for (const [key, build] of Object.entries(builders)) {
    const actor = build();
    actor.group.position.copy(ISLANDS[key]);
    scene.add(actor.group);
    actors.push(actor);
  }
  const facing = STOPS.kiklop.pos.clone().sub(ISLANDS.kiklop);
  const cave = kiklop(facing);
  cave.group.position.copy(ISLANDS.kiklop);
  scene.add(cave.group);
  actors.push(cave);
  const birds = gulls(small() ? 6 : 12, 90);
  scene.add(birds.group);
  actors.push(birds);

  // Camera path through the stops that exist on the page.
  const keys = sections.map((s) => s.dataset.stop).filter((k) => STOPS[k]);
  const stops = keys.map((k) => STOPS[k]);
  const posCurve = new THREE.CatmullRomCurve3(stops.map((s) => s.pos), false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(stops.map((s) => s.look), false, "centripetal");
  const last = stops.length - 1;

  let anchors = [];
  const measure = () => {
    anchors = sections
      .filter((s) => STOPS[s.dataset.stop])
      .map((s) => {
        const r = s.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
      });
    anchors[0] = 0;
  };
  const target = () => {
    const y = window.scrollY;
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < last; i += 1) {
      if (y < anchors[i + 1]) return i + smooth((y - anchors[i]) / (anchors[i + 1] - anchors[i]));
    }
    return last;
  };

  const pointer = new THREE.Vector2();
  const sway = new THREE.Vector2();
  const onMove = (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const pointScale = () => window.innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const syncPoints = () => {
    const k = pointScale();
    scene.traverse((o) => {
      if (o.isPoints && o.material.uniforms?.uScale) o.material.uniforms.uScale.value = k;
    });
  };

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = camera.aspect < 0.8 ? 58 : 40;
    renderer.setSize(window.innerWidth, window.innerHeight);
    measure();
    syncPoints();
  };
  window.addEventListener("resize", onResize);
  onResize();

  let progress = target();
  let side = stops[0].side;
  const timer = new THREE.Timer();
  timer.connect(document);
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let running = true;
  let frame = 0;

  const tick = (now) => {
    frame = requestAnimationFrame(tick);
    if (!running) return;
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    progress += (target() - progress) * (1 - Math.exp(-dt * 3.2));
    const u = progress / last;
    posCurve.getPoint(u, pos);
    lookCurve.getPoint(u, look);
    // Portrait screens are narrow: step back so the island fits.
    if (camera.aspect < 0.8 && pos.distanceTo(look) < 40) pos.sub(look).multiplyScalar(1.2).add(look);
    const frac = progress - Math.floor(progress);
    pos.y += Math.sin(frac * Math.PI) * 3.5;

    sway.lerp(pointer, 1 - Math.exp(-dt * 2));
    pos.x += sway.x * 0.8 + Math.sin(t * 0.2) * 0.15;
    pos.y += -sway.y * 0.4 + Math.cos(t * 0.17) * 0.1;
    camera.position.copy(pos);
    camera.lookAt(look);

    const i = Math.min(Math.floor(progress), last - 1);
    const wantSide = THREE.MathUtils.lerp(stops[i].side, stops[i + 1]?.side ?? 0, smooth(progress - i));
    side += (wantSide - side) * (1 - Math.exp(-dt * 4));
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (camera.aspect < 0.8) {
      camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    } else {
      camera.setViewOffset(w, h, -side * w * 0.2, 0, w, h);
    }

    sea.material.uniforms.uTime.value = t;
    for (const a of actors) a.update(t, dt);
    renderer.render(scene, camera);
  };
  tick(performance.now());

  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState === "visible";
  });
  // Fonts and images can shift section heights after load.
  window.addEventListener("load", measure);

  return {
    dispose() {
      cancelAnimationFrame(frame);
      timer.dispose();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    },
  };
}
