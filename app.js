/* ============================================================
   Sumanya's World — app.js
   3D solar system hero (Three.js) + quizzes, giggles, knock-knock,
   which-came-first, stars, sounds and confetti. No frameworks.
   ============================================================ */
import * as THREE from "./assets/vendor/three.module.min.js";

const DATA = window.SUMANYA_DATA;
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

const NOANIM = new URLSearchParams(location.search).has("noanim") ||
  (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
if (NOANIM) document.documentElement.classList.add("noanim");

/* ---------- tiny helpers ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
};

/* ---------- stars ---------- */
let stars = store.get("sumanya_stars_v1", 0);
const starCountEl = qs("#starCount");
const starCounterEl = qs("#starCounter");
function renderStars() { starCountEl.textContent = stars; }
function addStars(n, fromEl) {
  stars += n;
  store.set("sumanya_stars_v1", stars);
  renderStars();
  starCounterEl.classList.remove("bump");
  void starCounterEl.offsetWidth;
  starCounterEl.classList.add("bump");
  if (fromEl) confettiAt(fromEl, 14);
}
renderStars();

/* ---------- sounds (tiny WebAudio blips, mutable) ---------- */
let audioCtx = null;
let muted = store.get("sumanya_muted", false);
const soundToggle = qs("#soundToggle");
function renderMute() { soundToggle.textContent = muted ? "🔇" : "🔊"; }
renderMute();
soundToggle.addEventListener("click", () => { muted = !muted; store.set("sumanya_muted", muted); renderMute(); if (!muted) sfx.ding(); });
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
document.addEventListener("pointerdown", ensureAudio, { once: true, capture: true });
function tone(freq, dur, type = "sine", when = 0, vol = 0.12, slideTo = null) {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  ding() { tone(620, 0.11); tone(930, 0.16, "sine", 0.09); },
  buzz() { tone(160, 0.2, "square", 0, 0.07); },
  pop() { tone(340, 0.07, "triangle", 0, 0.1, 520); },
  knock() { tone(130, 0.07, "square", 0, 0.14); tone(110, 0.07, "square", 0.16, 0.14); },
  tada() { tone(520, 0.12); tone(660, 0.12, "sine", 0.11); tone(780, 0.22, "sine", 0.22); }
};

/* ---------- confetti ---------- */
const PARTY = ["#fbbf24", "#f472b6", "#8b5cf6", "#2dd4bf", "#fb923c", "#4cc9f0"];
function confettiAt(target, n = 22) {
  if (NOANIM) return;
  let x, y;
  if (target instanceof Element) {
    const r = target.getBoundingClientRect();
    x = r.left + r.width / 2; y = r.top + r.height / 2;
  } else { x = target.x; y = target.y; }
  for (let i = 0; i < n; i++) {
    const b = document.createElement("span");
    b.className = "party-bit";
    b.style.left = x + "px"; b.style.top = y + "px";
    b.style.background = PARTY[i % PARTY.length];
    b.style.setProperty("--dx", (Math.random() * 240 - 120) + "px");
    b.style.setProperty("--dy", (Math.random() * -180 - 20) + "px");
    b.style.setProperty("--rot", (Math.random() * 540 - 270) + "deg");
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 950);
  }
}

/* ============================================================
   3D SOLAR SYSTEM
   ============================================================ */
const planetByKey = {};
DATA.planets.forEach(p => { planetByKey[p.key] = p; });

const BODIES = [
  { key: "sun", r: 8, orbit: 0, speed: 0, spin: 0.02, type: "sun" },
  { key: "mercury", r: 1.05, orbit: 15, speed: 0.62, spin: 0.14, type: "rock", colors: ["#9c8e7f", "#7a6f63", "#b7a897"] },
  { key: "venus", r: 1.65, orbit: 20.5, speed: 0.45, spin: 0.10, type: "band", colors: ["#e8c07f", "#d9a25f", "#f4d9a8"] },
  { key: "earth", r: 1.75, orbit: 27, speed: 0.36, spin: 0.30, type: "earth" },
  { key: "moon", r: 0.5, orbit: 3.4, speed: 1.5, spin: 0.1, type: "rock", parent: "earth", colors: ["#cfd2d9", "#9aa0ad", "#e8eaf0"], noLabel: true },
  { key: "mars", r: 1.35, orbit: 33.5, speed: 0.30, spin: 0.28, type: "rock", colors: ["#d1683f", "#a84a2a", "#e08a5f"] },
  { key: "jupiter", r: 4.9, orbit: 44, speed: 0.20, spin: 0.45, type: "band", colors: ["#e8c9a0", "#c98d5f", "#f4e3c0", "#b06f4a"], spot: "#c94f30" },
  { key: "saturn", r: 4.1, orbit: 57, speed: 0.16, spin: 0.42, type: "band", colors: ["#efe0b5", "#d9c28a", "#f7ecd0"], ring: { inner: 5.6, outer: 8.8, opacity: 0.95 }, tiltZ: 0.32 },
  { key: "uranus", r: 2.5, orbit: 68, speed: 0.12, spin: 0.3, type: "band", colors: ["#9fe8ef", "#7fd4e0", "#c2f2f7"], ring: { inner: 3.3, outer: 4.7, opacity: 0.35 }, tiltZ: 1.48 },
  { key: "neptune", r: 2.4, orbit: 77, speed: 0.10, spin: 0.3, type: "band", colors: ["#4f74e8", "#3a55c9", "#7f9bf4"] },
  { key: "pluto", r: 0.85, orbit: 85, speed: 0.08, spin: 0.1, type: "rock", colors: ["#cbb8d9", "#a893bd", "#e8dcf2"], orbitTilt: 0.18 }
];

