import type { Vec2 } from "../playerRig/PlayerRigModel";

export interface PlayerMovementBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PlayerMovementConfig {
  bounds: PlayerMovementBounds;
  maximumSpeed: number;
  acceleration: number;
  deceleration: number;
}

export interface PlayerMovementInput {
  x: number;
  y: number;
}

export interface PlayerMovementSnapshot {
  position: Vec2;
  velocity: Vec2;
  inputDirection: Vec2;
  moving: boolean;
}

const EPSILON = 0.0001;

export class PlayerMovementModel {
  private readonly config: PlayerMovementConfig;
  private position: Vec2;
  private velocity: Vec2 = { x: 0, y: 0 };
  private inputDirection: Vec2 = { x: 0, y: 0 };

  constructor(config: PlayerMovementConfig, initialPosition: Vec2) {
    this.config = config;
    this.position = this.clampToBounds(initialPosition);
  }

  update(input: PlayerMovementInput, deltaSeconds: number): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? clamp(deltaSeconds, 0, 1 / 15)
      : 0;
    this.inputDirection = normalizeInput(input);
    const moving = magnitude(this.inputDirection) > EPSILON;
    const targetVelocity = scale(this.inputDirection, this.config.maximumSpeed);
    const rate = moving ? this.config.acceleration : this.config.deceleration;

    this.velocity = moveToward(this.velocity, targetVelocity, rate * safeDelta);
    const requestedPosition = add(this.position, scale(this.velocity, safeDelta));
    const nextPosition = this.clampToBounds(requestedPosition);

    if (
      (nextPosition.x <= this.config.bounds.minX && this.velocity.x < 0) ||
      (nextPosition.x >= this.config.bounds.maxX && this.velocity.x > 0)
    ) {
      this.velocity.x = 0;
    }

    if (
      (nextPosition.y <= this.config.bounds.minY && this.velocity.y < 0) ||
      (nextPosition.y >= this.config.bounds.maxY && this.velocity.y > 0)
    ) {
      this.velocity.y = 0;
    }

    this.position = nextPosition;
  }

  getSnapshot(): Readonly<PlayerMovementSnapshot> {
    return {
      position: clone(this.position),
      velocity: clone(this.velocity),
      inputDirection: clone(this.inputDirection),
      moving: magnitude(this.velocity) > EPSILON,
    };
  }

  getPosition(): Vec2 {
    return clone(this.position);
  }

  private clampToBounds(position: Vec2): Vec2 {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      return {
        x: (this.config.bounds.minX + this.config.bounds.maxX) / 2,
        y: (this.config.bounds.minY + this.config.bounds.maxY) / 2,
      };
    }

    return {
      x: clamp(position.x, this.config.bounds.minX, this.config.bounds.maxX),
      y: clamp(position.y, this.config.bounds.minY, this.config.bounds.maxY),
    };
  }
}

function normalizeInput(input: PlayerMovementInput): Vec2 {
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
    return { x: 0, y: 0 };
  }

  const length = Math.hypot(input.x, input.y);

  if (length < EPSILON) {
    return { x: 0, y: 0 };
  }

  const divisor = Math.max(1, length);
  return { x: input.x / divisor, y: input.y / divisor };
}

function moveToward(current: Vec2, target: Vec2, maximumDelta: number): Vec2 {
  const difference = { x: target.x - current.x, y: target.y - current.y };
  const differenceLength = magnitude(difference);

  if (differenceLength <= maximumDelta || differenceLength < EPSILON) {
    return clone(target);
  }

  return add(current, scale(difference, maximumDelta / differenceLength));
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(vector: Vec2, scalar: number): Vec2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

function magnitude(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

function clone(vector: Vec2): Vec2 {
  return { x: vector.x, y: vector.y };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
