/**
 * Animated Value - Wrapper for values that animate with spring physics
 */

import { SpringConfig, AnimatedValue, AnimatedVec2, Vec2 } from '../core/canvas-types';
import { SPRING_DEFAULT } from '../core/constants';
import { updateSpring, updateSpring2D } from './spring';

/**
 * Creates a new AnimatedValue with initial value
 */
export function createAnimatedValue(initial: number): AnimatedValue {
  return {
    current: initial,
    target: initial,
    velocity: 0
  };
}

/**
 * Creates a new AnimatedVec2 with initial values
 */
export function createAnimatedVec2(x: number, y: number): AnimatedVec2 {
  return {
    x: createAnimatedValue(x),
    y: createAnimatedValue(y)
  };
}

/**
 * Set the target value for an animated value
 */
export function setTarget(av: AnimatedValue, target: number): void {
  av.target = target;
}

/**
 * Set target for AnimatedVec2
 */
export function setTargetVec2(av: AnimatedVec2, x: number, y: number): void {
  av.x.target = x;
  av.y.target = y;
}

/**
 * Instantly set both current and target (no animation)
 */
export function setImmediate(av: AnimatedValue, value: number): void {
  av.current = value;
  av.target = value;
  av.velocity = 0;
}

/**
 * Instantly set both current and target for Vec2
 */
export function setImmediateVec2(av: AnimatedVec2, x: number, y: number): void {
  setImmediate(av.x, x);
  setImmediate(av.y, y);
}

/**
 * Update an animated value using spring physics
 * Returns true if the value is still animating
 */
export function updateAnimatedValue(
  av: AnimatedValue,
  deltaTime: number,
  config: SpringConfig = SPRING_DEFAULT
): boolean {
  const result = updateSpring(av.current, av.target, av.velocity, config, deltaTime);
  av.current = result.value;
  av.velocity = result.velocity;
  return !result.isAtRest;
}

/**
 * Update an AnimatedVec2 using spring physics
 * Returns true if either component is still animating
 */
export function updateAnimatedVec2(
  av: AnimatedVec2,
  deltaTime: number,
  config: SpringConfig = SPRING_DEFAULT
): boolean {
  const xAnimating = updateAnimatedValue(av.x, deltaTime, config);
  const yAnimating = updateAnimatedValue(av.y, deltaTime, config);
  return xAnimating || yAnimating;
}

/**
 * Check if an animated value has reached its target
 */
export function isAtRest(av: AnimatedValue): boolean {
  return av.current === av.target && av.velocity === 0;
}

/**
 * Check if an AnimatedVec2 has reached its target
 */
export function isAtRestVec2(av: AnimatedVec2): boolean {
  return isAtRest(av.x) && isAtRest(av.y);
}

/**
 * Get the current Vec2 value from AnimatedVec2
 */
export function getCurrentVec2(av: AnimatedVec2): Vec2 {
  return {
    x: av.x.current,
    y: av.y.current
  };
}

/**
 * Get the target Vec2 value from AnimatedVec2
 */
export function getTargetVec2(av: AnimatedVec2): Vec2 {
  return {
    x: av.x.target,
    y: av.y.target
  };
}

/**
 * Class wrapper for AnimatedValue with fluent API
 */
export class SpringValue {
  private value: AnimatedValue;
  private springConfig: SpringConfig;

  constructor(initial: number, config: SpringConfig = SPRING_DEFAULT) {
    this.value = createAnimatedValue(initial);
    this.springConfig = config;
  }

  get current(): number {
    return this.value.current;
  }

  get target(): number {
    return this.value.target;
  }

  get velocity(): number {
    return this.value.velocity;
  }

  get isAnimating(): boolean {
    return !isAtRest(this.value);
  }

  setTarget(target: number): this {
    this.value.target = target;
    return this;
  }

  setImmediate(value: number): this {
    setImmediate(this.value, value);
    return this;
  }

  setConfig(config: SpringConfig): this {
    this.springConfig = config;
    return this;
  }

  update(deltaTime: number): boolean {
    return updateAnimatedValue(this.value, deltaTime, this.springConfig);
  }
}

/**
 * Class wrapper for AnimatedVec2 with fluent API
 */
export class SpringVec2 {
  private value: AnimatedVec2;
  private springConfig: SpringConfig;

  constructor(x: number, y: number, config: SpringConfig = SPRING_DEFAULT) {
    this.value = createAnimatedVec2(x, y);
    this.springConfig = config;
  }

  get x(): number {
    return this.value.x.current;
  }

  get y(): number {
    return this.value.y.current;
  }

  get targetX(): number {
    return this.value.x.target;
  }

  get targetY(): number {
    return this.value.y.target;
  }

  get isAnimating(): boolean {
    return !isAtRestVec2(this.value);
  }

  get current(): Vec2 {
    return getCurrentVec2(this.value);
  }

  get targetVec(): Vec2 {
    return getTargetVec2(this.value);
  }

  setTarget(x: number, y: number): this {
    setTargetVec2(this.value, x, y);
    return this;
  }

  setImmediate(x: number, y: number): this {
    setImmediateVec2(this.value, x, y);
    return this;
  }

  setConfig(config: SpringConfig): this {
    this.springConfig = config;
    return this;
  }

  update(deltaTime: number): boolean {
    return updateAnimatedVec2(this.value, deltaTime, this.springConfig);
  }

  /** Translate target by delta */
  translateTarget(dx: number, dy: number): this {
    this.value.x.target += dx;
    this.value.y.target += dy;
    return this;
  }

  /** Translate both current and target by delta (no animation) */
  translate(dx: number, dy: number): this {
    this.value.x.current += dx;
    this.value.x.target += dx;
    this.value.y.current += dy;
    this.value.y.target += dy;
    return this;
  }
}