/* --- procedural canvas textures (stylized, no downloads needed) --- */
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function bandTexture(colors, spot) {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, w, h);
    const bands = 9 + Math.floor(Math.random() * 4);
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.75;
      const y = (i / bands) * h;
      const bh = h / bands * (0.7 + Math.random() * 0.7);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const wob = Math.sin(x / w * Math.PI * 4 + i * 2) * 5;
        x === 0 ? ctx.moveTo(x, y + wob) : ctx.lineTo(x, y + wob);
      }
      ctx.lineTo(w, y + bh); ctx.lineTo(0, y + bh);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (spot) {
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(w * 0.68, h * 0.62, 42, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.beginPath();
      ctx.ellipse(w * 0.68, h * 0.62, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
function rockTexture(colors) {
  return canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 380; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.globalAlpha = 0.25 + Math.random() * 0.4;
      const r = Math.random() * 5 + 1;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.28;
    for (let i = 0; i < 10; i++) {
      const r = Math.random() * 9 + 4;
      const x = Math.random() * w, y = Math.random() * h;
      ctx.strokeStyle = "rgba(0,0,0,.5)";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}
function earthTexture() {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1d6fd1"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2e9e4f";
    for (let i = 0; i < 9; i++) {
      const x = Math.random() * w, y = h * 0.2 + Math.random() * h * 0.6;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const rr = 18 + Math.random() * 30;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.7;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillRect(0, 0, w, 14); ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + Math.random() * 22, 5 + Math.random() * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
function sunTexture() {
  return canvasTex(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffdd55"); g.addColorStop(0.5, "#ffaa22"); g.addColorStop(1, "#ffdd55");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,120,20,.35)" : "rgba(255,240,150,.4)";
      const r = Math.random() * 10 + 2;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
function glowTexture(color) {
  return canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
function ringTexture() {
  return canvasTex(256, 16, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const a = 0.25 + 0.7 * Math.abs(Math.sin(t * 26)) * (1 - t * 0.4);
      ctx.fillStyle = `rgba(226, 210, 168, ${a.toFixed(3)})`;
      ctx.fillRect(x, 0, 1, h);
    }
  });
}

/* --- scene setup --- */
const stageEl = qs("#heroStage");
const canvas = qs("#space3d");
const labelLayer = qs("#heroLabels");
const scene3d = { ok: false, renderOnce: () => {} };

function initSolarSystem() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  } catch (e) {
    console.warn("WebGL unavailable, using poster fallback", e);
    canvas.style.display = "none";
    stageEl.style.background = "url('assets/solar-poster.webp') center/cover no-repeat, #0b1026";
    return;
  }
  renderer.setClearColor(0x0b1026, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 2000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sunLight = new THREE.PointLight(0xffffff, 2.6, 0, 0);
  scene.add(sunLight);

  /* starfield (two layers) + nebulas */
  function starLayer(count, size, spread) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(spread * (0.55 + Math.random() * 0.45));
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: false, transparent: true, opacity: 0.9 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return mat;
  }
  const starsA = starLayer(900, 1.7, 700);
  const starsB = starLayer(700, 1.0, 700);
  starsB.color = new THREE.Color(0x9db4ff);

  const nebulaColors = ["rgba(139,92,246,.85)", "rgba(244,114,182,.7)", "rgba(45,212,191,.6)", "rgba(67,97,238,.8)"];
  nebulaColors.forEach((col, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(col), transparent: true, opacity: 0.16,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const a = i / nebulaColors.length * Math.PI * 2;
    sp.position.set(Math.cos(a) * 260, (Math.random() - 0.5) * 160, Math.sin(a) * 260 - 120);
    sp.scale.setScalar(260 + Math.random() * 120);
    scene.add(sp);
  });

  /* bodies */
  const meshes = [];
  const bodyState = {};
  const ringTex = ringTexture();

  BODIES.forEach(b => {
    let tex;
    if (b.type === "sun") tex = sunTexture();
    else if (b.type === "earth") tex = earthTexture();
    else if (b.type === "band") tex = bandTexture(b.colors, b.spot);
    else tex = rockTexture(b.colors);

    const geo = new THREE.SphereGeometry(b.r, 40, 24);
    const mat = b.type === "sun"
      ? new THREE.MeshBasicMaterial({ map: tex })
      : new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.key = b.key;

    const group = new THREE.Group();
    if (b.tiltZ) group.rotation.z = b.tiltZ;
    group.add(mesh);

    if (b.ring) {
      const rGeo = new THREE.RingGeometry(b.ring.inner, b.ring.outer, 96, 1);
      /* remap UVs radially so the band texture reads as rings */
      const pos = rGeo.attributes.position;
      const uv = rGeo.attributes.uv;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const rr = (v.length() - b.ring.inner) / (b.ring.outer - b.ring.inner);
        uv.setXY(i, rr, 0.5);
      }
      const rMat = new THREE.MeshBasicMaterial({
        map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: b.ring.opacity, depthWrite: false
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    if (b.type === "sun") {
      const glow1 = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture("rgba(255,190,60,.95)"), transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending
      }));
      glow1.scale.setScalar(b.r * 5.4);
      group.add(glow1);
      const glow2 = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture("rgba(255,120,30,.8)"), transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.AdditiveBlending
      }));
      glow2.scale.setScalar(b.r * 9);
      group.add(glow2);
    }

    const pivot = new THREE.Group();
    if (b.orbitTilt) pivot.rotation.x = b.orbitTilt;
    pivot.add(group);
    scene.add(pivot);

    /* orbit line */
    if (b.orbit > 0 && !b.parent) {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = i / 128 * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * b.orbit, 0, Math.sin(a) * b.orbit));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x8b9be8, transparent: true, opacity: 0.16 })
      );
      pivot.add(line);
    }

    bodyState[b.key] = { cfg: b, mesh, group, angle: Math.random() * Math.PI * 2, scaleTarget: 1 };
    meshes.push(mesh);
  });

  /* labels */
  const labels = {};
  BODIES.forEach(b => {
    if (b.noLabel) return;
    const info = planetByKey[b.key];
    const div = document.createElement("button");
    div.className = "p-label";
    div.type = "button";
    div.textContent = info ? info.name : b.key;
    div.addEventListener("click", () => openPlanetCard(b.key));
    labelLayer.appendChild(div);
    labels[b.key] = div;
  });

  /* camera orbit state */
  const cam = { theta: 0.85, phi: 1.02, dist: 110, baseDist: 110, target: new THREE.Vector3(0, 0, 0) };
  let focusKey = null;
  let lastInteract = 0;

  function sizeCamera() {
    const w = canvas.clientWidth || stageEl.clientWidth;
    const h = canvas.clientHeight || stageEl.clientHeight;
    const aspect = w / Math.max(1, h);
    /* wider-but-shorter stage: pull back a little so outer planets stay visible */
    cam.baseDist = aspect < 0.8 ? 175 : aspect < 1.2 ? 150 : 120;
  }

  function applyCamera() {
    const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
    camera.position.set(
      cam.target.x + cam.dist * sp * Math.cos(cam.theta),
      cam.target.y + cam.dist * cp,
      cam.target.z + cam.dist * sp * Math.sin(cam.theta)
    );
    camera.lookAt(cam.target);
  }

  /* drag to rotate */
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  canvas.addEventListener("pointerdown", e => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    canvas.classList.add("dragging");
    lastInteract = performance.now();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ }
  });
  canvas.addEventListener("pointermove", e => {
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      cam.theta += dx * 0.005;
      cam.phi = Math.min(1.45, Math.max(0.3, cam.phi - dy * 0.004));
      lastX = e.clientX; lastY = e.clientY;
      lastInteract = performance.now();
      requestRender();
    } else if (window.matchMedia("(hover: hover)").matches) {
      hoverCheck(e);
    }
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("dragging");
    if (moved < 8 && e.type === "pointerup") tapCheck(e);
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  /* raycast helpers */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    return hits.length ? hits[0].object.userData.key : null;
  }
  let hovered = null;
  function hoverCheck(e) {
    const key = pick(e);
    if (key !== hovered) {
      if (hovered) bodyState[hovered].scaleTarget = 1;
      hovered = key;
      if (hovered) bodyState[hovered].scaleTarget = 1.14;
      canvas.style.cursor = hovered ? "pointer" : "grab";
      requestRender();
    }
  }
  function tapCheck(e) {
    const key = pick(e);
    if (key) openPlanetCard(key);
    else closePlanetCard();
  }

  /* planet info card */
  const cardEl = qs("#planetCard");
  function openPlanetCard(key) {
    const info = planetByKey[key];
    if (!info) return;
    qs("#planetCardEmoji").textContent = info.emoji;
    qs("#planetCardName").textContent = info.name;
    qs("#planetCardTag").textContent = info.tagline;
    qs("#planetCardHead").style.background =
      `linear-gradient(135deg, ${info.color}55, rgba(255,255,255,.03))`;
    const ul = qs("#planetCardFacts");
    ul.innerHTML = "";
    info.facts.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      ul.appendChild(li);
    });
    cardEl.hidden = false;
    focusKey = key;
    sfx.pop();
    requestRender();
  }
  function closePlanetCard() {
    if (cardEl.hidden) return;
    cardEl.hidden = true;
    focusKey = null;
    requestRender();
  }
  qs("#planetCardClose").addEventListener("click", closePlanetCard);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePlanetCard(); });

  /* shooting stars */
  let shooter = null, nextShoot = 4;
  const shooterSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("rgba(255,255,255,.95)"), transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  shooterSprite.scale.set(14, 2.4, 1);
  scene.add(shooterSprite);

  /* resize */
  function resize() {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    sizeCamera();
    if (!focusKey) cam.dist = cam.baseDist;
    requestRender();
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 250));

  /* main loop */
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();

  function tick(dt, t) {
    /* body motion */
    Object.values(bodyState).forEach(st => {
      const b = st.cfg;
      if (b.orbit > 0) {
        st.angle += dt * b.speed * 0.32;
        if (b.parent) {
          const par = bodyState[b.parent].mesh.getWorldPosition(tmpV);
          st.group.position.set(
            par.x + Math.cos(st.angle) * b.orbit, par.y,
            par.z + Math.sin(st.angle) * b.orbit
          );
        } else {
          st.group.position.set(Math.cos(st.angle) * b.orbit, 0, Math.sin(st.angle) * b.orbit);
        }
      }
      st.mesh.rotation.y += dt * b.spin;
      const s = st.mesh.scale.x + (st.scaleTarget - st.mesh.scale.x) * 0.15;
      st.mesh.scale.setScalar(s);
    });

    /* twinkle */
    starsA.opacity = 0.75 + Math.sin(t * 1.7) * 0.2;
    starsB.opacity = 0.6 + Math.cos(t * 2.3) * 0.25;

    /* idle auto-spin */
    if (!dragging && performance.now() - lastInteract > 3000) cam.theta += dt * 0.032;

    /* focus fly-to */
    if (focusKey) {
      const st = bodyState[focusKey];
      st.mesh.getWorldPosition(tmpV);
      cam.target.lerp(tmpV, 0.06);
      const want = Math.max(14, st.cfg.r * 5.2 + 6);
      cam.dist += (want - cam.dist) * 0.06;
    } else {
      cam.target.lerp(new THREE.Vector3(0, 0, 0), 0.06);
      cam.dist += (cam.baseDist - cam.dist) * 0.06;
    }
    applyCamera();

    /* shooting star */
    if (!NOANIM) {
      nextShoot -= dt;
      if (!shooter && nextShoot <= 0) {
        shooter = {
          pos: new THREE.Vector3((Math.random() - 0.5) * 300, 90 + Math.random() * 60, -160),
          vel: new THREE.Vector3(-70 - Math.random() * 50, -34, 0),
          life: 1.4
        };
        nextShoot = 5 + Math.random() * 6;
      }
      if (shooter) {
        shooter.life -= dt;
        shooter.pos.addScaledVector(shooter.vel, dt);
        shooterSprite.position.copy(shooter.pos);
        shooterSprite.material.opacity = Math.max(0, Math.min(1, shooter.life));
        if (shooter.life <= 0) { shooter = null; shooterSprite.material.opacity = 0; }
      }
    }

    renderer.render(scene, camera);
    updateLabels();
  }

  function updateLabels() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    Object.entries(labels).forEach(([key, div]) => {
      const st = bodyState[key];
      st.mesh.getWorldPosition(tmpV);
      /* the Sun's label rides higher so inner-planet labels don't collide with it */
      tmpV.y += st.cfg.r * (key === "sun" ? 1.5 : 1) + 1.2;
      tmpV.project(camera);
      if (tmpV.z > 1 || tmpV.x < -1.05 || tmpV.x > 1.05 || tmpV.y < -1.05 || tmpV.y > 1.05) {
        div.style.display = "none";
        return;
      }
      div.style.display = "";
      div.style.left = ((tmpV.x + 1) / 2 * w) + "px";
      div.style.top = ((-tmpV.y + 1) / 2 * h) + "px";
    });
  }

  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05);
    tick(dt, clock.elapsedTime);
    requestAnimationFrame(loop);
  }
  function renderOnce() {
    tick(0, 0);
  }
  function requestRender() {
    /* In noanim/test mode there is no animation loop, so render synchronously. */
    if (NOANIM) renderOnce();
  }

  resize();
  cam.dist = cam.baseDist;
  if (NOANIM) renderOnce();
  else requestAnimationFrame(loop);

  scene3d.ok = true;
  scene3d.renderOnce = renderOnce;
  scene3d.openPlanetCard = openPlanetCard;
  scene3d.closePlanetCard = closePlanetCard;
  scene3d.renderer = renderer;
}
initSolarSystem();

