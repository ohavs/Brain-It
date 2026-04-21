import { useRef, useEffect, useCallback } from 'react';
import Matter from 'matter-js';
import { subsamplePoints, chaikinSmooth } from '../engine/pathSmoother';
import {
  createEngine,
  createBoundaries,
  createBodyFromPath,
  createLevelBodies,
  STROKE_THICKNESS,
  COLORS,
} from '../engine/PhysicsEngine';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  bg:           '#f8fafc',
  gridMinor:    '#e2e8f0',
  gridMajor:    '#cbd5e1',
  penBlue:      '#3b82f6',
  penBlueDark:  '#2563eb',
  penBlueGlow:  'rgba(59,130,246,0.22)',
  obstacle:     COLORS.obstacle,
  obstacleTrim: '#475569',
  orange:       COLORS.target,
  orangeGlow:   'rgba(249,115,22,0.28)',
  playerGlow:   'rgba(37,99,235,0.3)',
};

const GRID = 24;
const MAJOR_EVERY = 5;

// ---------------------------------------------------------------------------
// Canvas drawing helpers
// ---------------------------------------------------------------------------

function drawGrid(ctx, w, h) {
  ctx.save();

  ctx.beginPath();
  ctx.strokeStyle = C.gridMinor;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += GRID) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y <= h; y += GRID) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = C.gridMajor;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += GRID * MAJOR_EVERY) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y <= h; y += GRID * MAJOR_EVERY) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  ctx.restore();
}

function drawPolygon(ctx, vertices) {
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
  ctx.closePath();
}

/** Dark-slate static obstacles */
function drawObstacles(ctx, bodies) {
  const obs = bodies.filter((b) => b.label === 'obstacle');
  if (!obs.length) return;

  ctx.save();
  obs.forEach((body) => {
    drawPolygon(ctx, body.vertices);
    ctx.fillStyle = C.obstacle;
    ctx.fill();
    // Top-edge highlight for a chiselled-plate look
    ctx.strokeStyle = C.obstacleTrim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  ctx.restore();
}

/** Orange pulsing sensor target */
function drawTarget(ctx, bodies) {
  const body = bodies.find((b) => b.label === 'target');
  if (!body) return;

  const { x, y } = body.position;
  const r = body.circleRadius ?? 24;
  const pulse = (Math.sin(Date.now() / 320) + 1) / 2; // 0 → 1

  ctx.save();

  // Ambient glow halo
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
  grad.addColorStop(0, `rgba(249,115,22,${0.28 + 0.14 * pulse})`);
  grad.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55 + 0.25 * pulse;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Core disc
  ctx.shadowColor = C.orange;
  ctx.shadowBlur = 10 + 6 * pulse;
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.28, r * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Blue player ball */
function drawPlayer(ctx, bodies) {
  const body = bodies.find((b) => b.label === 'player');
  if (!body) return;

  const { x, y } = body.position;
  const r = body.circleRadius ?? 14;

  ctx.save();
  ctx.shadowColor = C.playerGlow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = C.penBlue;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.28, r * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Drawn (dynamic) strokes */
function drawDrawnBodies(ctx, bodies) {
  const drawn = bodies.filter((b) => b.label === 'drawn');
  if (!drawn.length) return;

  ctx.save();
  ctx.fillStyle = C.penBlue;
  ctx.shadowColor = C.penBlueGlow;
  ctx.shadowBlur = 6;

  drawn.forEach((body) => {
    const shapes = body.parts.length > 1 ? body.parts.slice(1) : body.parts;
    shapes.forEach((part) => {
      drawPolygon(ctx, part.vertices);
      ctx.fill();
    });
  });
  ctx.restore();
}

/** Live stroke preview while drawing */
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

/**
 * @param {{ level: object, onWin: () => void }} props
 *
 * `key` is managed by App — incrementing it remounts the component,
 * which acts as the reset mechanism (engine + all bodies are recreated).
 */
export default function GameCanvas({ level, onWin }) {
  const canvasRef   = useRef(null);
  const engineRef   = useRef(null);
  const runnerRef   = useRef(null);
  const rafRef      = useRef(null);
  const onWinRef    = useRef(onWin);
  const hasWonRef   = useRef(false);
  const isDrawingRef  = useRef(false);
  const liveStrokeRef = useRef([]);

  // Keep onWin ref fresh without restarting the effect
  useEffect(() => { onWinRef.current = onWin; });

  // -------------------------------------------------------------------------
  // Init engine, level bodies, render loop
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !level) return;

    const dpr = window.devicePixelRatio || 1;
    const w   = window.innerWidth;
    const h   = window.innerHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;

    const engine = createEngine();
    engineRef.current = engine;

    createBoundaries(engine.world, w, h);

    const { playerBody, targetBody, obstacleBodies } = createLevelBodies(level, w, h);
    Matter.World.add(engine.world, [playerBody, targetBody, ...obstacleBodies]);

    // Win detection via collision events
    Matter.Events.on(engine, 'collisionStart', (event) => {
      if (hasWonRef.current) return;
      for (const { bodyA, bodyB } of event.pairs) {
        const labels = [bodyA.label, bodyB.label];
        if (labels.includes('player') && labels.includes('target')) {
          hasWonRef.current = true;
          onWinRef.current?.();
          return;
        }
      }
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    function frame() {
      const ctx    = canvas.getContext('2d');
      const bodies = Matter.Composite.allBodies(engine.world);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, h);

      // Layers (back → front)
      drawGrid(ctx, w, h);
      drawObstacles(ctx, bodies);
      drawTarget(ctx, bodies);
      drawDrawnBodies(ctx, bodies);
      drawPlayer(ctx, bodies);
      drawLiveStroke(ctx, liveStrokeRef.current);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Empty deps: App passes key={resetKey} so the component remounts for level
  // changes and resets — no need to re-run this effect mid-lifecycle.

  // -------------------------------------------------------------------------
  // Pointer / drawing handlers
  // -------------------------------------------------------------------------
  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (hasWonRef.current) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    liveStrokeRef.current = [getPos(e)];
  }, [getPos]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    liveStrokeRef.current.push(getPos(e));
  }, [getPos]);

  const handlePointerUp = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const raw = liveStrokeRef.current;
    liveStrokeRef.current = [];

    if (raw.length < 2) return;

    const smooth = chaikinSmooth(subsamplePoints(raw, 6), 3);
    const body   = createBodyFromPath(smooth, STROKE_THICKNESS);
    if (body) Matter.World.add(engineRef.current.world, body);
  }, []);

  // -------------------------------------------------------------------------
  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      style={{ touchAction: 'none', cursor: 'crosshair', userSelect: 'none',
               WebkitUserSelect: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
