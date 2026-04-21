/**
 * Level definitions.
 *
 * Coordinate system
 * -----------------
 * x, y        : fraction of canvas width / height  (0 = left/top, 1 = right/bottom)
 * radius      : fraction of Math.min(canvasW, canvasH)
 * obstacle w  : fraction of canvas width
 * obstacle h  : fraction of canvas height
 * obstacle angle : radians (positive = clockwise)
 */

export const LEVELS = [
  {
    id: 1,
    name: 'Open Field',
    hint: 'Draw a ramp to guide the ball',
    player: { x: 0.18, y: 0.08, radius: 0.036 },
    target: { x: 0.78, y: 0.82, radius: 0.052 },
    obstacles: [],
  },
  {
    id: 2,
    name: 'The Ledge',
    hint: 'Bridge the gap',
    player: { x: 0.18, y: 0.07, radius: 0.036 },
    target: { x: 0.78, y: 0.76, radius: 0.052 },
    obstacles: [
      { shape: 'rect', x: 0.56, y: 0.42, w: 0.46, h: 0.018, angle: 0 },
    ],
  },
  {
    id: 3,
    name: 'Slope Ahead',
    hint: 'Work with the angle',
    player: { x: 0.15, y: 0.06, radius: 0.036 },
    target: { x: 0.80, y: 0.80, radius: 0.052 },
    obstacles: [
      { shape: 'rect', x: 0.50, y: 0.40, w: 0.52, h: 0.018, angle: 0.22 },
    ],
  },
  {
    id: 4,
    name: 'Two Floors',
    hint: 'Navigate the staggered platforms',
    player: { x: 0.50, y: 0.06, radius: 0.036 },
    target: { x: 0.78, y: 0.85, radius: 0.052 },
    obstacles: [
      { shape: 'rect', x: 0.28, y: 0.35, w: 0.38, h: 0.018, angle: 0 },
      { shape: 'rect', x: 0.72, y: 0.60, w: 0.38, h: 0.018, angle: 0 },
    ],
  },
  {
    id: 5,
    name: 'The Funnel',
    hint: 'Thread the needle',
    player: { x: 0.50, y: 0.06, radius: 0.036 },
    target: { x: 0.50, y: 0.84, radius: 0.052 },
    obstacles: [
      { shape: 'rect', x: 0.22, y: 0.40, w: 0.32, h: 0.018, angle: 0.42 },
      { shape: 'rect', x: 0.78, y: 0.40, w: 0.32, h: 0.018, angle: -0.42 },
    ],
  },
  {
    id: 6,
    name: 'Step Down',
    hint: 'Use the staircase',
    player: { x: 0.15, y: 0.07, radius: 0.036 },
    target: { x: 0.80, y: 0.85, radius: 0.052 },
    obstacles: [
      { shape: 'rect', x: 0.32, y: 0.32, w: 0.36, h: 0.018, angle: 0 },
      { shape: 'rect', x: 0.64, y: 0.54, w: 0.36, h: 0.018, angle: 0 },
    ],
  },
  {
    id: 7,
    name: 'The Divider',
    hint: 'Find a way around the wall',
    player: { x: 0.20, y: 0.07, radius: 0.036 },
    target: { x: 0.78, y: 0.82, radius: 0.052 },
    obstacles: [
      // Near-vertical centre wall
      { shape: 'rect', x: 0.50, y: 0.44, w: 0.018, h: 0.46, angle: 0.04 },
    ],
  },
  {
    id: 8,
    name: 'Zigzag',
    hint: 'Weave through the gaps',
    player: { x: 0.20, y: 0.06, radius: 0.036 },
    target: { x: 0.78, y: 0.88, radius: 0.052 },
    obstacles: [
      // Gap on the right  →  left-anchored plank
      { shape: 'rect', x: 0.36, y: 0.30, w: 0.62, h: 0.018, angle: 0 },
      // Gap on the left   →  right-anchored plank
      { shape: 'rect', x: 0.64, y: 0.56, w: 0.62, h: 0.018, angle: 0 },
    ],
  },
  {
    id: 9,
    name: 'Corner Pocket',
    hint: 'Redirect the ball up and right',
    player: { x: 0.18, y: 0.07, radius: 0.036 },
    target: { x: 0.80, y: 0.22, radius: 0.052 },
    obstacles: [
      // Slanted shelf deflects ball towards centre
      { shape: 'rect', x: 0.46, y: 0.50, w: 0.58, h: 0.018, angle: 0.18 },
      // Right-side vertical stop
      { shape: 'rect', x: 0.86, y: 0.38, w: 0.018, h: 0.38, angle: 0 },
    ],
  },
  {
    id: 10,
    name: 'Grand Finale',
    hint: 'Master everything you have learned',
    player: { x: 0.50, y: 0.05, radius: 0.036 },
    target: { x: 0.80, y: 0.85, radius: 0.052 },
    obstacles: [
      { shape: 'rect', x: 0.28, y: 0.28, w: 0.36, h: 0.018, angle: -0.15 },
      { shape: 'rect', x: 0.70, y: 0.44, w: 0.36, h: 0.018, angle: 0.15 },
      { shape: 'rect', x: 0.30, y: 0.62, w: 0.36, h: 0.018, angle: 0 },
      { shape: 'rect', x: 0.74, y: 0.70, w: 0.018, h: 0.24, angle: 0 },
    ],
  },
];