/* ============================================================
   PLANET FLIP CARDS
   ============================================================ */
(function buildFlipCards() {
  const grid = qs("#planetGrid");
  DATA.planets.forEach(p => {
    const card = document.createElement("div");
    card.className = "flip-card";
    card.innerHTML = `
      <div class="flip-inner" role="button" tabindex="0" aria-label="Flip card for ${p.name}">
        <div class="flip-face flip-front">
          <span class="pf-emoji">${p.emoji}</span>
          <h4>${p.name}</h4>
          <p>${p.tagline}</p>
          <span class="tap-hint">TAP TO FLIP!</span>
        </div>
        <div class="flip-face flip-back">
          ${p.facts.slice(0, 3).map(f => `<p>✨ ${f}</p>`).join("")}
        </div>
      </div>`;
    const toggle = () => { card.classList.toggle("flipped"); sfx.pop(); };
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
    grid.appendChild(card);
  });
})();

/* ============================================================
   QUIZ FACTORY (space + history)
   ============================================================ */
function makeQuiz(mount, questions, opts) {
  let order, idx, score, answered;

  function start() {
    /* each game is a fresh hand of questions dealt from the full bank */
    order = shuffle(questions).slice(0, opts.roundSize || questions.length);
    idx = 0; score = 0; answered = false;
    renderQ();
  }

  function renderQ() {
    const q = order[idx];
    const options = shuffle(q.options.map((text, i) => ({ text, correct: i === q.a })));
    mount.innerHTML = `
      <div class="quiz-progress">
        <span>Question ${idx + 1} of ${order.length}</span>
        <div class="quiz-bar"><div class="quiz-bar-fill" style="width:${(idx / order.length) * 100}%"></div></div>
        <span>⭐ ${score}</span>
      </div>
      <p class="quiz-q">${q.q}</p>
      <div class="quiz-opts">
        ${options.map((o, i) => `<button class="quiz-opt" data-i="${i}">${o.text}</button>`).join("")}
      </div>
      <div class="quiz-extra"></div>`;
    answered = false;
    qsa(".quiz-opt", mount).forEach(btn => {
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const picked = options[+btn.dataset.i];
        qsa(".quiz-opt", mount).forEach((b, i) => {
          b.disabled = true;
          if (options[i].correct) b.classList.add("correct");
        });
        if (picked.correct) {
          score++;
          sfx.ding();
          addStars(1, btn);
        } else {
          btn.classList.add("wrong");
          sfx.buzz();
        }
        const extra = qs(".quiz-extra", mount);
        extra.innerHTML = `
          <div class="quiz-why"><b>${picked.correct ? "🎉 YES!" : "💡 Good try!"}</b> ${q.why}</div>
          <div class="quiz-next-row">
            <button class="big-btn ${opts.btnClass}" data-next>
              ${idx + 1 < order.length ? "Next question ➜" : "See my rank! 🏆"}
            </button>
          </div>`;
        qs("[data-next]", mount).addEventListener("click", () => {
          idx++;
          idx < order.length ? renderQ() : renderEnd();
        });
      });
    });
  }

  function renderEnd() {
    const pct = Math.round((score / order.length) * 100);
    const rank = opts.ranks.filter(r => pct >= r.min).pop();
    mount.innerHTML = `
      <div class="quiz-end">
        <div class="trophy">${rank.emoji}</div>
        <h4>You scored ${score} out of ${order.length}!</h4>
        <p class="rank">Rank earned: ${rank.name}</p>
        <p>${rank.note}</p>
        ${questions.length > order.length ? `<p>🎲 There are ${questions.length} questions in the bank — every game deals new ones!</p>` : ""}
        <button class="big-btn ${opts.btnClass}" data-again>Play again 🔄</button>
      </div>`;
    sfx.tada();
    confettiAt(qs(".trophy", mount), 30);
    qs("[data-again]", mount).addEventListener("click", start);
  }

  start();
}

