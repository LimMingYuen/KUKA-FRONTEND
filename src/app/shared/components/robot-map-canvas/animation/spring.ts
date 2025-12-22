/**
 * Spring Physics - Natural feeling animations using spring dynamics
 *
 * Based on the damped harmonic oscillator equation:
 * F = -kx - cv
 * where k = stiffness, c = damping, x = displacement, v = velocity
 */

import { SpringConfig } from '../core/canvas-types';
import { SPRING_REST_THRESHOLD } from '../core/constants';

export interface SpringState {
  value: number;
  velocity: number;
}

export interface SpringResult {
  value: number;
  velocity: number;
  isAtRest: boolean;
}

/**
 * Update a spring simulation for one time step
 *
 * @param current Current value
 * @param target Target value
 * @param velocity Current velocity
 * @param config Spring configuration
 * @param deltaTime Time step in seconds
 * @returns Updated state and whether spring is at rest
 */
export function updateSpring(
  current: number,
  target: number,
  velocity: number,
  config: SpringConfig,
  deltaTime: number
): SpringResult {
  const { stiffness, damping, mass } = config;

  // Calculate spring force: F = -k(x - target)
  const displacement = current - target;
  const springForce = -stiffness * displacement;

  // Calculate damping force: F = -c * v
  const dampingForce = -damping * velocity;

  // Total force and acceleration: F = ma, so a = F/m
  const acceleration = (springForce + dampingForce) / mass;

  // Update velocity and position using semi-implicit Euler integration
  const newVelocity = velocity + acceleration * deltaTime;
  const newValue = current + newVelocity * deltaTime;

  // Check if spring is at rest (close enough to target with low velocity)
  const isAtRest =
    Math.abs(displacement) < SPRING_REST_THRESHOLD &&
    Math.abs(newVelocity) < SPRING_REST_THRESHOLD;

  // If at rest, snap to target
  if (isAtRest) {
    return {
      value: target,
      velocity: 0,
      isAtRest: true
    };
  }

  return {
    value: newValue,
    velocity: newVelocity,
    isAtRest: false
  };
}

/**
 * Update a 2D spring (x and y components)
 */
export function updateSpring2D(
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
  velocityX: number,
  velocityY: number,
  config: SpringConfig,
  deltaTime: number
): { x: SpringResult; y: SpringResult } {
  return {
    x: updateSpring(currentX, targetX, velocityX, config, deltaTime),
    y: updateSpring(currentY, targetY, velocityY, config, deltaTime)
  };
}

/**
 * Calculate the critical damping coefficient for a given stiffness and mass
 * Critical damping = 2 * sqrt(k * m)
 */
export function criticalDamping(stiffness: number, mass: number): number {
  return 2 * Math.sqrt(stiffness * mass);
}

/**
 * Create a spring config with a specific damping ratio
 * ratio < 1: underdamped (bouncy)
 * ratio = 1: critically damped (no bounce, fastest settle)
 * ratio > 1: overdamped (slow settle, no bounce)
 */
export function createSpringConfig(
  stiffness: number,
  dampingRatio: number,
  mass: number = 1
): SpringConfig {
  const criticalDamp = criticalDamping(stiffness, mass);
  return {
    stiffness,
    damping: criticalDamp * dampingRatio,
    mass
  };
}

/**
 * Estimate time to reach target for a spring (approximate)
 * Useful for knowing when animation will complete
 */
export function estimateSpringDuration(config: SpringConfig): number {
  // Rough estimate based on settling time for underdamped system
  // T ≈ 4 / (damping / mass)
  const tau = config.mass / config.damping;
  return tau * 4; // Time to settle to ~2% of initial displacement
}

/**
 * Interpolate between two values using a spring-like ease
 * This is a simplified version that doesn't track velocity
 * Useful for one-shot animations
 */
export function springInterpolate(
  t: number, // 0 to 1
  overshoot: number = 0.3
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Use a damped sine wave to create spring-like bounce
  const omega = Math.PI * 2;
  const decay = -5 * t;
  return 1 - Math.exp(decay) * Math.cos(omega * t) * (1 + overshoot);
}

/**
 * Easing functions for non-spring animations
 */
export const Easing = {
  linear: (t: number) => t,

  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  }
};
