import * as THREE from "three";

// Sky dome, sun and the shared sea. Colours come from the site palette:
// grove green at the zenith, warm cream at the horizon, Aegean teal water.

export const HORIZON = new THREE.Color("#f2ecd2");
export const FOG_DENSITY = 0.0088;
export const SUN_DIR = new THREE.Vector3(0.12, 0.1, -1).normalize();

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
    float s = max(dot(d, uSunDir), 0.0);
    col = mix(col, uSun, pow(s, 6.0) * 0.55);
    col += uSun * smoothstep(0.9985, 0.9992, s) * 0.9;
    col = mix(col, uHorizon, smoothstep(0.02, -0.12, d.y));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uZenith: { value: new THREE.Color("#bfdfc4") },
      uHorizon: { value: HORIZON },
      uSun: { value: new THREE.Color("#ffe2a6") },
      uSunDir: { value: SUN_DIR },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return sky;
}

const SEA_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vCrest;

  float wave(vec2 p, float t) {
    return sin(p.x * 0.21 + t * 0.62) * 0.16
      + sin(p.y * 0.17 - t * 0.48) * 0.13
      + sin((p.x + p.y) * 0.43 + t * 0.95) * 0.05
      + sin((p.x - p.y * 0.6) * 0.9 + t * 1.4) * 0.018;
  }

  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vec2 q = w.xz;
    float e = 0.25;
    float h = wave(q, uTime);
    float hx = wave(q + vec2(e, 0.0), uTime);
    float hz = wave(q + vec2(0.0, e), uTime);
    w.y += h;
    vNormalW = normalize(vec3(h - hx, e, h - hz));
    vCrest = smoothstep(0.12, 0.3, h);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const SEA_FRAG = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform vec3 uFog;
  uniform float uFogDensity;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vCrest;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 view = toCam / dist;
    float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    vec3 col = mix(uDeep, uShallow, 0.25 + n.x * 0.35 + n.z * 0.2);
    col = mix(col, uSky, clamp(fres * 0.6, 0.0, 0.5));
    col += vec3(0.95, 0.97, 0.9) * vCrest * 0.12;
    float spec = pow(max(dot(reflect(-view, n), uSunDir), 0.0), 90.0);
    col += uSun * spec * 1.1;
    float glint = pow(max(dot(reflect(-view, n), uSunDir), 0.0), 12.0);
    col += uSun * glint * 0.12;
    float f = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
    col = mix(col, uFog, clamp(f, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function makeSea(segments) {
  const geo = new THREE.PlaneGeometry(420, 420, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#17636e") },
      uShallow: { value: new THREE.Color("#5fc4b0") },
      uSky: { value: new THREE.Color("#cfe6d4") },
      uSun: { value: new THREE.Color("#fff0c8") },
      uSunDir: { value: SUN_DIR },
      uFog: { value: HORIZON },
      uFogDensity: { value: FOG_DENSITY },
    },
    vertexShader: SEA_VERT,
    fragmentShader: SEA_FRAG,
  });
  const sea = new THREE.Mesh(geo, mat);
  sea.position.set(0, 0, -40);
  sea.frustumCulled = false;
  return sea;
}

// Soft round points: used for mist, siren glows, petals and sparks.
export function makePointsMaterial({ color, size, additive = false, opacity = 1 }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uScale: { value: window.innerHeight / 2 },
    },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      uniform float uSize;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = pow(1.0 - d * 2.0, 1.8) * vAlpha * uOpacity;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

export function makePoints(count, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const alpha = new Float32Array(count).fill(1);
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return points;
}