makeQuiz(qs("#spaceQuiz .quiz-mount"), DATA.spaceQuiz, {
  btnClass: "btn-purple",
  roundSize: 15,
  ranks: [
    { min: 0, emoji: "🌱", name: "Space Cadet", note: "Every astronaut starts somewhere — try again and reach the stars!" },
    { min: 50, emoji: "🛸", name: "Star Pilot", note: "Nice flying! You know your way around the solar system." },
    { min: 75, emoji: "👩‍🚀", name: "Astro Captain", note: "Amazing! Captain Sumanya salutes you!" },
    { min: 100, emoji: "🌟", name: "Galaxy Commander", note: "PERFECT SCORE! NASA should hire you right now!" }
  ]
});

makeQuiz(qs("#historyQuiz .quiz-mount"), DATA.historyQuiz, {
  btnClass: "btn-teal",
  roundSize: 15,
  ranks: [
    { min: 0, emoji: "🐌", name: "Time Tourist", note: "The time machine sputtered — fuel it up with another try!" },
    { min: 50, emoji: "🕰️", name: "History Helper", note: "Solid! You're getting the hang of the past." },
    { min: 75, emoji: "📜", name: "Time Traveler", note: "Fantastic! George Washington would tip his hat to you." },
    { min: 100, emoji: "👑", name: "History Hero", note: "PERFECT! You basically lived through it all!" }
  ]
});

