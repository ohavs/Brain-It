import Matter from 'matter-js';

const { Engine, World, Bodies, Body } = Matter;

// Colours exported so GameCanvas can stay in sync without duplicating them.
export const COLORS = {
  obstacle: '#334155',   // dark slate
  target:   '#f97316',   // orange-500
  player:   '#3b82f6',   // blue-500
};

/** Shared physics constants */
export const STROKE_THICKNESS = 7; // px — matches the canvas stroke width

/**
 * Create and return a Matter.js engine with sensible mobile-game defaults.
 */
export function createEngine() {
  return Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 },
    enableSleeping: true,
    // Tighter position iterations give compound bodies a stable feel.
    positionIterations: 10,
    velocityIterations: 8,
  });
}

/**
 * Add invisible static boundary walls and a floor to the world.
 * @param {Matter.World} world
 * @param {number} width  — CSS pixels
 * @param {number} height — CSS pixels
 */
export function createBoundaries(world, width, height) {
  const T = 80;
  World.add(world, [
    // Floor
    Bodies.rectangle(width / 2, height + T / 2, width + T * 2, T, {
      isStatic: true,
      label: 'boundary',
      friction: 0.7,
      restitution: 0.1,
    }),
    // Left wall
    Bodies.rectangle(-T / 2, height / 2, T, height + T * 2, {
      isStatic: true,
      label: 'boundary',
    }),
    // Right wall
    Bodies.rectangle(width + T / 2, height / 2, T, height + T * 2, {
      isStatic: true,
      label: 'boundary',
    }),
  ]);
}

/**
 * Convert a smoothed polyline into a single compound Matter.js rigid body.
 *
 * Each consecutive pair of points becomes a thin rectangle (segment).
 * All segments are combined into one Body so the whole stroke tumbles
 * under gravity as a single object.
 *
 * @param {{ x: number, y: number }[]} points  — smoothed polyline
 * @param {number} thickness                   — stroke width in px
 * @returns {Matter.Body | null}
 */
export function createBodyFromPath(points, thickness = STROKE_THICKNESS) {
  if (points.length < 2) return null;

  const parts = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen < 1) continue;

    // Rectangle centred on the segment midpoint, rotated along the segment.
    // We add `thickness` to the length so adjacent caps overlap slightly,
    // keeping the compound body visually gapless.
    parts.push(
      Bodies.rectangle(
        (p0.x + p1.x) / 2,
        (p0.y + p1.y) / 2,
        segLen + thickness,
        thickness,
        { angle: Math.atan2(dy, dx) },
      ),
    );
  }

  if (parts.length === 0) return null;

  return Body.create({
    parts,
    isStatic: false,
    friction: 0.55,
    frictionAir: 0.008,
    restitution: 0.18,
    label: 'drawn',
    // density keeps light strokes from being unrealistically heavy
    density: 0.001,
  });
}

/**
 * Instantiate the static obstacles, dynamic player, and sensor target
 * defined in a level descriptor, scaled to the actual canvas dimensions.
 *
 * Coordinate convention (from levels.js):
 *   x, y        — fraction of canvasW / canvasH
 *   radius      — fraction of Math.min(canvasW, canvasH)
 *   obstacle.w  — fraction of canvasW
 *   obstacle.h  — fraction of canvasH
 *   obstacle.angle — radians
 *
 * @param {object} level   — level descriptor from levels.js
 * @param {number} canvasW — CSS pixel width of the canvas
 * @param {number} canvasH — CSS pixel height of the canvas
 * @returns {{ playerBody: Matter.Body, targetBody: Matter.Body, obstacleBodies: Matter.Body[] }}
 */
export function createLevelBodies(level, canvasW, canvasH) {
  const minDim = Math.min(canvasW, canvasH);

  const playerBody = Bodies.circle(
    level.player.x * canvasW,
    level.player.y * canvasH,
    level.player.radius * minDim,
    {
      label: 'player',
      friction: 0.35,
      frictionAir: 0.01,
      restitution: 0.45,
      density: 0.003,
    },
  );

  // isSensor = true so the ball passes through; collision events still fire.
  const targetBody = Bodies.circle(
    level.target.x * canvasW,
    level.target.y * canvasH,
    level.target.radius * minDim,
    {
      label: 'target',
      isStatic: true,
      isSensor: true,
    },
  );

  const obstacleBodies = (level.obstacles ?? []).map((obs) =>
    Bodies.rectangle(
      obs.x * canvasW,
      obs.y * canvasH,
      obs.w * canvasW,
      obs.h * canvasH,
      {
        isStatic: true,
        label: 'obstacle',
        angle: obs.angle ?? 0,
        friction: 0.65,
        restitution: 0.15,
      },
    ),
  );

  return { playerBody, targetBody, obstacleBodies };
}
