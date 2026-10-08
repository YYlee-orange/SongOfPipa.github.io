export interface ArtPoint {
  x: number;
  y: number;
}

export interface AnchoredArtTransform {
  x: number;
  y: number;
  rotation: number;
  sourceRotation: number;
  scaleAlong: number;
  scaleAcross: number;
  targetLength: number;
  sourceLength: number;
}

/**
 * Maps an arbitrary proximal/distal axis inside a source PNG onto one live
 * bone segment. The source image is first counter-rotated into local +X, then
 * the parent container stretches only along the bone axis.
 */
export function calculateAnchoredArtTransform(
  proximal: Readonly<ArtPoint>,
  distal: Readonly<ArtPoint>,
  targetRoot: Readonly<ArtPoint>,
  targetEnd: Readonly<ArtPoint>,
  referenceLength: number,
): Readonly<AnchoredArtTransform> {
  const sourceDx = distal.x - proximal.x;
  const sourceDy = distal.y - proximal.y;
  const targetDx = targetEnd.x - targetRoot.x;
  const targetDy = targetEnd.y - targetRoot.y;
  const sourceLength = Math.max(0.0001, Math.hypot(sourceDx, sourceDy));
  const targetLength = Math.max(0.0001, Math.hypot(targetDx, targetDy));
  const safeReferenceLength = Number.isFinite(referenceLength)
    ? Math.max(0.0001, referenceLength)
    : targetLength;

  return {
    x: targetRoot.x,
    y: targetRoot.y,
    rotation: Math.atan2(targetDy, targetDx),
    sourceRotation: -Math.atan2(sourceDy, sourceDx),
    scaleAlong: targetLength / sourceLength,
    scaleAcross: safeReferenceLength / sourceLength,
    targetLength,
    sourceLength,
  };
}

export function distanceBetween(
  a: Readonly<ArtPoint>,
  b: Readonly<ArtPoint>,
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Converts a top-to-bottom torso axis into the rotation of upright artwork. */
export function calculateUprightBodyRotation(
  top: Readonly<ArtPoint>,
  bottom: Readonly<ArtPoint>,
): number {
  return Math.atan2(bottom.y - top.y, bottom.x - top.x) - Math.PI / 2;
}