/* ============================================================
   GIGGLES — reveal cards with filters + pagination
   ============================================================ */
const CAT_EMOJI = { silly: "😜", funny: "😂", mind: "🤯" };
const giggleState = {
  filter: "all",
  shown: 12,
  revealed: new Set(store.get("sumanya_revealed_v1", []))
};
const giggleGrid = qs("#giggleGrid");
const moreBtn = qs("#moreGiggles");

function giggleList() {
  return DATA.giggles
    .map((g, i) => ({ ...g, i }))
    .filter(g => giggleState.filter === "all" || g.cat === giggleState.filter);
}

function renderGiggles() {
  const list = giggleList();
  const slice = list.slice(0, giggleState.shown);
  giggleGrid.innerHTML = "";
  slice.forEach(g => {
    const card = document.createElement("div");
    card.className = "giggle-card";
    card.innerHTML = `
      <div class="giggle-top">
        <span class="giggle-num">#${g.i + 1}</span>
        <span class="giggle-cat" title="${g.cat}">${CAT_EMOJI[g.cat]}</span>
      </div>
      <p class="giggle-q">${g.q}</p>
      <div class="giggle-a" hidden></div>
      <button class="giggle-btn">Reveal! 🎉</button>`;
    const aBox = qs(".giggle-a", card);
    const btn = qs(".giggle-btn", card);
    aBox.textContent = g.a;
    btn.addEventListener("click", () => {
      const showing = !aBox.hidden;
      if (showing) {
        aBox.hidden = true;
        btn.textContent = "Reveal! 🎉";
        btn.classList.remove("revealed");
      } else {
        aBox.hidden = false;
        btn.textContent = "Hide 🙈";
        btn.classList.add("revealed");
        sfx.pop();
        if (!giggleState.revealed.has(g.i)) {
          giggleState.revealed.add(g.i);
          store.set("sumanya_revealed_v1", [...giggleState.revealed]);
          addStars(1, btn);
        }
      }
    });
    giggleGrid.appendChild(card);
  });
  const left = list.length - slice.length;
  moreBtn.style.display = left > 0 ? "" : "none";
  moreBtn.textContent = `Show more giggles (${left} left) ⬇️`;
}

