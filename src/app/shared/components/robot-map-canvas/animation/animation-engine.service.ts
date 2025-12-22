/**
 * Animation Engine Service - Manages all active animations
 */

import { Injectable, signal, computed } from '@angular/core';
import { ElementAnimationState, SpringConfig, Vec2 } from '../core/canvas-types';
import {
  SPRING_DEFAULT,
  SPRING_SNAPPY,
  SPRING_BOUNCY,
  HOVER_SCALE,
  SELECTED_SCALE,
  HOVER_GLOW_INTENSITY,
  SELECTED_GLOW_INTENSITY
} from '../core/constants';
import {
  createAnimatedValue,
  createAnimatedVec2,
  updateAnimatedValue,
  updateAnimatedVec2,
  setTarget,
  setImmediate,
  setImmediateVec2,
  isAtRest,
  isAtRestVec2
} from './animated-value';

export type AnimationId = string;

interface ManagedAnimation {
  id: AnimationId;
  state: ElementAnimationState;
  isActive: boolean;
  onComplete?: () => void;
}

@Injectable()
export class AnimationEngineService {
  private animations = new Map<AnimationId, ManagedAnimation>();
  private elementStates = new Map<string, ElementAnimationState>();

  /** Signal indicating if any animation is running */
  public readonly hasActiveAnimations = signal(false);

  /** Number of active animations */
  public readonly activeCount = computed(() =>
    Array.from(this.animations.values()).filter(a => a.isActive).length
  );

  /**
   * Create initial animation state for an element
   */
  createElementState(): ElementAnimationState {
    return {
      scale: createAnimatedValue(1),
      opacity: createAnimatedValue(1),
      glow: createAnimatedValue(0),
      positionOffset: createAnimatedVec2(0, 0)
    };
  }

  /**
   * Get or create animation state for an element
   */
  getElementState(elementId: string): ElementAnimationState {
    let state = this.elementStates.get(elementId);
    if (!state) {
      state = this.createElementState();
      this.elementStates.set(elementId, state);
    }
    return state;
  }

  /**
   * Remove animation state for an element
   */
  removeElementState(elementId: string): void {
    this.elementStates.delete(elementId);
    this.animations.delete(elementId);
  }

  /**
   * Set element to hover state
   */
  setHovered(elementId: string, isHovered: boolean): void {
    const state = this.getElementState(elementId);
    setTarget(state.scale, isHovered ? HOVER_SCALE : 1);
    setTarget(state.glow, isHovered ? HOVER_GLOW_INTENSITY : 0);
    this.markActive(elementId);
  }

  /**
   * Set element to selected state
   */
  setSelected(elementId: string, isSelected: boolean): void {
    const state = this.getElementState(elementId);
    setTarget(state.scale, isSelected ? SELECTED_SCALE : 1);
    setTarget(state.glow, isSelected ? SELECTED_GLOW_INTENSITY : 0);
    this.markActive(elementId);
  }

  /**
   * Animate element appearing (pop in effect)
   */
  animateAppear(elementId: string, onComplete?: () => void): void {
    const state = this.getElementState(elementId);
    // Start from small and transparent
    setImmediate(state.scale, 0.5);
    setImmediate(state.opacity, 0);
    // Animate to full size
    setTarget(state.scale, 1);
    setTarget(state.opacity, 1);
    this.registerAnimation(elementId, state, SPRING_BOUNCY, onComplete);
  }

  /**
   * Animate element disappearing (shrink and fade)
   */
  animateDisappear(elementId: string, onComplete?: () => void): void {
    const state = this.getElementState(elementId);
    // Animate to small and transparent
    setTarget(state.scale, 0);
    setTarget(state.opacity, 0);
    this.registerAnimation(elementId, state, SPRING_SNAPPY, onComplete);
  }

  /**
   * Animate position offset (for drag lag effect)
   */
  setPositionOffset(elementId: string, offsetX: number, offsetY: number): void {
    const state = this.getElementState(elementId);
    state.positionOffset.x.target = offsetX;
    state.positionOffset.y.target = offsetY;
    this.markActive(elementId);
  }

  /**
   * Clear position offset (spring back to original position)
   */
  clearPositionOffset(elementId: string): void {
    const state = this.getElementState(elementId);
    state.positionOffset.x.target = 0;
    state.positionOffset.y.target = 0;
    this.markActive(elementId);
  }

  /**
   * Set position offset immediately (no animation)
   */
  setPositionOffsetImmediate(elementId: string, offsetX: number, offsetY: number): void {
    const state = this.getElementState(elementId);
    setImmediateVec2(state.positionOffset, offsetX, offsetY);
  }

