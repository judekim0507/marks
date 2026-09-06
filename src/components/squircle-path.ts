/**
 * Figma corner-smoothing path generator — a port of Lisse's squircle core
 * (https://github.com/JaceThings/Lisse, MIT), which in turn extends
 * figma-squircle.
 *
 * Three regimes, chosen per call:
 *
 *  1. Classic squircle — cubic shoulder, central arc, cubic shoulder on each
 *     corner. Each corner's rounding-and-smoothing budget is min over its two
 *     edges of `radius / (radius + adjacentRadius) * sideLength`, computed from
 *     the requested radii. Verified numerically against Figma's own SVG
 *     exports (uniform radii, and mixed 60/10 radii).
 *
 *  2. Blend band — a uniform squircle whose short side sits strictly between
 *     2R and 2(1+s)R. The classic template would clamp smoothing on every edge
 *     and visibly pop while resizing toward a capsule; here each edge keeps as
 *     much smoothing as it has room for, so the roomy long edges stay fully
 *     smoothed while the short edges give theirs up.
 *
 *  3. Capsule ends — when both corners on one end reach half the short side,
 *     that end becomes a single Sketch-style cap: shoulder → arc → arc →
 *     mirrored shoulder, with all the smoothing carried by the long edge. This
 *     is what makes pills look smoothed instead of collapsing to plain
 *     semicircles.
 *
 * `preserveSmoothing` (default true, as in Lisse) compresses the shoulder
 * curve when the budget is tight instead of lowering the smoothing value.
 */

export type SquirclePathParams = {
  width: number;
  height: number;
  /** Figma corner smoothing, 0–1. */
  cornerSmoothing: number;
  cornerRadius?: number;
  topLeftCornerRadius?: number;
  topRightCornerRadius?: number;
  bottomRightCornerRadius?: number;
  bottomLeftCornerRadius?: number;
  /** Keep the smoothing curve shape when the budget is tight (Lisse default). */
  preserveSmoothing?: boolean;
};