qs("#giggleFilters").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  qsa("#giggleFilters .chip").forEach(c => c.classList.toggle("is-on", c === chip));
  giggleState.filter = chip.dataset.filter;
  giggleState.shown = 12;
  renderGiggles();
});
moreBtn.addEventListener("click", () => {
  giggleState.shown += 12;
  renderGiggles();
});
qs('#giggleFilters [data-filter="all"]').textContent = `🌈 All ${DATA.giggles.length}`;
renderGiggles();

/* ---------- surprise modal ---------- */
const surpriseModal = qs("#surpriseModal");
let surpriseIdx = 0;
function pickSurprise() {
  surpriseIdx = Math.floor(Math.random() * DATA.giggles.length);
  qs("#surpriseQ").textContent = `#${surpriseIdx + 1}  ${DATA.giggles[surpriseIdx].q}`;
  const a = qs("#surpriseA");
  a.hidden = true;
  a.textContent = DATA.giggles[surpriseIdx].a;
}
qs("#surpriseBtn").addEventListener("click", () => {
  pickSurprise();
  surpriseModal.hidden = false;
  sfx.pop();
});
qs("#surpriseReveal").addEventListener("click", e => {
  const a = qs("#surpriseA");
  if (!a.hidden) return;
  a.hidden = false;
  sfx.ding();
  if (!giggleState.revealed.has(surpriseIdx)) {
    giggleState.revealed.add(surpriseIdx);
    store.set("sumanya_revealed_v1", [...giggleState.revealed]);
    addStars(1, e.target);
  }
});
qs("#surpriseAnother").addEventListener("click", pickSurprise);
qs("#surpriseClose").addEventListener("click", () => { surpriseModal.hidden = true; });
surpriseModal.addEventListener("click", e => { if (e.target === surpriseModal) surpriseModal.hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") surpriseModal.hidden = true; });

/* ============================================================
   KNOCK-KNOCK CORNER
   ============================================================ */
(function knockKnock() {
  const jokes = DATA.knockKnock;
  const lines = qs("#knockLines");
  const actions = qs("#knockActions");
  const door = qs("#knockDoor");
  const count = qs("#knockCount");
  const done = new Set(store.get("sumanya_knock_v1", []));
  let idx = 0;

  function addLine(cls, text) {
    const div = document.createElement("div");
    div.className = `k-line ${cls}`;
    div.textContent = text;
    lines.appendChild(div);
  }
  function actionBtn(label, fn) {
    actions.innerHTML = "";
    const b = document.createElement("button");
    b.className = "big-btn btn-pink";
    b.textContent = label;
    b.addEventListener("click", fn);
    actions.appendChild(b);
  }

  function render() {
    const j = jokes[idx];
    count.textContent = `Joke ${idx + 1} of ${jokes.length}`;
    lines.innerHTML = "";
    addLine("k-them", "🚪 Knock, knock!");
    door.classList.remove("knocking");
    void door.offsetWidth;
    door.classList.add("knocking");
    sfx.knock();
    actionBtn("You say: \"Who's there?\" 🤔", step2);

    function step2() {
      addLine("k-you", "Who's there?");
      addLine("k-them", j.who + ".");
      if (j.interrupt) {
        actionBtn(`You say: "${j.who} wh—" 😮`, step3);
      } else {
        actionBtn(`You say: "${j.who} who?" 😄`, step3);
      }
    }
    function step3() {
      addLine("k-you", j.interrupt ? `${j.who} wh—` : `${j.who} who?`);
      addLine("k-punch", "😂 " + j.punch);
      sfx.tada();
      confettiAt(door, 18);
      if (!done.has(idx)) {
        done.add(idx);
        store.set("sumanya_knock_v1", [...done]);
        addStars(1, door);
      }
      actionBtn("Next joke! 🚪", () => { idx = (idx + 1) % jokes.length; render(); });
    }
  }

  qs("#knockPrev").addEventListener("click", () => { idx = (idx - 1 + jokes.length) % jokes.length; render(); });
  qs("#knockNext").addEventListener("click", () => { idx = (idx + 1) % jokes.length; render(); });
  render();
})();

/* ============================================================
   WHICH CAME FIRST?
   ============================================================ */
(function whichCameFirst() {
  const mount = qs("#wcfMount");
  let order, idx, scoreW, streak, best;

  function start() {
    order = shuffle(DATA.whichFirst);
    idx = 0; scoreW = 0; streak = 0;
    best = store.get("sumanya_wcf_best_v1", 0);
    renderRound();
  }

  function renderRound() {
    const pair = order[idx];
    mount.innerHTML = `
      <div class="wcf-status">
        <span>Round <b>${idx + 1}</b> / ${order.length}</span>
        <span>Streak <b>🔥 ${streak}</b></span>
        <span>Best <b>🔥 ${best}</b></span>
      </div>
      <div class="wcf-pair">
        <button class="wcf-card" data-side="a">
          <span>${pair.a.label}</span>
          <span class="wcf-year">${pair.a.year}</span>
        </button>
        <span class="wcf-vs">VS</span>
        <button class="wcf-card" data-side="b">
          <span>${pair.b.label}</span>
          <span class="wcf-year">${pair.b.year}</span>
        </button>
      </div>
      <div class="wcf-extra"></div>`;
    qsa(".wcf-card", mount).forEach(cardBtn => {
      cardBtn.addEventListener("click", () => {
        const side = cardBtn.dataset.side;
        const correct = side === pair.first;
        qsa(".wcf-card", mount).forEach(c => {
          c.disabled = true;
          c.classList.add("reveal");
          c.classList.add(c.dataset.side === pair.first ? "win" : "lose");
        });
        if (correct) {
          scoreW++; streak++;
          if (streak > best) { best = streak; store.set("sumanya_wcf_best_v1", best); }
          sfx.ding();
          addStars(1, cardBtn);
        } else {
          streak = 0;
          sfx.buzz();
        }
        qs(".wcf-extra", mount).innerHTML = `
          <div class="wcf-note">${correct ? "🎉 Correct!" : "⏳ Whoops!"} ${pair.note}</div>
          <div class="quiz-next-row">
            <button class="big-btn btn-teal" data-next>
              ${idx + 1 < order.length ? "Next round ➜" : "Finish! 🏁"}
            </button>
          </div>`;
        qs("[data-next]", mount).addEventListener("click", () => {
          idx++;
          idx < order.length ? renderRound() : renderEnd();
        });
      });
    });
  }

  function renderEnd() {
    mount.innerHTML = `
      <div class="quiz-end">
        <div class="trophy">${scoreW >= 8 ? "🏆" : scoreW >= 5 ? "🥇" : "⏳"}</div>
        <h4>You got ${scoreW} of ${order.length} right!</h4>
        <p class="rank">Best streak ever: 🔥 ${best}</p>
        <p>${scoreW >= 8 ? "You're a certified Time Wizard!" : scoreW >= 5 ? "Great time-traveling instincts!" : "History is tricky — hop back in the machine!"}</p>
        <button class="big-btn btn-teal" data-again>Play again 🔄</button>
      </div>`;
    sfx.tada();
    confettiAt(qs(".trophy", mount), 30);
    qs("[data-again]", mount).addEventListener("click", start);
  }

  start();
})();

/* ============================================================
   NAV, SCROLL EFFECTS, ASTRONAUT
   ============================================================ */
qsa("[data-nav]").forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const target = qs(id);
    if (!target) return;
    e.preventDefault();
    const top = id === "#hero" ? 0 : target.getBoundingClientRect().top + window.scrollY - 62;
    window.scrollTo({ top, behavior: NOANIM ? "auto" : "smooth" });
  });
});
qs("#scrollDown").addEventListener("click", () => {
  const target = qs("#space");
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 62, behavior: NOANIM ? "auto" : "smooth" });
});

