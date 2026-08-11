/**
 * Figma corner-smoothing path generator.
 *
 * Port of figma-squircle (MIT), with one correction: each corner's
 * rounding-and-smoothing budget is min over its two edges of
 * `radius / (radius + adjacentRadius) * sideLength`, computed from the
 * *requested* radii. This matches Figma's renderer exactly — verified
 * numerically against squircle geometry baked into Figma's own SVG exports
 * (uniform radii, and mixed 60/10 radii where the upstream library deviates).
 */

export type SquirclePathParams = {
  width: number;
  height: number;
  cornerSmoothing: number;
  cornerRadius?: number;
  topLeftCornerRadius?: number;
  topRightCornerRadius?: number;
  bottomRightCornerRadius?: number;
  bottomLeftCornerRadius?: number;
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

function cornerParams(
  requestedRadius: number,
  cornerSmoothing: number,
  budget: number,
): CornerParams {
  const radius = Math.min(requestedRadius, budget);
  if (radius <= 0) {
    return { radius: 0, a: 0, b: 0, c: 0, d: 0, p: 0, arcSectionLength: 0 };
  }
  const smoothing = Math.min(cornerSmoothing, budget / radius - 1);
  const p = Math.min((1 + smoothing) * radius, budget);

  const arcMeasure = 90 * (1 - smoothing);
  const arcSectionLength =
    Math.sin(toRadians(arcMeasure / 2)) * radius * Math.SQRT2;
  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Distance = radius * Math.tan(toRadians(angleAlpha / 2));
  const angleBeta = 45 * smoothing;
  const c = p3ToP4Distance * Math.cos(toRadians(angleBeta));
  const d = c * Math.tan(toRadians(angleBeta));
  const b = (p - arcSectionLength - c - d) / 3;
  const a = 2 * b;
  return { radius, a, b, c, d, p, arcSectionLength };
}

const n = (value: number) => Number(value.toFixed(4));

function drawTopRight({ radius, a, b, c, d, p, arcSectionLength }: CornerParams) {
  if (!radius) return `l ${n(p)} 0`;
  return (
    `c ${n(a)} 0 ${n(a + b)} 0 ${n(a + b + c)} ${n(d)} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(arcSectionLength)} ${n(arcSectionLength)} ` +
    `c ${n(d)} ${n(c)} ${n(d)} ${n(b + c)} ${n(d)} ${n(a + b + c)}`
  );
}

function drawBottomRight({ radius, a, b, c, d, p, arcSectionLength }: CornerParams) {
  if (!radius) return `l 0 ${n(p)}`;
  return (
    `c 0 ${n(a)} 0 ${n(a + b)} ${n(-d)} ${n(a + b + c)} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(-arcSectionLength)} ${n(arcSectionLength)} ` +
    `c ${n(-c)} ${n(d)} ${n(-(b + c))} ${n(d)} ${n(-(a + b + c))} ${n(d)}`
  );
}

function drawBottomLeft({ radius, a, b, c, d, p, arcSectionLength }: CornerParams) {
  if (!radius) return `l ${n(-p)} 0`;
  return (
    `c ${n(-a)} 0 ${n(-(a + b))} 0 ${n(-(a + b + c))} ${n(-d)} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(-arcSectionLength)} ${n(-arcSectionLength)} ` +
    `c ${n(-d)} ${n(-c)} ${n(-d)} ${n(-(b + c))} ${n(-d)} ${n(-(a + b + c))}`
  );
}

function drawTopLeft({ radius, a, b, c, d, p, arcSectionLength }: CornerParams) {
  if (!radius) return `l 0 ${n(-p)}`;
  return (
    `c 0 ${n(-a)} 0 ${n(-(a + b))} ${n(d)} ${n(-(a + b + c))} ` +
    `a ${n(radius)} ${n(radius)} 0 0 1 ${n(arcSectionLength)} ${n(-arcSectionLength)} ` +
    `c ${n(c)} ${n(-d)} ${n(b + c)} ${n(-d)} ${n(a + b + c)} ${n(-d)}`
  );
}

export function getSquirclePath({
  width,
  height,
  cornerSmoothing,
  cornerRadius = 0,
  topLeftCornerRadius,
  topRightCornerRadius,
  bottomRightCornerRadius,
  bottomLeftCornerRadius,
}: SquirclePathParams): string {
  const tl = topLeftCornerRadius ?? cornerRadius;
  const tr = topRightCornerRadius ?? cornerRadius;
  const br = bottomRightCornerRadius ?? cornerRadius;
  const bl = bottomLeftCornerRadius ?? cornerRadius;

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

  const topLeft = cornerParams(tl, cornerSmoothing, budgets.topLeft);
  const topRight = cornerParams(tr, cornerSmoothing, budgets.topRight);
  const bottomRight = cornerParams(br, cornerSmoothing, budgets.bottomRight);
  const bottomLeft = cornerParams(bl, cornerSmoothing, budgets.bottomLeft);

  return (
    `M ${n(width - topRight.p)} 0 ` +
    `${drawTopRight(topRight)} ` +
    `L ${n(width)} ${n(height - bottomRight.p)} ` +
    `${drawBottomRight(bottomRight)} ` +
    `L ${n(bottomLeft.p)} ${n(height)} ` +
    `${drawBottomLeft(bottomLeft)} ` +
    `L 0 ${n(topLeft.p)} ` +
    `${drawTopLeft(topLeft)} ` +
    `Z`
  );
}
