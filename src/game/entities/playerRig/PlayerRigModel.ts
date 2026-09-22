export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerRigConfig {
  initialPelvis: Vec2;
  pelvisSize: { width: number; height: number };
  headCenterOffset: Vec2;
  headWanderRadius: Vec2;
  headWanderFrequency: Vec2;
  headBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  headFollowRate: number;
  torsoMaximumLength: number;
  torsoReferenceLength: number;
  torsoTopWidth: number;
  torsoBottomWidth: number;
  torsoNeckInset: number;
  torsoPelvisInset: number;
  upperArmLength: number;
  lowerArmLength: number;
  upperLegLength: number;
  lowerLegLength: number;
  leftFootOffset: { side: number; down: number };
  rightFootOffset: { side: number; down: number };
  legKneeBend: number;
}

export interface TwoBoneChain {
  root: Vec2;
  joint: Vec2;
  end: Vec2;
}

export interface TorsoShape {
  topLeft: Vec2;
  topRight: Vec2;
  bottomRight: Vec2;
  bottomLeft: Vec2;
  topCenter: Vec2;
  bottomCenter: Vec2;
  angle: number;
  length: number;
  widthScale: number;
}

export interface PlayerRigPose {
  pelvis: Vec2;
  head: Vec2;
  torso: TorsoShape;
  leftArm: TwoBoneChain;
  rightArm: TwoBoneChain;
  leftLeg: TwoBoneChain;
  rightLeg: TwoBoneChain;
}

export interface PlayerRigMetrics {
  headDistance: number;
  maximumHeadDistance: number;
  stretchRatio: number;
  finite: boolean;
  manualTargetActive: boolean;
  leftFootDrift: number;
  rightFootDrift: number;
  leftLegStretch: number;
  rightLegStretch: number;
}

export interface FootAnchors {
  left: Vec2;
  right: Vec2;
}

const EPSILON = 0.0001;

export class PlayerRigModel {
  private readonly config: PlayerRigConfig;
  private readonly headAnchorCenter: Vec2;
  private readonly footAnchors: FootAnchors;
  private pelvis: Vec2;
  private head: Vec2;
  private elapsedSeconds = 0;
  private manualHeadTarget: Vec2 | null = null;
  private pose: PlayerRigPose;

  constructor(config: PlayerRigConfig) {
    this.config = config;
    this.pelvis = clone(config.initialPelvis);
    this.headAnchorCenter = add(config.initialPelvis, config.headCenterOffset);
    this.head = this.clampHeadTarget(this.headAnchorCenter);
    const initialUp = normalize(subtract(this.head, this.pelvis), { x: 0, y: -1 });
    const initialSide = perpendicular(initialUp);
    const initialDown = scale(initialUp, -1);
    this.footAnchors = {
      left: add(
        this.pelvis,
        add(
          scale(initialSide, config.leftFootOffset.side),
          scale(initialDown, config.leftFootOffset.down),
        ),
      ),
      right: add(
        this.pelvis,
        add(
          scale(initialSide, config.rightFootOffset.side),
          scale(initialDown, config.rightFootOffset.down),
        ),
      ),
    };
    this.pose = this.buildPose();
  }

  update(deltaSeconds: number): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? clamp(deltaSeconds, 0, 1 / 15)
      : 0;

    this.elapsedSeconds += safeDelta;

    const desiredHead = this.manualHeadTarget
      ? this.clampHeadTarget(this.manualHeadTarget)
      : this.getAutomaticHeadTarget();