type CornerParams = {
  radius: number;
  a: number;
  b: number;
  c: number;
  d: number;
  p: number;
  arcSectionLength: number;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const n = (value: number) => Number((Object.is(value, -0) ? 0 : value).toFixed(4));

const EMPTY: CornerParams = { radius: 0, a: 0, b: 0, c: 0, d: 0, p: 0, arcSectionLength: 0 };

/** Figma figure 11.1 / 12.2 — bezier parameters for one squircle corner. */
function cornerParams(
  radius: number,
  cornerSmoothing: number,
  preserveSmoothing: boolean,
  budget: number,
): CornerParams {
  if (radius <= 0) return EMPTY;

  let smoothing = cornerSmoothing;
  let p = (1 + smoothing) * radius;

  if (!preserveSmoothing) {
    smoothing = Math.min(smoothing, budget / radius - 1);
    p = Math.min(p, budget);
  }

  const arcMeasure = 90 * (1 - smoothing);
  const arcSectionLength =
    Math.sin(toRadians(arcMeasure / 2)) * radius * Math.SQRT2;
  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Distance = radius * Math.tan(toRadians(angleAlpha / 2));
  const angleBeta = 45 * smoothing;
  const c = p3ToP4Distance * Math.cos(toRadians(angleBeta));
  const d = c * Math.tan(toRadians(angleBeta));

  let b = (p - arcSectionLength - c - d) / 3;
  let a = 2 * b;

  if (preserveSmoothing && p > budget) {
    const p1ToP3MaxDistance = budget - d - arcSectionLength - c;
    const minA = p1ToP3MaxDistance / 6;
    const maxB = p1ToP3MaxDistance - minA;
    b = Math.min(b, maxB);
    a = p1ToP3MaxDistance - b;
    p = Math.min(p, budget);
  }

  return { radius, a, b, c, d, p, arcSectionLength };
}

// ---------------------------------------------------------------------------
// Regime 1: classic squircle corners

function drawTopRight({ radius, a, b, c, d, arcSectionLength }: CornerParams) {
  if (!radius) return '';
  return (
    `c ${n(a)} 0 ${n(a + b)} 0 ${n(a + b + c)} ${n(d)} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(arcSectionLength)} ${n(arcSectionLength)} ` +
    `c ${n(d)} ${n(c)} ${n(d)} ${n(b + c)} ${n(d)} ${n(a + b + c)}`
  );
}

function drawBottomRight({ radius, a, b, c, d, arcSectionLength }: CornerParams) {
  if (!radius) return '';
  return (
    `c 0 ${n(a)} 0 ${n(a + b)} ${n(-d)} ${n(a + b + c)} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(-arcSectionLength)} ${n(arcSectionLength)} ` +
    `c ${n(-c)} ${n(d)} ${n(-(b + c))} ${n(d)} ${n(-(a + b + c))} ${n(d)}`
  );
}

function drawBottomLeft({ radius, a, b, c, d, arcSectionLength }: CornerParams) {
  if (!radius) return '';
  return (
    `c ${n(-a)} 0 ${n(-(a + b))} 0 ${n(-(a + b + c))} ${n(-d)} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(-arcSectionLength)} ${n(-arcSectionLength)} ` +
    `c ${n(-d)} ${n(-c)} ${n(-d)} ${n(-(b + c))} ${n(-d)} ${n(-(a + b + c))}`
  );
}

function drawTopLeft({ radius, a, b, c, d, arcSectionLength }: CornerParams) {
  if (!radius) return '';
  return (
    `c 0 ${n(-a)} 0 ${n(-(a + b))} ${n(d)} ${n(-(a + b + c))} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(arcSectionLength)} ${n(-arcSectionLength)} ` +
    `c ${n(c)} ${n(-d)} ${n(b + c)} ${n(-d)} ${n(a + b + c)} ${n(-d)}`
  );
}

const seg = (s: string) => (s ? ` ${s}` : '');

// ---------------------------------------------------------------------------
// Regime 2: blend band (per-edge smoothing for a uniform near-capsule)

type Shoulder = { a: number; b: number; p: number; sin: number; cos: number };

function shoulder(R: number, sEdge: number, preserveSmoothing: boolean, room: number): Shoulder {
  const params = cornerParams(R, sEdge, preserveSmoothing, room);
  const beta = toRadians(45 * sEdge);
  return { a: params.a, b: params.b, p: params.p, sin: Math.sin(beta), cos: Math.cos(beta) };
}

const clampEdge = (room: number, R: number, s: number) =>
  Math.max(0, Math.min(room / R - 1, s));

function drawBlendPath(
  width: number,
  height: number,
  R: number,
  smoothing: number,
  preserveSmoothing: boolean,
): string {
  const H = shoulder(R, clampEdge(width / 2, R, smoothing), preserveSmoothing, width / 2);
  const V = shoulder(R, clampEdge(height / 2, R, smoothing), preserveSmoothing, height / 2);

  // One corner, oriented by unit axes: u points from the corner back along the
  // arrival edge, v along the departure edge.
  const corner = (cx: number, cy: number, ux: number, uy: number, vx: number, vy: number) => {
    const s1 = uy === 0 ? H : V;
    const s2 = vy === 0 ? H : V;
    const ox = cx + (ux + vx) * R;
    const oy = cy + (uy + vy) * R;
    const j1x = ox - vx * R * s1.cos - ux * R * s1.sin;
    const j1y = oy - vy * R * s1.cos - uy * R * s1.sin;
    const j2x = ox - ux * R * s2.cos - vx * R * s2.sin;
    const j2y = oy - uy * R * s2.cos - vy * R * s2.sin;
    const p0x = cx + ux * s1.p;
    const p0y = cy + uy * s1.p;
    const arced = Math.hypot(j2x - j1x, j2y - j1y) > 1e-6;
    const ex = arced ? j2x : j1x;
    const ey = arced ? j2y : j1y;
    const p3x = cx + vx * s2.p;
    const p3y = cy + vy * s2.p;
    let d = `L ${n(p0x)} ${n(p0y)} `;
    d +=
      `c ${n(-ux * s1.a)} ${n(-uy * s1.a)} ${n(-ux * (s1.a + s1.b))} ${n(-uy * (s1.a + s1.b))} ` +
      `${n(j1x - p0x)} ${n(j1y - p0y)} `;
    if (arced) d += `a ${n(R)} ${n(R)} 0 0 1 ${n(j2x - j1x)} ${n(j2y - j1y)} `;
    d +=
      `c ${n(p3x - vx * (s2.a + s2.b) - ex)} ${n(p3y - vy * (s2.a + s2.b) - ey)} ` +
      `${n(p3x - vx * s2.a - ex)} ${n(p3y - vy * s2.a - ey)} ${n(p3x - ex)} ${n(p3y - ey)}`;
    return d;
  };

  const tr = corner(width, 0, -1, 0, 0, 1);
  const br = corner(width, height, 0, -1, -1, 0);
  const bl = corner(0, height, 1, 0, 0, -1);
  const tl = corner(0, 0, 0, 1, 1, 0);
  return `M ${n(H.p)} 0 ${tr} ${br} ${bl} ${tl} Z`;
}

// ---------------------------------------------------------------------------
// Regime 3: capsule end caps

type CapParams = {
  p: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  ax: number;
  ay: number;
  R: number;
};

function capsuleEndParams(
  R: number,
  smoothing: number,
  preserveSmoothing: boolean,
  longHalf: number,
): CapParams {
  // The flat edge absorbs all smoothing; near-square shapes collapse to a
  // true circle.
  const sEff = Math.min(smoothing, longHalf / R - 1);
  const params = cornerParams(R, sEff, preserveSmoothing, longHalf);
  const e = params.a + params.b + params.c;
  return {
    p: params.p,
    a: params.a,
    b: params.b,
    c: params.c,
    d: params.d,
    e,
    ax: params.p - e,
    ay: R - params.d,
    R,
  };
}

/** Right cap: (width−p, 0) → (width−p, height). */
function drawRightCap({ a, b, c, d, e, ax, ay, R }: CapParams) {
  return (
    `c ${n(a)} 0 ${n(a + b)} 0 ${n(e)} ${n(d)} ` +
    `a ${n(R)} ${n(R)} 0 0 1 ${n(ax)} ${n(ay)} a ${n(R)} ${n(R)} 0 0 1 ${n(-ax)} ${n(ay)} ` +
    `c ${n(-c)} ${n(d)} ${n(-(b + c))} ${n(d)} ${n(-e)} ${n(d)}`
  );
}

/** Left cap: (p, height) → (p, 0). */
function drawLeftCap({ a, b, c, d, e, ax, ay, R }: CapParams) {
  return (
    `c ${n(-a)} 0 ${n(-(a + b))} 0 ${n(-e)} ${n(-d)} ` +
    `a ${n(R)} ${n(R)} 0 0 1 ${n(-ax)} ${n(-ay)} a ${n(R)} ${n(R)} 0 0 1 ${n(ax)} ${n(-ay)} ` +
    `c ${n(c)} ${n(-d)} ${n(b + c)} ${n(-d)} ${n(e)} ${n(-d)}`
  );
}

/** Top cap: (0, p) → (width, p). */
function drawTopCap({ a, b, c, d, e, ax, ay, R }: CapParams) {
  return (
    `c 0 ${n(-a)} 0 ${n(-(a + b))} ${n(d)} ${n(-e)} ` +
    `a ${n(R)} ${n(R)} 0 0 1 ${n(ay)} ${n(-ax)} a ${n(R)} ${n(R)} 0 0 1 ${n(ay)} ${n(ax)} ` +
    `c ${n(d)} ${n(c)} ${n(d)} ${n(b + c)} ${n(d)} ${n(e)}`
  );
}

/** Bottom cap: (width, height−p) → (0, height−p). */
function drawBottomCap({ a, b, c, d, e, ax, ay, R }: CapParams) {
  return (
    `c 0 ${n(a)} 0 ${n(a + b)} ${n(-d)} ${n(e)} ` +
    `a ${n(R)} ${n(R)} 0 0 1 ${n(-ay)} ${n(ax)} a ${n(R)} ${n(R)} 0 0 1 ${n(-ay)} ${n(-ax)} ` +
    `c ${n(-d)} ${n(-c)} ${n(-d)} ${n(-(b + c))} ${n(-d)} ${n(-e)}`
  );
}

// ---------------------------------------------------------------------------

const CAP_EPS = 1e-9;
const BAND_EPS = 1e-9;

export function getSquirclePath({
  width,
  height,
  cornerSmoothing,
  cornerRadius = 0,
  topLeftCornerRadius,
  topRightCornerRadius,
  bottomRightCornerRadius,
  bottomLeftCornerRadius,
  preserveSmoothing = true,
}: SquirclePathParams): string {
  if (width <= 0 || height <= 0) return 'M 0 0 Z';

  const tl = topLeftCornerRadius ?? cornerRadius;
  const tr = topRightCornerRadius ?? cornerRadius;
  const br = bottomRightCornerRadius ?? cornerRadius;
  const bl = bottomLeftCornerRadius ?? cornerRadius;

  if (tl <= 0 && tr <= 0 && br <= 0 && bl <= 0) {
    return `M 0 0 H ${n(width)} V ${n(height)} H 0 Z`;
  }

  // Figma's budget rule: proportional share of each edge between the two
  // corners on it (by requested radius), min across the corner's two edges.
  const edgeBudget = (radius: number, adjacent: number, side: number) =>
    radius === 0 ? 0 : (radius / (radius + adjacent)) * side;
  const budgets = {
    topLeft: Math.min(edgeBudget(tl, tr, width), edgeBudget(tl, bl, height)),
    topRight: Math.min(edgeBudget(tr, tl, width), edgeBudget(tr, br, height)),
    bottomRight: Math.min(edgeBudget(br, bl, width), edgeBudget(br, tr, height)),
    bottomLeft: Math.min(edgeBudget(bl, br, width), edgeBudget(bl, tl, height)),
  };
  const radii = {
    topLeft: Math.min(tl, budgets.topLeft),
    topRight: Math.min(tr, budgets.topRight),
    bottomRight: Math.min(br, budgets.bottomRight),
    bottomLeft: Math.min(bl, budgets.bottomLeft),
  };

  // Regime 2: uniform radii inside the blend band.
  if (tl === tr && tr === br && br === bl) {
    const blendR = Math.min(tl, width / 2, height / 2);
    const shortHalf = Math.min(width, height) / 2;
    if (
      blendR > 0 &&
      shortHalf > blendR + BAND_EPS &&
      shortHalf < (1 + cornerSmoothing) * blendR - BAND_EPS
    ) {
      return drawBlendPath(width, height, blendR, cornerSmoothing, preserveSmoothing);
    }
  }

  // Regime 3: capsule ends. Each end is independent, so half-pills work.
  const horizontal = width >= height;
  const capR = horizontal ? height / 2 : width / 2;
  const isCap = (r1: number, r2: number) =>
    Math.abs(r1 - capR) < CAP_EPS && Math.abs(r2 - capR) < CAP_EPS;

  const corner = (radius: number, budget: number) =>
    cornerParams(radius, cornerSmoothing, preserveSmoothing, budget);

  if (horizontal) {
    const rightCap = isCap(radii.topRight, radii.bottomRight);
    const leftCap = isCap(radii.topLeft, radii.bottomLeft);
    if (rightCap || leftCap) {
      const longHalf = width / 2;
      const cR = rightCap ? capsuleEndParams(capR, cornerSmoothing, preserveSmoothing, longHalf) : null;
      const cL = leftCap ? capsuleEndParams(capR, cornerSmoothing, preserveSmoothing, longHalf) : null;
      const oTL = cL ? null : corner(radii.topLeft, budgets.topLeft);
      const oTR = cR ? null : corner(radii.topRight, budgets.topRight);
      const oBR = cR ? null : corner(radii.bottomRight, budgets.bottomRight);
      const oBL = cL ? null : corner(radii.bottomLeft, budgets.bottomLeft);

      let d = `M ${n(cL ? cL.p : oTL!.p)} 0`;
      d += ` L ${n(width - (cR ? cR.p : oTR!.p))} 0`;
      if (cR) {
        d += ` ${drawRightCap(cR)}`;
      } else {
        d += seg(drawTopRight(oTR!));
        d += ` L ${n(width)} ${n(oBR!.p)}`;
        d += ` L ${n(width)} ${n(height - oBR!.p)}`;
        d += seg(drawBottomRight(oBR!));
      }
      if (cL) {
        d += ` L ${n(cL.p)} ${n(height)}`;
        d += ` ${drawLeftCap(cL)}`;
      } else {
        d += ` L ${n(width - oBL!.p)} ${n(height)}`;
        d += ` L ${n(oBL!.p)} ${n(height)}`;
        d += seg(drawBottomLeft(oBL!));
        d += ` L 0 ${n(height - oTL!.p)}`;
        d += ` L 0 ${n(oTL!.p)}`;
        d += seg(drawTopLeft(oTL!));
      }
      return `${d} Z`;
    }
  } else {
    const topCap = isCap(radii.topLeft, radii.topRight);
    const bottomCap = isCap(radii.bottomLeft, radii.bottomRight);
    if (topCap || bottomCap) {
      const longHalf = height / 2;
      const cT = topCap ? capsuleEndParams(capR, cornerSmoothing, preserveSmoothing, longHalf) : null;
      const cB = bottomCap ? capsuleEndParams(capR, cornerSmoothing, preserveSmoothing, longHalf) : null;
      const oTL = cT ? null : corner(radii.topLeft, budgets.topLeft);
      const oTR = cT ? null : corner(radii.topRight, budgets.topRight);
      const oBR = cB ? null : corner(radii.bottomRight, budgets.bottomRight);
      const oBL = cB ? null : corner(radii.bottomLeft, budgets.bottomLeft);

      let d: string;
      if (cT) {
        d = `M 0 ${n(cT.p)} ${drawTopCap(cT)}`;
      } else {
        d = `M ${n(oTL!.p)} 0`;
        d += ` L ${n(width - oTR!.p)} 0`;
        d += seg(drawTopRight(oTR!));
      }
      d += ` L ${n(width)} ${n(height - (cB ? cB.p : oBR!.p))}`;
      if (cB) {
        d += ` ${drawBottomCap(cB)}`;
      } else {
        d += seg(drawBottomRight(oBR!));
        d += ` L ${n(oBL!.p)} ${n(height)}`;
        d += seg(drawBottomLeft(oBL!));
      }
      if (cT) {
        d += ` L 0 ${n(cT.p)}`;
      } else {
        d += ` L 0 ${n(height - oTL!.p)}`;
        d += ` L 0 ${n(oTL!.p)}`;
        d += seg(drawTopLeft(oTL!));
      }
      return `${d} Z`;
    }
  }

  // Regime 1: classic squircle.
  const oTL = corner(radii.topLeft, budgets.topLeft);
  const oTR = corner(radii.topRight, budgets.topRight);
  const oBR = corner(radii.bottomRight, budgets.bottomRight);
  const oBL = corner(radii.bottomLeft, budgets.bottomLeft);

  return (
    `M ${n(oTL.p)} 0` +
    ` L ${n(width - oTR.p)} 0` +
    seg(drawTopRight(oTR)) +
    ` L ${n(width)} ${n(oBR.p)}` +
    ` L ${n(width)} ${n(height - oBR.p)}` +
    seg(drawBottomRight(oBR)) +
    ` L ${n(width - oBL.p)} ${n(height)}` +
    ` L ${n(oBL.p)} ${n(height)}` +
    seg(drawBottomLeft(oBL)) +
    ` L 0 ${n(height - oTL.p)}` +
    ` L 0 ${n(oTL.p)}` +
    seg(drawTopLeft(oTL)) +
    ' Z'
  );
}