  /**
   * Flash element (highlight briefly)
   */
  flashElement(elementId: string): void {
    const state = this.getElementState(elementId);
    // Quick pulse
    setImmediate(state.glow, 1);
    setTarget(state.glow, 0);
    this.markActive(elementId);
  }

  /**
   * Trigger status change animation for robots
   * Creates a pulse effect when status changes (especially for abnormal/warning)
   */
  triggerStatusChange(elementId: string, newStatus: number): void {
    const state = this.getElementState(elementId);

    // More intense pulse for abnormal (7) or warning states
    const isWarning = newStatus === 7 || newStatus === 2; // Abnormal or Offline
    const pulseIntensity = isWarning ? 1.3 : 1.15;

    // Quick scale pulse
    setImmediate(state.scale, pulseIntensity);
    setTarget(state.scale, 1);

    // Glow flash
    setImmediate(state.glow, isWarning ? 1 : 0.6);
    setTarget(state.glow, 0);

    this.markActive(elementId);
  }

  /**
   * Update all animations for one frame
   * @param deltaTime Time since last frame in seconds
   * @returns true if any animations are still running
   */
  update(deltaTime: number): boolean {
    let anyActive = false;

    for (const [id, animation] of this.animations) {
      if (!animation.isActive) continue;

      const state = animation.state;
      const springConfig = SPRING_SNAPPY;

      // Update all animated values
      const scaleActive = updateAnimatedValue(state.scale, deltaTime, springConfig);
      const opacityActive = updateAnimatedValue(state.opacity, deltaTime, SPRING_DEFAULT);
      const glowActive = updateAnimatedValue(state.glow, deltaTime, springConfig);
      const offsetActive = updateAnimatedVec2(state.positionOffset, deltaTime, SPRING_DEFAULT);

      const stillActive = scaleActive || opacityActive || glowActive || offsetActive;

      if (!stillActive) {
        animation.isActive = false;
        if (animation.onComplete) {
          animation.onComplete();
        }
      } else {
        anyActive = true;
      }
    }

    // Also update element states that aren't in managed animations
    for (const [id, state] of this.elementStates) {
      if (this.animations.has(id)) continue;

      const scaleActive = !isAtRest(state.scale);
      const glowActive = !isAtRest(state.glow);

      if (scaleActive || glowActive) {
        updateAnimatedValue(state.scale, deltaTime, SPRING_SNAPPY);
        updateAnimatedValue(state.glow, deltaTime, SPRING_SNAPPY);
        anyActive = true;
      }
    }

    this.hasActiveAnimations.set(anyActive);
    return anyActive;
  }

  /**
   * Check if a specific element is animating
   */
  isAnimating(elementId: string): boolean {
    const state = this.elementStates.get(elementId);
    if (!state) return false;

    return (
      !isAtRest(state.scale) ||
      !isAtRest(state.opacity) ||
      !isAtRest(state.glow) ||
      !isAtRestVec2(state.positionOffset)
    );
  }

  /**
   * Get current animated values for rendering
   */
  getRenderValues(elementId: string): {
    scale: number;
    opacity: number;
    glow: number;
    offsetX: number;
    offsetY: number;
  } {
    const state = this.elementStates.get(elementId);
    if (!state) {
      return { scale: 1, opacity: 1, glow: 0, offsetX: 0, offsetY: 0 };
    }

    return {
      scale: state.scale.current,
      opacity: state.opacity.current,
      glow: state.glow.current,
      offsetX: state.positionOffset.x.current,
      offsetY: state.positionOffset.y.current
    };
  }

  /**
   * Clear all animations and states
   */
  clear(): void {
    this.animations.clear();
    this.elementStates.clear();
    this.hasActiveAnimations.set(false);
  }

  private markActive(elementId: string): void {
    const state = this.elementStates.get(elementId);
    if (state) {
      const existing = this.animations.get(elementId);
      if (existing) {
        existing.isActive = true;
      } else {
        this.animations.set(elementId, {
          id: elementId,
          state,
          isActive: true
        });
      }
      this.hasActiveAnimations.set(true);
    }
  }

  private registerAnimation(
    elementId: string,
    state: ElementAnimationState,
    config: SpringConfig,
    onComplete?: () => void
  ): void {
    this.animations.set(elementId, {
      id: elementId,
      state,
      isActive: true,
      onComplete
    });
    this.hasActiveAnimations.set(true);
  }
}