    const follow = 1 - Math.exp(-this.config.headFollowRate * safeDelta);
    this.head = this.clampHeadTarget(lerp(this.head, desiredHead, follow));
    this.pose = this.buildPose();
  }

  setPelvisAnchor(anchor: Vec2): void {
    if (!isFiniteVec(anchor)) {
      return;
    }

    this.pelvis = clone(anchor);
    this.head = this.clampHeadTarget(this.head);
    this.pose = this.buildPose();
  }

  setManualHeadTarget(target: Vec2 | null): void {
    this.manualHeadTarget = target && isFiniteVec(target) ? clone(target) : null;
  }

  getPose(): Readonly<PlayerRigPose> {
    return this.pose;
  }

  getManualHeadTarget(): Vec2 | null {
    return this.manualHeadTarget ? clone(this.manualHeadTarget) : null;
  }

  getAutomaticTargetPreview(): Vec2 {
    return this.getAutomaticHeadTarget();
  }

  getHeadBounds(): PlayerRigConfig["headBounds"] {
    return { ...this.config.headBounds };
  }

  getFootAnchors(): FootAnchors {
    return {
      left: clone(this.footAnchors.left),
      right: clone(this.footAnchors.right),
    };
  }

  getPelvisSize(): PlayerRigConfig["pelvisSize"] {
    return { ...this.config.pelvisSize };
  }

  getMetrics(): PlayerRigMetrics {
    const maximumHeadDistance = this.config.torsoMaximumLength;
    const headDistance = distance(this.pose.pelvis, this.pose.head);
    const points = [
      this.pose.pelvis,
      this.pose.head,
      ...torsoPoints(this.pose.torso),
      ...chainPoints(this.pose.leftArm),
      ...chainPoints(this.pose.rightArm),
      ...chainPoints(this.pose.leftLeg),
      ...chainPoints(this.pose.rightLeg),
    ];

    return {
      headDistance,
      maximumHeadDistance,
      stretchRatio: headDistance / maximumHeadDistance,
      finite:
        points.every(isFiniteVec) &&
        Number.isFinite(this.pose.torso.angle) &&
        Number.isFinite(this.pose.torso.length) &&
        Number.isFinite(this.pose.torso.widthScale),
      manualTargetActive: this.manualHeadTarget !== null,
      leftFootDrift: distance(this.pose.leftLeg.end, this.footAnchors.left),
      rightFootDrift: distance(this.pose.rightLeg.end, this.footAnchors.right),
      leftLegStretch: chainLengthRatio(
        this.pose.leftLeg,
        this.config.upperLegLength,
        this.config.lowerLegLength,
      ),
      rightLegStretch: chainLengthRatio(
        this.pose.rightLeg,
        this.config.upperLegLength,
        this.config.lowerLegLength,
      ),
    };
  }

  private getAutomaticHeadTarget(): Vec2 {
    const x =
      this.headAnchorCenter.x +
      Math.sin(this.elapsedSeconds * Math.PI * 2 * this.config.headWanderFrequency.x) *
        this.config.headWanderRadius.x;
    const y =
      this.headAnchorCenter.y +
      Math.sin(
        this.elapsedSeconds * Math.PI * 2 * this.config.headWanderFrequency.y +
          Math.PI * 0.37,
      ) * this.config.headWanderRadius.y;

    return this.clampHeadTarget({ x, y });
  }

  private clampHeadTarget(target: Vec2): Vec2 {
    const bounds = this.config.headBounds;
    const boundedTarget = {
      x: clamp(target.x, bounds.minX, bounds.maxX),
      y: clamp(target.y, bounds.minY, bounds.maxY),
    };

    const maximumDistance = this.config.torsoMaximumLength - 0.5;
    const pelvisToTarget = subtract(boundedTarget, this.pelvis);
    const targetDistance = magnitude(pelvisToTarget);

    if (targetDistance > maximumDistance) {
      return add(
        this.pelvis,
        scale(pelvisToTarget, maximumDistance / targetDistance),
      );
    }

    return boundedTarget;
  }

  private buildPose(): PlayerRigPose {
    const pelvis = clone(this.pelvis);
    const head = clone(this.head);
    const up = normalize(subtract(head, pelvis), { x: 0, y: -1 });
    const side = perpendicular(up);
    const down = scale(up, -1);
    const headDistance = distance(head, pelvis);
    const widthScale = clamp(
      headDistance / this.config.torsoReferenceLength,
      0.82,
      1.18,
    );
    const topCenter = add(head, scale(up, -this.config.torsoNeckInset));
    const bottomCenter = add(pelvis, scale(up, this.config.torsoPelvisInset));
    const topHalfWidth = (this.config.torsoTopWidth * widthScale) / 2;
    const bottomHalfWidth = (this.config.torsoBottomWidth * widthScale) / 2;
    const torso: TorsoShape = {
      topLeft: add(topCenter, scale(side, -topHalfWidth)),
      topRight: add(topCenter, scale(side, topHalfWidth)),
      bottomRight: add(bottomCenter, scale(side, bottomHalfWidth)),
      bottomLeft: add(bottomCenter, scale(side, -bottomHalfWidth)),
      topCenter,
      bottomCenter,
      angle: Math.atan2(up.y, up.x) + Math.PI / 2,
      length: distance(topCenter, bottomCenter),
      widthScale,
    };
    const shoulderCenter = topCenter;
    const leftShoulder = clone(torso.topLeft);
    const rightShoulder = clone(torso.topRight);
    const leftHandTarget = add(
      shoulderCenter,
      add(scale(side, -155), scale(down, 58)),
    );
    const rightHandTarget = add(
      shoulderCenter,
      add(scale(side, 165), scale(down, 12)),
    );
    const leftHip = add(pelvis, scale(side, -24));
    const rightHip = add(pelvis, scale(side, 24));

    return {
      pelvis,
      head,
      torso,
      leftArm: solveTwoBoneIk(
        leftShoulder,
        leftHandTarget,
        this.config.upperArmLength,
        this.config.lowerArmLength,
        -1,
      ),
      rightArm: solveTwoBoneIk(
        rightShoulder,
        rightHandTarget,
        this.config.upperArmLength,
        this.config.lowerArmLength,
        1,
      ),
      leftLeg: solveAnchoredElasticChain(
        leftHip,
        this.footAnchors.left,
        this.config.upperLegLength,
        this.config.lowerLegLength,
        this.config.legKneeBend,
        -1,
      ),
      rightLeg: solveAnchoredElasticChain(
        rightHip,
        this.footAnchors.right,
        this.config.upperLegLength,
        this.config.lowerLegLength,
        this.config.legKneeBend,
        1,
      ),
    };
  }
}

