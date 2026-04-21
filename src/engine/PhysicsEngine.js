import Matter from 'matter-js';

const { Engine, World, Bodies, Body } = Matter;

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
