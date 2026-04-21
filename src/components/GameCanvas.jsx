import { useRef, useEffect, useCallback } from 'react';
import Matter from 'matter-js';
import { subsamplePoints, chaikinSmooth } from '../engine/pathSmoother';
import {
  createEngine,
  createBoundaries,
  createBodyFromPath,
  STROKE_THICKNESS,
} from '../engine/PhysicsEngine';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  bg: '#f8fafc',            // slate-50
  gridMinor: '#e2e8f0',     // slate-200  – fine grid lines
  gridMajor: '#cbd5e1',     // slate-300  – major grid lines
  darkSlate: '#334155',     // slate-700  – used for static/boundary hints
  penBlue: '#3b82f6',       // blue-500   – settled drawn bodies
  penBlueDark: '#2563eb',   // blue-600   – live in-progress stroke
  penBlueGlow: 'rgba(59,130,246,0.25)',
};

const GRID = 24; // minor grid cell size in px
const MAJOR_EVERY = 5; // major grid every N minor cells

// ---------------------------------------------------------------------------
// Pure canvas drawing helpers (called inside rAF, no React state)
// ---------------------------------------------------------------------------

function drawGrid(ctx, w, h) {
  ctx.save();

  // Minor lines
  ctx.beginPath();
  ctx.strokeStyle = C.gridMinor;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += GRID) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += GRID) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Major lines
  ctx.beginPath();
  ctx.strokeStyle = C.gridMajor;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += GRID * MAJOR_EVERY) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += GRID * MAJOR_EVERY) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.restore();
}

function drawBody(ctx, body) {
  // Compound bodies: parts[0] is the parent, actual shapes start at index 1.
  // Non-compound bodies: parts[0] is the body itself.
  const shapes = body.parts.length > 1 ? body.parts.slice(1) : body.parts;

  ctx.save();
  ctx.fillStyle = C.penBlue;

  // Soft glow passes first (cheap 1-pass shadow)
  ctx.shadowColor = C.penBlueGlow;
  ctx.shadowBlur = 6;

  shapes.forEach((part) => {
    const verts = part.vertices;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Render all physics bodies labelled 'drawn' (skip invisible boundaries).
 */
function drawBodies(ctx, bodies) {
  bodies.forEach((body) => {
    if (body.label !== 'drawn') return;
    drawBody(ctx, body);
  });
}

/**
 * Live stroke preview rendered while the user is still drawing.
 * Uses midpoint quadratic Béziers so the preview looks smooth even before
 * the Chaikin smoothing is applied on pointer-up.
 */
function drawLiveStroke(ctx, points) {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = C.penBlueDark;
  ctx.lineWidth = STROKE_THICKNESS;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.85;
  ctx.shadowColor = C.penBlueGlow;
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Mid-point quadratic Bézier through each control point
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }

  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const rafRef = useRef(null);

  // Drawing state stored in refs so the rAF loop always sees fresh values
  // without triggering re-renders.
  const isDrawingRef = useRef(false);
  const liveStrokeRef = useRef([]); // raw points collected during current gesture

  // -------------------------------------------------------------------------
  // Engine + render loop init
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size the backing buffer to match the layout size × devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    // Matter.js engine (no built-in renderer — we draw everything ourselves)
    const engine = createEngine();
    engineRef.current = engine;
    createBoundaries(engine.world, w, h);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    // rAF render loop
    function frame() {
      const ctx = canvas.getContext('2d');

      // Scale all draw calls to CSS pixels so coordinates stay intuitive
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, h);

      drawGrid(ctx, w, h);
      drawBodies(ctx, Matter.Composite.allBodies(engine.world));
      drawLiveStroke(ctx, liveStrokeRef.current);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Pointer helpers
  // -------------------------------------------------------------------------
  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      canvasRef.current.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      liveStrokeRef.current = [getPos(e)];
    },
    [getPos],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      liveStrokeRef.current = [...liveStrokeRef.current, getPos(e)];
    },
    [getPos],
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;

      const raw = liveStrokeRef.current;
      liveStrokeRef.current = []; // clear preview immediately

      if (raw.length < 2) return;

      // Reduce point density then smooth
      const sampled = subsamplePoints(raw, 6);
      const smooth = chaikinSmooth(sampled, 3);

      const body = createBodyFromPath(smooth, STROKE_THICKNESS);
      if (body) Matter.World.add(engineRef.current.world, body);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      style={{
        touchAction: 'none',   // prevent browser scroll/zoom on touch
        cursor: 'crosshair',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
