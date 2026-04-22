/**
 * Brain-It — single-file React physics puzzle game
 * React + Tailwind CSS + Matter.js
 */
import { useRef, useEffect, useCallback, useReducer } from 'react';
import Matter from 'matter-js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & design tokens
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  bg:           '#f8fafc',
  gridMinor:    '#e2e8f0',
  gridMajor:    '#cbd5e1',
  darkSlate:    '#334155',
  slateTrim:    '#475569',
  penBlue:      '#3b82f6',
  penBlueDark:  '#2563eb',
  penBlueGlow:  'rgba(59,130,246,0.20)',
  orange:       '#f97316',
  orangeGlow:   'rgba(249,115,22,0.25)',
  playerGlow:   'rgba(37,99,235,0.28)',
};

const STROKE_W    = 7;    // drawn-stroke thickness (px)
const GRID_CELL   = 24;   // minor grid spacing (px)
const GRID_MAJOR  = 5;    // major line every N minor cells
const MIN_PT_DIST = 8;    // min px between captured points (mobile perf)
const MAX_PTS     = 110;  // max points per stroke before capping

// ─────────────────────────────────────────────────────────────────────────────
// Level data  (10 hand-crafted levels)
//
// Coordinate system — all values are fractions of canvas dimensions:
//   player.x / target.x        → fraction of canvas width
//   player.y / target.y        → fraction of canvas height
//   player.radius/target.radius → fraction of Math.min(w, h)
//   obstacle.x / obstacle.y    → fraction of canvas width / height
//   obstacle.w                 → fraction of canvas width
//   obstacle.h                 → fraction of canvas height (≈0.022 ≈ 18px on 820px)
//   obstacle.angle             → radians, positive = clockwise
// ─────────────────────────────────────────────────────────────────────────────