/* active nav highlight */
const sectionIds = ["space", "giggles", "history"];
if ("IntersectionObserver" in window) {
  const navObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        qsa(".mainnav a").forEach(a =>
          a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
      }
    });
  }, { rootMargin: "-40% 0px -50% 0px" });
  sectionIds.forEach(id => navObs.observe(qs("#" + id)));

  const riseObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); riseObs.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  qsa(".rise").forEach(el => riseObs.observe(el));
} else {
  qsa(".rise").forEach(el => el.classList.add("in"));
}

/* astronaut speech bubble */
(function astro() {
  const fig = qs("#heroAstro");
  const bubble = qs("#astroBubble");
  const msgs = [
    "Hi! I'm Captain Sumanya! 👋",
    "To infinity and... 4th grade! 🚀",
    "Tap a planet to learn its secrets! 🪐",
    "Did you know Saturn could float? 🛁",
    "Race you to the Moon! 🌙"
  ];
  let mi = 0, timer = null;
  bubble.classList.add("show");
  setTimeout(() => bubble.classList.remove("show"), 3500);
  fig.addEventListener("click", () => {
    mi = (mi + 1) % msgs.length;
    bubble.textContent = msgs[mi];
    bubble.classList.add("show");
    sfx.pop();
    confettiAt(fig, 10);
    clearTimeout(timer);
    timer = setTimeout(() => bubble.classList.remove("show"), 3000);
  });
})();