function solveTwoBoneIk(
  root: Vec2,
  requestedEnd: Vec2,
  firstLength: number,
  secondLength: number,
  bendDirection: -1 | 1,
): TwoBoneChain {
  const rootToEnd = subtract(requestedEnd, root);
  const rawDistance = magnitude(rootToEnd);
  const direction = normalize(rootToEnd, { x: 1, y: 0 });
  const minimumDistance = Math.abs(firstLength - secondLength) + 0.01;
  const maximumDistance = firstLength + secondLength - 0.01;
  const clampedDistance = clamp(rawDistance, minimumDistance, maximumDistance);
  const end = add(root, scale(direction, clampedDistance));
  const along =
    (firstLength * firstLength - secondLength * secondLength + clampedDistance * clampedDistance) /
    (2 * clampedDistance);
  const perpendicularDistance = Math.sqrt(
    Math.max(0, firstLength * firstLength - along * along),
  );
  const joint = add(
    add(root, scale(direction, along)),
    scale(perpendicular(direction), perpendicularDistance * bendDirection),
  );

  return { root: clone(root), joint, end };
}

function solveAnchoredElasticChain(
  root: Vec2,
  fixedEnd: Vec2,
  firstReferenceLength: number,
  secondReferenceLength: number,
  kneeBend: number,
  bendDirection: -1 | 1,
): TwoBoneChain {
  const rootToEnd = subtract(fixedEnd, root);
  const direction = normalize(rootToEnd, { x: 0, y: 1 });
  const referenceLength = firstReferenceLength + secondReferenceLength;
  const distanceRatio = magnitude(rootToEnd) / referenceLength;
  const jointRatio = firstReferenceLength / referenceLength;
  const bendScale = clamp(1.35 - distanceRatio * 0.45, 0.28, 1.15);
  const joint = add(
    lerp(root, fixedEnd, jointRatio),
    scale(perpendicular(direction), kneeBend * bendScale * bendDirection),
  );

  return {
    root: clone(root),
    joint,
    end: clone(fixedEnd),
  };
}

function chainPoints(chain: TwoBoneChain): Vec2[] {
  return [chain.root, chain.joint, chain.end];
}

function chainLengthRatio(
  chain: TwoBoneChain,
  firstReferenceLength: number,
  secondReferenceLength: number,
): number {
  const actualLength =
    distance(chain.root, chain.joint) + distance(chain.joint, chain.end);
  return actualLength / (firstReferenceLength + secondReferenceLength);
}

function torsoPoints(torso: TorsoShape): Vec2[] {
  return [
    torso.topLeft,
    torso.topRight,
    torso.bottomRight,
    torso.bottomLeft,
    torso.topCenter,
    torso.bottomCenter,
  ];
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(vector: Vec2, scalar: number): Vec2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function magnitude(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

function distance(a: Vec2, b: Vec2): number {
  return magnitude(subtract(a, b));
}

function normalize(vector: Vec2, fallback: Vec2): Vec2 {
  const length = magnitude(vector);

  if (length < EPSILON || !Number.isFinite(length)) {
    return clone(fallback);
  }

  return scale(vector, 1 / length);
}

function perpendicular(vector: Vec2): Vec2 {
  return { x: -vector.y, y: vector.x };
}

function clone(vector: Vec2): Vec2 {
  return { x: vector.x, y: vector.y };
}

function isFiniteVec(vector: Vec2): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