const LEVELS = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  // "First Drop" — open canvas, no obstacles. Draw any ramp to reach the target.
  {
    id: 1, name: 'First Drop',
    hint: 'Draw a ramp to reach the target',
    player:    { x: 0.18, y: 0.08, radius: 0.036 },
    target:    { x: 0.78, y: 0.84, radius: 0.052 },
    obstacles: [],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  // "The Shelf" — one wide horizontal platform.
  // Platform extends x 0.34→0.86; ball spawns at x 0.15 (falls through left gap).
  // Draw a slope that redirects the ball onto the shelf, then off the right edge.
  {
    id: 2, name: 'The Shelf',
    hint: 'Get the ball onto the platform',
    player:    { x: 0.15, y: 0.07, radius: 0.036 },
    target:    { x: 0.80, y: 0.80, radius: 0.052 },
    obstacles: [
      { x: 0.60, y: 0.42, w: 0.52, h: 0.022, angle: 0 },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  // "Ski Run" — a single angled platform acts as a natural slide.
  // Guide the ball onto the high (left) end; it slides right-downward to the target.
  {
    id: 3, name: 'Ski Run',
    hint: 'Land on the slope and ride it down',
    player:    { x: 0.14, y: 0.06, radius: 0.036 },
    target:    { x: 0.82, y: 0.80, radius: 0.052 },
    obstacles: [
      { x: 0.50, y: 0.38, w: 0.56, h: 0.022, angle: 0.25 },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  // "Two Floors" — two offset horizontal floors with gaps on opposite sides.
  // Floor 1 (right-anchored): x 0.38→0.90 — gap at left.
  // Floor 2 (left-anchored):  x 0.06→0.58 — gap at right.
  // Ball spawns x 0.25 → falls through gap 1 → lands on floor 2.
  // Route: floor 2 gap-right → falls toward target (x 0.82, y 0.85).
  {
    id: 4, name: 'Two Floors',
    hint: 'Navigate both platforms',
    player:    { x: 0.25, y: 0.07, radius: 0.036 },
    target:    { x: 0.82, y: 0.85, radius: 0.052 },
    obstacles: [
      { x: 0.64, y: 0.30, w: 0.52, h: 0.022, angle: 0 },
      { x: 0.32, y: 0.56, w: 0.52, h: 0.022, angle: 0 },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  // "The V" — two angled arms form a V-funnel.
  // Ball spawns top-left; left arm deflects it rightward toward the centre target.
  {
    id: 5, name: 'The V',
    hint: 'Use the slopes to guide the ball',
    player:    { x: 0.20, y: 0.07, radius: 0.036 },
    target:    { x: 0.50, y: 0.85, radius: 0.052 },
    obstacles: [
      { x: 0.22, y: 0.42, w: 0.38, h: 0.022, angle:  0.40 },
      { x: 0.78, y: 0.42, w: 0.38, h: 0.022, angle: -0.40 },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  // "Staircase" — three descending steps; bridge the gaps to cascade right.
  // Step gaps: step1 right edge x≈0.38 → step2 starts x≈0.36 (slight overlap — needs bridge);
  // step2 right edge x≈0.64 → step3 left edge x≈0.64 (gap bridgeable).
  {
    id: 6, name: 'Staircase',
    hint: 'Step your way down',
    player:    { x: 0.12, y: 0.07, radius: 0.036 },
    target:    { x: 0.86, y: 0.84, radius: 0.052 },
    obstacles: [
      { x: 0.24, y: 0.28, w: 0.28, h: 0.022, angle: 0 },
      { x: 0.50, y: 0.50, w: 0.28, h: 0.022, angle: 0 },
      { x: 0.76, y: 0.68, w: 0.26, h: 0.022, angle: 0 },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  // "The Wall" — tall vertical divider splits the arena.
  // Wall spans y 0.22 → 0.80.  Gap above (y < 0.22) is ~180px.
  // Draw a ramp that crosses the centre line above the wall top.
  {
    id: 7, name: 'The Wall',
    hint: 'Find a way past the divider',
    player:    { x: 0.15, y: 0.07, radius: 0.036 },
    target:    { x: 0.82, y: 0.82, radius: 0.052 },
    obstacles: [
      { x: 0.50, y: 0.52, w: 0.022, h: 0.60, angle: 0 },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  // "Cascade" — two platforms both with gaps on the right.
  // Platform 1: x 0.04→0.62, gap at right.
  // Platform 2: x 0.15→0.73, gap at right.
  // Ball must roll right off each platform in sequence to reach bottom-right target.
  {
    id: 8, name: 'Cascade',
    hint: 'Keep the ball rolling right',
    player:    { x: 0.18, y: 0.07, radius: 0.036 },
    target:    { x: 0.84, y: 0.88, radius: 0.052 },
    obstacles: [
      { x: 0.33, y: 0.28, w: 0.58, h: 0.022, angle: 0 },
      { x: 0.44, y: 0.54, w: 0.58, h: 0.022, angle: 0 },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  // "The Gauntlet" — four short obstacles at varied angles and positions.
  // No single obvious route; requires 2-3 creative strokes.
  {
    id: 9, name: 'The Gauntlet',
    hint: 'Chart your own course',
    player:    { x: 0.50, y: 0.06, radius: 0.036 },
    target:    { x: 0.82, y: 0.86, radius: 0.052 },
    obstacles: [
      { x: 0.26, y: 0.24, w: 0.30, h: 0.022, angle: -0.15 },
      { x: 0.72, y: 0.38, w: 0.30, h: 0.022, angle:  0.15 },
      { x: 0.28, y: 0.56, w: 0.30, h: 0.022, angle:  0    },
      { x: 0.70, y: 0.68, w: 0.022, h: 0.26, angle:  0    },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  // "Grand Finale" — five obstacles creating the most complex routing.
  // Upper-right blocker, left deflector, two stepping platforms, final gate.
  {
    id: 10, name: 'Grand Finale',
    hint: 'Use everything you have learned',
    player:    { x: 0.50, y: 0.06, radius: 0.036 },
    target:    { x: 0.80, y: 0.88, radius: 0.052 },
    obstacles: [
      { x: 0.72, y: 0.22, w: 0.48, h: 0.022, angle:  0    },
      { x: 0.26, y: 0.36, w: 0.38, h: 0.022, angle:  0.30 },
      { x: 0.60, y: 0.52, w: 0.36, h: 0.022, angle:  0    },
      { x: 0.28, y: 0.66, w: 0.36, h: 0.022, angle:  0    },
      { x: 0.74, y: 0.72, w: 0.022, h: 0.22, angle:  0    },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Audio  (Web Audio API — lazy init respects browser autoplay policy)
// ─────────────────────────────────────────────────────────────────────────────

let _actx = null;
function getActx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  if (_actx.state === 'suspended') _actx.resume();
  return _actx;
}

function sndStroke() {
  try {
    const c = getActx(), t = c.currentTime;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.07), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5) * 0.28;
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 2800; flt.Q.value = 0.7;
    src.connect(flt); flt.connect(c.destination);
    src.start(t);
  } catch (_) {}
}

function sndLaunch() {
  try {
    const c = getActx(), t = c.currentTime;
    const osc = c.createOscillator(); const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.18);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + 0.3);
  } catch (_) {}
}

function sndBounce(speed) {
  try {
    const vol = Math.min(speed / 14, 1) * 0.2;
    if (vol < 0.03) return;
    const c = getActx(), t = c.currentTime;
    const osc = c.createOscillator(); const g = c.createGain();
    osc.type = 'sine';
    const freq = 80 + Math.min(speed * 2.5, 200);
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.35, t + 0.13);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + 0.16);
  } catch (_) {}
}

function sndWin() {
  try {
    const c = getActx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const t = c.currentTime + i * 0.11;
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = 'triangle'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + 0.45);
    });
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Path smoother
// ─────────────────────────────────────────────────────────────────────────────

function subsamplePoints(pts, minDist = MIN_PT_DIST) {
  if (pts.length < 2) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], q = out[out.length - 1];
    const dx = p.x - q.x, dy = p.y - q.y;
    if (dx * dx + dy * dy >= minDist * minDist) out.push(p);
  }
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

// Chaikin corner-cutting — preserves open-path endpoints.
function chaikinSmooth(pts, iters = 3) {
  if (pts.length < 3) return pts;
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const n = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      n.push(
        { x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y },
        { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y },
      );
    }
    n.push(p[p.length - 1]);
    p = n;
  }
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Physics helpers
// ─────────────────────────────────────────────────────────────────────────────

const { Engine, World, Bodies, Body, Runner, Composite, Events } = Matter;

function makeEngine() {
  return Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 },
    enableSleeping: true,
    positionIterations: 10,
    velocityIterations: 8,
  });
}

function addBoundaries(world, w, h) {
  const T = 80;
  World.add(world, [
    Bodies.rectangle(w / 2, h + T / 2, w + T * 2, T,
      { isStatic: true, label: 'boundary', friction: 0.7, restitution: 0.1 }),
    Bodies.rectangle(-T / 2, h / 2, T, h + T * 2,
      { isStatic: true, label: 'boundary' }),
    Bodies.rectangle(w + T / 2, h / 2, T, h + T * 2,
      { isStatic: true, label: 'boundary' }),
  ]);
}

// Convert smoothed polyline → array of static rectangle bodies (one per segment).
// chamfer rounds each corner so the ball rolls smoothly across segment joints
// instead of catching on the micro-seam between adjacent rectangles.
function pathToSegments(pts, thickness = STROKE_W) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) continue;
    segs.push(Bodies.rectangle(
      (a.x + b.x) / 2, (a.y + b.y) / 2,
      len + thickness * 1.5, thickness,   // extra overlap eliminates gaps at joints
      {
        angle: Math.atan2(dy, dx),
        isStatic: true, label: 'drawn',
        friction: 0.55, restitution: 0,   // no bounce off strokes → natural slide
        chamfer: { radius: 2 },           // rounded corners → smooth rolling
      },
    ));
  }
  return segs;
}

// Instantiate player, target (sensor), and obstacle bodies scaled to canvas px.
function levelBodies(level, cw, ch) {
  const m = Math.min(cw, ch);
  const player = Bodies.circle(
    level.player.x * cw, level.player.y * ch,
    level.player.radius * m,
    { label: 'player', isStatic: true,
      friction: 0.35, frictionAir: 0.01,
      restitution: 0.45, density: 0.003 },
  );
  const target = Bodies.circle(
    level.target.x * cw, level.target.y * ch,
    level.target.radius * m,
    { label: 'target', isStatic: true, isSensor: true },
  );
  const obstacles = (level.obstacles ?? []).map(o =>
    Bodies.rectangle(
      o.x * cw, o.y * ch, o.w * cw, o.h * ch,
      { isStatic: true, label: 'obstacle',
        angle: o.angle ?? 0, friction: 0.65, restitution: 0.15 },
    ),
  );
  return { player, target, obstacles };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas draw helpers  (all called inside requestAnimationFrame — no React)
// ─────────────────────────────────────────────────────────────────────────────

function drawGrid(ctx, w, h) {
  ctx.save();
  // Minor lines
  ctx.beginPath(); ctx.strokeStyle = COLORS.gridMinor; ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += GRID_CELL) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y <= h; y += GRID_CELL) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  // Major lines
  ctx.beginPath(); ctx.strokeStyle = COLORS.gridMajor; ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += GRID_CELL * GRID_MAJOR) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y <= h; y += GRID_CELL * GRID_MAJOR) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.restore();
}