/* ============================================================
   TEST HOOKS (used by automated checks; harmless in production)
   ============================================================ */
/* layout probe for automated width checks: load with ?probe */
if (new URLSearchParams(location.search).has("probe")) {
  setTimeout(() => {
    const wide = [];
    document.querySelectorAll("body *").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > document.documentElement.clientWidth + 1 && wide.length < 6) {
        wide.push(`${el.tagName}.${(el.className || "").toString().split(" ")[0]}:${Math.round(r.right)}`);
      }
    });
    document.title = JSON.stringify({
      iw: window.innerWidth,
      cw: document.documentElement.clientWidth,
      sw: document.documentElement.scrollWidth,
      hero: qs("#hero").clientWidth,
      dpr: window.devicePixelRatio,
      wide
    });
  }, 1200);
}

window.__sumanya = {
  scene3d,
  openBody: k => scene3d.openPlanetCard && scene3d.openPlanetCard(k),
  closeBody: () => scene3d.closePlanetCard && scene3d.closePlanetCard(),
  stars: () => stars,
  samplePixels() {
    if (!scene3d.ok) return { ok: false };
    scene3d.renderOnce();
    const src = scene3d.renderer.domElement;
    if (!src.width || !src.height) return { ok: false, reason: "zero-size canvas" };
    const c = document.createElement("canvas");
    c.width = 160; c.height = 100;
    const ctx = c.getContext("2d");
    ctx.drawImage(src, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] > 90) lit++;
    }
    return { ok: true, lit, total: d.length / 4 };
  }
};
