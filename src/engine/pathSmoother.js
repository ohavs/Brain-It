/**
 * Remove points closer than `minDist` pixels apart to keep segment counts sane.
 * @param {{ x: number, y: number }[]} points
 * @param {number} minDist
 */
export function subsamplePoints(points, minDist = 6) {
  if (points.length < 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const dx = points[i].x - prev.x;
    const dy = points[i].y - prev.y;
    if (Math.sqrt(dx * dx + dy * dy) >= minDist) {
      out.push(points[i]);
    }
  }
  // Always include the final endpoint.
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/**
 * Chaikin's corner-cutting algorithm.
 * Each iteration replaces every edge P0→P1 with two new points:
 *   Q = 0.75·P0 + 0.25·P1  (¼ from P0)
 *   R = 0.25·P0 + 0.75·P1  (¼ from P1)
 * Open paths preserve their endpoints so the stroke stays anchored.
 *
 * @param {{ x: number, y: number }[]} points
 * @param {number} iterations
 */
export function chaikinSmooth(points, iterations = 3) {
  if (points.length < 3) return points;
  let pts = points;

  for (let iter = 0; iter < iterations; iter++) {
    const next = [pts[0]]; // preserve start
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      next.push(
        { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y },
        { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y },
      );
    }
    next.push(pts[pts.length - 1]); // preserve end
    pts = next;
  }
  return pts;
}