function poly(ctx, verts) {
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
}

function renderObstacles(ctx, bodies) {
  const obs = bodies.filter(b => b.label === 'obstacle');
  if (!obs.length) return;
  ctx.save();
  obs.forEach(b => {
    poly(ctx, b.vertices);
    ctx.fillStyle = COLORS.darkSlate; ctx.fill();
    ctx.strokeStyle = COLORS.slateTrim; ctx.lineWidth = 1.5; ctx.stroke();
  });
  ctx.restore();
}

function renderTarget(ctx, bodies) {
  const b = bodies.find(b => b.label === 'target');
  if (!b) return;
  const { x, y } = b.position;
  const r = b.circleRadius ?? 22;
  const pulse = (Math.sin(Date.now() / 320) + 1) / 2;
  ctx.save();
  // Ambient halo
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
  g.addColorStop(0, `rgba(249,115,22,${0.26 + 0.12 * pulse})`);
  g.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.8, 0, Math.PI * 2); ctx.fill();
  // Outer ring
  ctx.strokeStyle = COLORS.orange; ctx.lineWidth = 2;
  ctx.globalAlpha = 0.50 + 0.28 * pulse;
  ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  // Core disc
  ctx.shadowColor = COLORS.orange; ctx.shadowBlur = 8 + 5 * pulse;
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // Specular
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.beginPath(); ctx.arc(x, y - r * 0.28, r * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Expanding ring burst played when the ball first touches the target.
function renderWinBurst(ctx, bodies, winTs) {
  if (!winTs) return;
  const elapsed = Date.now() - winTs;
  if (elapsed > 900) return;
  const b = bodies.find(b => b.label === 'target');
  if (!b) return;
  const { x, y } = b.position;
  const r = b.circleRadius ?? 22;
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const phase = ((elapsed / 900) + i * 0.25) % 1;
    const alpha = (1 - phase) * 0.7;
    ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r + phase * r * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderPlayer(ctx, bodies, isPrep) {
  const b = bodies.find(b => b.label === 'player');
  if (!b) return;
  const { x, y } = b.position;
  const r = b.circleRadius ?? 14;
  ctx.save();
  ctx.shadowColor = COLORS.playerGlow; ctx.shadowBlur = 10;
  ctx.fillStyle = COLORS.penBlue;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.beginPath(); ctx.arc(x, y - r * 0.28, r * 0.42, 0, Math.PI * 2); ctx.fill();
  if (isPrep) {
    const pulse = (Math.sin(Date.now() / 500) + 1) / 2;
    ctx.strokeStyle = `rgba(249,115,22,${0.5 + 0.3 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function renderDrawn(ctx, bodies) {
  const drawn = bodies.filter(b => b.label === 'drawn');
  if (!drawn.length) return;
  ctx.save();
  ctx.fillStyle = COLORS.penBlue;
  ctx.shadowColor = COLORS.penBlueGlow; ctx.shadowBlur = 5;
  drawn.forEach(b => { poly(ctx, b.vertices); ctx.fill(); });
  ctx.restore();
}

function renderLiveStroke(ctx, pts) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = COLORS.penBlueDark;
  ctx.lineWidth = STROKE_W; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.85;
  ctx.shadowColor = COLORS.penBlueGlow; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x) / 2;
      const my = (pts[i].y + pts[i+1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────

function HomeScreen({ onPlay }) {
  return (
    <div className="grid-paper w-full h-full flex flex-col items-center
                    justify-between py-16 px-6 select-none overflow-hidden">

      {/* Blueprint stamp */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[11px] text-slate-400 uppercase
                         tracking-[0.24em]">
          Blueprint Series · Vol. I
        </span>
        <div className="w-12 h-px bg-slate-300 mt-1" />
      </div>

      {/* Schematic illustration + title */}
      <div className="flex flex-col items-center gap-7">
        <svg width="210" height="148" viewBox="0 0 210 148"
             fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* Grid reference dots */}
          {[30,70,110,150,180].map(x =>
            [28,74,120].map(y =>
              <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="#cbd5e1" />
            )
          )}
          {/* Dark-slate platform */}
          <rect x="16" y="104" width="88" height="10" rx="2" fill="#334155"/>
          {/* Angled ramp */}
          <rect x="108" y="70" width="82" height="10" rx="2"
                transform="rotate(-13 108 70)" fill="#334155"/>
          {/* Target glow */}
          <circle cx="172" cy="122" r="20" fill="rgba(249,115,22,0.18)"/>
          <circle cx="172" cy="122" r="14" fill="#f97316"/>
          <circle cx="169" cy="118" r="5" fill="rgba(255,255,255,0.32)"/>
          {/* Player ball */}
          <circle cx="30" cy="90" r="12" fill="#3b82f6"/>
          <circle cx="27" cy="87" r="4" fill="rgba(255,255,255,0.38)"/>
          {/* Dashed arrow path */}
          <path d="M48 82 Q90 46 144 96" stroke="#94a3b8" strokeWidth="1.5"
                strokeDasharray="4 3" fill="none"/>
          <polygon points="144,90 152,98 140,102" fill="#94a3b8"/>
        </svg>

        <div className="flex flex-col items-center gap-2">
          <h1 className="font-mono font-black text-slate-800 leading-none
                         tracking-tight"
              style={{ fontSize: 'clamp(2.8rem,13vw,4.8rem)' }}>
            BRAIN·IT
          </h1>
          <p className="font-mono text-slate-500 text-xs tracking-widest uppercase">
            Draw · Physics · Solve
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <button
          onClick={onPlay}
          className="w-full bg-slate-800 active:bg-slate-900 text-white
                     font-mono font-bold uppercase tracking-widest text-base
                     py-5 rounded-2xl border-2 border-slate-600 shadow-lg
                     transition-transform active:scale-95"
        >
          Play
        </button>
        <p className="font-mono text-slate-400 text-[11px] text-center
                      leading-relaxed px-2">
          Draw platforms and ramps to guide the ball
          to the&nbsp;orange&nbsp;target.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LevelSelectScreen
// ─────────────────────────────────────────────────────────────────────────────

function LevelSelectScreen({ levels, completedLevels, onSelect, onBack }) {
  return (
    <div className="grid-paper w-full h-full flex flex-col select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 shrink-0">
        <button onClick={onBack}
          className="font-mono text-slate-500 text-sm uppercase tracking-widest
                     active:text-slate-800 transition-colors -ml-1 px-2 py-2">
          ← Back
        </button>
        <span className="font-mono text-[11px] text-slate-400 uppercase
                         tracking-[0.2em]">
          Select Level
        </span>
        <div className="w-16" />
      </div>

      <div className="mx-5 h-px bg-slate-200 shrink-0" />

      {/* 2 × 5 grid */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {levels.map(lv => {
            const done = completedLevels.includes(lv.id);
            return (
              <button key={lv.id} onClick={() => onSelect(lv.id)}
                className={[
                  'relative flex flex-col items-start justify-between',
                  'rounded-2xl border-2 p-4 min-h-[96px] text-left',
                  'transition-transform active:scale-95',
                  done
                    ? 'bg-slate-700 border-slate-600'
                    : 'bg-white/75 border-slate-200',
                ].join(' ')}>
                {/* Large ghost number */}
                <span className={[
                  'font-mono font-black text-[2.2rem] leading-none',
                  done ? 'text-slate-500' : 'text-slate-200',
                ].join(' ')} aria-hidden="true">
                  {String(lv.id).padStart(2, '0')}
                </span>
                <div className="flex items-end justify-between w-full gap-1 mt-2">
                  <span className={[
                    'font-mono text-[11px] uppercase tracking-wider leading-tight',
                    done ? 'text-slate-300' : 'text-slate-600',
                  ].join(' ')}>
                    {lv.name}
                  </span>
                  {done && (
                    <span className="text-orange-400 text-sm leading-none shrink-0"
                          aria-label="Completed">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-5 shrink-0" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HintCard  — level hint shown prominently during prep, fades after first stroke
// ─────────────────────────────────────────────────────────────────────────────

function HintCard({ hint, visible }) {
  return (
    <div className={[
      'absolute left-5 right-5 pointer-events-none select-none',
      'top-1/2 -translate-y-1/2',
      'transition-opacity duration-500',
      visible ? 'opacity-100' : 'opacity-0',
    ].join(' ')}>
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200
                      shadow-xl px-7 py-6 flex flex-col items-center gap-3">
        <p className="font-mono font-semibold text-slate-700 text-lg text-center
                      leading-snug">
          {hint}
        </p>
        <div className="w-10 h-px bg-slate-200" />
        <p className="font-mono text-orange-500 text-xs uppercase tracking-widest
                      text-center">
          Draw a path · then tap Launch ▶
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GameHUD  — absolute overlay, transparent to drawing touches
// ─────────────────────────────────────────────────────────────────────────────

function GameHUD({ level, phase, strokeCount, onBack, onReset, onLaunch }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col
                    justify-between">

      {/* Top strip — level info */}
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="font-mono text-[11px] text-slate-500 uppercase
                         tracking-widest bg-white/80 backdrop-blur-sm
                         px-2 py-1 rounded-lg border border-slate-200/60">
          LV {String(level.id).padStart(2, '0')}
        </span>
        <span className="font-mono text-[11px] text-slate-400 uppercase
                         tracking-wider bg-white/80 backdrop-blur-sm
                         px-2 py-1 rounded-lg border border-slate-200/60">
          {level.name}
        </span>
        <span className="font-mono text-[11px] text-slate-400 uppercase
                         tracking-wider bg-white/80 backdrop-blur-sm
                         px-2 py-1 rounded-lg border border-slate-200/60">
          {strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}
        </span>
      </div>

      {/* Bottom bar — thumb controls */}
      <div className="pointer-events-auto flex items-center justify-between
                      px-4 pb-8 pt-3
                      bg-gradient-to-t from-slate-50/85 to-transparent">

        <button onClick={onBack} aria-label="Back to level select"
          className="flex items-center gap-1.5 bg-white/90 active:bg-slate-100
                     text-slate-700 font-mono text-[13px] uppercase tracking-widest
                     px-5 py-3.5 rounded-2xl border-2 border-slate-200 shadow-sm
                     transition-transform active:scale-95 min-w-[80px] justify-center">
          <span aria-hidden="true">←</span> Back
        </button>

        <span className="font-mono text-[11px] text-slate-500 text-center
                         leading-snug max-w-[110px] pointer-events-none">
          {level.hint}
        </span>

        {phase === 'prep' ? (
          <button onClick={() => { sndLaunch(); onLaunch(); }} aria-label="Launch ball"
            className="flex items-center gap-1.5 bg-orange-500 active:bg-orange-600
                       text-white font-mono text-[13px] uppercase tracking-widest
                       px-5 py-3.5 rounded-2xl border-2 border-orange-400 shadow-sm
                       transition-transform active:scale-95 min-w-[80px] justify-center">
            <span aria-hidden="true">▶</span> Launch
          </button>
        ) : (
          <button onClick={onReset} aria-label="Reset level"
            className="flex items-center gap-1.5 bg-slate-800 active:bg-slate-900
                       text-white font-mono text-[13px] uppercase tracking-widest
                       px-5 py-3.5 rounded-2xl border-2 border-slate-600 shadow-sm
                       transition-transform active:scale-95 min-w-[80px] justify-center">
            <span aria-hidden="true">↺</span> Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WinOverlay  — slide-up card over blurred canvas
// ─────────────────────────────────────────────────────────────────────────────

function WinOverlay({ levelId, totalLevels, strokeCount, onNext, onBack }) {
  const isLast = levelId >= totalLevels;
  const strokeLabel = strokeCount === 1 ? '1 stroke' : `${strokeCount} strokes`;

  return (
    <div className="absolute inset-0 flex items-center justify-center
                    bg-slate-900/40 backdrop-blur-[2px]">
      <div className="animate-slide-up grid-paper mx-5 w-full max-w-sm
                      rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center gap-5 px-8 py-9">

          {/* Orange check badge */}
          <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center
                          justify-center shadow-lg shadow-orange-300/40">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
                 aria-hidden="true">
              <path d="M6 14.5 L11.5 20 L22 9" stroke="white" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Copy */}
          <div className="text-center">
            <p className="font-mono text-[11px] text-slate-400 uppercase
                          tracking-[0.2em] mb-1">
              Level {String(levelId).padStart(2, '0')} Complete
            </p>
            <h2 className="font-mono font-black text-slate-800 text-3xl leading-none">
              {isLast ? 'All Done!' : 'Nice Work!'}
            </h2>
            <p className="font-mono text-slate-500 text-sm mt-2">
              Solved in {strokeLabel}
            </p>
          </div>

          {/* Hairline divider */}
          <div className="w-full h-px bg-slate-200" />

          {/* Actions */}
          <div className="flex flex-col gap-2.5 w-full">
            {!isLast && (
              <button onClick={onNext}
                className="w-full bg-slate-800 active:bg-slate-900 text-white
                           font-mono font-bold uppercase tracking-widest text-sm
                           py-4 rounded-2xl border-2 border-slate-600
                           transition-transform active:scale-95">
                Next Level →
              </button>
            )}
            <button onClick={onBack}
              className="w-full bg-white active:bg-slate-100 text-slate-700
                         font-mono font-bold uppercase tracking-widest text-sm
                         py-4 rounded-2xl border-2 border-slate-200
                         transition-transform active:scale-95">
              Level Select
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GameCanvas
// key={resetKey} from parent remounts the component → clean physics reset.
// ─────────────────────────────────────────────────────────────────────────────

function GameCanvas({ level, phase, onWin, onStrokeAdded }) {
  const canvasRef     = useRef(null);
  const engineRef     = useRef(null);
  const rafRef        = useRef(null);
  const onWinRef      = useRef(onWin);
  const onStrokeRef   = useRef(onStrokeAdded);
  const hasWonRef     = useRef(false);
  const winTsRef      = useRef(0);
  const isDrawingRef  = useRef(false);
  const liveRef       = useRef([]);        // raw captured points
  const phaseRef       = useRef(phase);
  const strokeCountRef = useRef(0);
  const lastBounceRef  = useRef(0);

  useEffect(() => { onWinRef.current   = onWin; });
  useEffect(() => { onStrokeRef.current = onStrokeAdded; });

  // Release the ball when phase transitions to 'active'
  useEffect(() => {
    phaseRef.current = phase;
    if (phase === 'active' && engineRef.current) {
      const pBody = Composite.allBodies(engineRef.current.world)
                             .find(b => b.label === 'player');
      if (pBody) Body.setStatic(pBody, false);
    }
  }, [phase]);

  // ── Engine + render loop ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !level) return;

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;

    const engine = makeEngine();
    engineRef.current = engine;

    addBoundaries(engine.world, W, H);

    const { player, target, obstacles } = levelBodies(level, W, H);
    World.add(engine.world, [player, target, ...obstacles]);

    // Win detection + bounce sounds
    Events.on(engine, 'collisionStart', ev => {
      if (hasWonRef.current) return;
      for (const { bodyA, bodyB } of ev.pairs) {
        const labels = [bodyA.label, bodyB.label].sort().join();
        if (labels === 'player,target') {
          hasWonRef.current = true;
          winTsRef.current  = Date.now();
          sndWin();
          setTimeout(() => onWinRef.current?.(), 420);
          return;
        }
        if (labels.includes('player')) {
          const now = Date.now();
          if (now - lastBounceRef.current > 80) {
            lastBounceRef.current = now;
            const p = bodyA.label === 'player' ? bodyA : bodyB;
            sndBounce(Math.hypot(p.velocity.x, p.velocity.y));
          }
        }
      }
    });

    const runner = Runner.create();
    Runner.run(runner, engine);

    // rAF render loop
    function frame() {
      const ctx    = canvas.getContext('2d');
      const bodies = Composite.allBodies(engine.world);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      // Layers (back → front)
      drawGrid(ctx, W, H);
      renderObstacles(ctx, bodies);
      renderTarget(ctx, bodies);
      renderWinBurst(ctx, bodies, winTsRef.current);
      renderDrawn(ctx, bodies);
      renderPlayer(ctx, bodies, phaseRef.current === 'prep');
      renderLiveStroke(ctx, liveRef.current);

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer / drawing ─────────────────────────────────────────────────────
  const getPos = useCallback(e => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onDown = useCallback(e => {
    if (hasWonRef.current) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    liveRef.current = [getPos(e)];
  }, [getPos]);

  const onMove = useCallback(e => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    if (liveRef.current.length >= MAX_PTS) return; // cap stroke length
    const p = getPos(e);
    const last = liveRef.current[liveRef.current.length - 1];
    const dx = p.x - last.x, dy = p.y - last.y;
    // Inline distance filter for perf (avoids allocating in subsample later)
    if (dx * dx + dy * dy >= MIN_PT_DIST * MIN_PT_DIST)
      liveRef.current.push(p);
  }, [getPos]);

  const onUp = useCallback(e => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const raw = liveRef.current;
    liveRef.current = [];
    if (raw.length < 2) return;

    const smooth = chaikinSmooth(subsamplePoints(raw), 3);
    const segs   = pathToSegments(smooth, STROKE_W);
    if (!segs.length) return;

    World.add(engineRef.current.world, segs);
    sndStroke();
    onStrokeRef.current?.(++strokeCountRef.current);
  }, []);

  return (
    <canvas ref={canvasRef}
      className="block w-full h-full"
      style={{
        touchAction: 'none',
        cursor: 'crosshair',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App state machine
// ─────────────────────────────────────────────────────────────────────────────

const INIT = {
  screen: 'home',              // 'home' | 'levelSelect' | 'playing' | 'win'
  levelId: 1,
  completedLevels: [],
  resetKey: 0,
  strokeCount: 0,
  phase: 'prep',               // 'prep' (ball frozen) | 'active' (ball live)
};

function reduce(s, a) {
  switch (a.type) {
    case 'HOME':   return { ...s, screen: 'home' };
    case 'SELECT': return { ...s, screen: 'levelSelect' };
    case 'PLAY':   return { ...s, screen: 'playing',
                            levelId: a.id, resetKey: s.resetKey + 1,
                            strokeCount: 0, phase: 'prep' };
    case 'LAUNCH': return { ...s, phase: 'active' };
    case 'WIN': {
      const cl = s.completedLevels.includes(s.levelId)
        ? s.completedLevels
        : [...s.completedLevels, s.levelId];
      return { ...s, screen: 'win', completedLevels: cl };
    }
    case 'RESET':  return { ...s, screen: 'playing',
                            resetKey: s.resetKey + 1, strokeCount: 0, phase: 'prep' };
    case 'NEXT':   return { ...s, screen: 'playing',
                            levelId: Math.min(s.levelId + 1, LEVELS.length),
                            resetKey: s.resetKey + 1, strokeCount: 0, phase: 'prep' };
    case 'STROKE': return { ...s, strokeCount: a.count };
    default:       return s;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

export default function Game() {
  const [s, dispatch] = useReducer(reduce, INIT);
  const level = LEVELS.find(l => l.id === s.levelId);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50">

      {s.screen === 'home' && (
        <HomeScreen onPlay={() => dispatch({ type: 'SELECT' })} />
      )}

      {s.screen === 'levelSelect' && (
        <LevelSelectScreen
          levels={LEVELS}
          completedLevels={s.completedLevels}
          onSelect={id => dispatch({ type: 'PLAY', id })}
          onBack={() => dispatch({ type: 'HOME' })}
        />
      )}

      {(s.screen === 'playing' || s.screen === 'win') && level && (
        <div className="relative w-full h-full">
          {/*
            key={resetKey} — React unmounts + remounts GameCanvas on Reset/level
            change, fully reinitialising the Matter.js engine.
          */}
          <GameCanvas
            key={s.resetKey}
            level={level}
            phase={s.phase}
            onWin={() => dispatch({ type: 'WIN' })}
            onStrokeAdded={count => dispatch({ type: 'STROKE', count })}
          />
          <HintCard
            hint={level.hint}
            visible={s.phase === 'prep' && s.strokeCount === 0}
          />
          <GameHUD
            level={level}
            phase={s.phase}
            strokeCount={s.strokeCount}
            onBack={() => dispatch({ type: 'SELECT' })}
            onReset={() => dispatch({ type: 'RESET' })}
            onLaunch={() => dispatch({ type: 'LAUNCH' })}
          />
          {s.screen === 'win' && (
            <WinOverlay
              levelId={s.levelId}
              totalLevels={LEVELS.length}
              strokeCount={s.strokeCount}
              onNext={() => dispatch({ type: 'NEXT' })}
              onBack={() => dispatch({ type: 'SELECT' })}
            />
          )}
        </div>
      )}

    </div>
  );
}
