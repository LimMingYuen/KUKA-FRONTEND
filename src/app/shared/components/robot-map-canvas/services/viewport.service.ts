/**
 * Viewport Service - Pan, zoom, and coordinate transforms with momentum
 */

import { Injectable, signal, inject } from '@angular/core';
import { ViewportState, Vec2, Bounds } from '../core/canvas-types';
import {
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  FIT_PADDING,
  MOMENTUM_FRICTION,
  MOMENTUM_MIN_VELOCITY,
  SPRING_GENTLE
} from '../core/constants';
import { updateSpring } from '../animation/spring';

interface MomentumState {
  velocityX: number;
  velocityY: number;
  isActive: boolean;
}

interface ZoomAnimation {
  targetScale: number;
  centerX: number;
  centerY: number;
  velocity: number;
  isActive: boolean;
}

@Injectable()
export class ViewportService {
  // Current viewport state
  public readonly state = signal<ViewportState>({
    scale: DEFAULT_ZOOM,
    offsetX: 0,
    offsetY: 0,
    minScale: MIN_ZOOM,
    maxScale: MAX_ZOOM
  });

  // Canvas dimensions (set by engine)
  private canvasWidth = 0;
  private canvasHeight = 0;

  // Momentum scrolling state
  private momentum: MomentumState = {
    velocityX: 0,
    velocityY: 0,
    isActive: false
  };

  // Zoom animation state
  private zoomAnimation: ZoomAnimation = {
    targetScale: DEFAULT_ZOOM,
    centerX: 0,
    centerY: 0,
    velocity: 0,
    isActive: false
  };

  // Signals for animation state
  public readonly isAnimating = signal(false);

  /**
   * Set canvas dimensions
   */
  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Get current viewport state
   */
  get current(): ViewportState {
    return this.state();
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): Vec2 {
    const { scale, offsetX, offsetY } = this.state();
    return {
      x: (screenX - offsetX) / scale,
      y: (screenY - offsetY) / scale
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): Vec2 {
    const { scale, offsetX, offsetY } = this.state();
    return {
      x: worldX * scale + offsetX,
      y: worldY * scale + offsetY
    };
  }

  /**
   * Pan the viewport by delta in screen pixels
   */
  pan(deltaX: number, deltaY: number): void {
    this.state.update(s => ({
      ...s,
      offsetX: s.offsetX + deltaX,
      offsetY: s.offsetY + deltaY
    }));
  }

  /**
   * Pan with velocity (for momentum scrolling)
   */
  panWithVelocity(deltaX: number, deltaY: number, velocityX: number, velocityY: number): void {
    this.pan(deltaX, deltaY);
    this.momentum.velocityX = velocityX;
    this.momentum.velocityY = velocityY;
  }

  /**
   * Start momentum scrolling
   */
  startMomentum(velocityX: number, velocityY: number): void {
    this.momentum.velocityX = velocityX;
    this.momentum.velocityY = velocityY;
    this.momentum.isActive = true;
    this.updateAnimatingState();
  }

  /**
   * Stop momentum scrolling immediately
   */
  stopMomentum(): void {
    this.momentum.velocityX = 0;
    this.momentum.velocityY = 0;
    this.momentum.isActive = false;
    this.updateAnimatingState();
  }

  /**
   * Zoom at a specific screen point
   */
  zoomAt(screenX: number, screenY: number, delta: number): void {
    const { scale, offsetX, offsetY, minScale, maxScale } = this.state();

    // Calculate world position before zoom
    const worldBefore = this.screenToWorld(screenX, screenY);

    // Calculate new scale
    const zoomFactor = 1 + delta * ZOOM_STEP;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));

    // Calculate world position after zoom (at same screen point)
    const worldAfterX = (screenX - offsetX) / newScale;
    const worldAfterY = (screenY - offsetY) / newScale;

    // Adjust offset to keep the point under cursor
    const newOffsetX = offsetX + (worldAfterX - worldBefore.x) * newScale;
    const newOffsetY = offsetY + (worldAfterY - worldBefore.y) * newScale;

    this.state.set({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      minScale,
      maxScale
    });
  }

  /**
   * Smooth zoom to target scale at screen point
   */
  animateZoomTo(targetScale: number, screenX: number, screenY: number): void {
    const { minScale, maxScale } = this.state();
    this.zoomAnimation = {
      targetScale: Math.max(minScale, Math.min(maxScale, targetScale)),
      centerX: screenX,
      centerY: screenY,
      velocity: 0,
      isActive: true
    };
    this.updateAnimatingState();
  }

  /**
   * Zoom to fit bounds in viewport with padding
   */
  fitToBounds(bounds: Bounds, animate: boolean = true): void {
    if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return;

    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;

    // Calculate scale to fit
    const scaleX = (this.canvasWidth - FIT_PADDING * 2) / boundsWidth;
    const scaleY = (this.canvasHeight - FIT_PADDING * 2) / boundsHeight;
    const targetScale = Math.min(scaleX, scaleY);

    // Calculate center of bounds
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate offset to center bounds
    const targetOffsetX = this.canvasWidth / 2 - centerX * targetScale;
    const targetOffsetY = this.canvasHeight / 2 - centerY * targetScale;

    if (animate) {
      // Animate to target
      this.animateZoomTo(targetScale, this.canvasWidth / 2, this.canvasHeight / 2);
      // Also animate pan
      // TODO: implement pan animation
      this.state.update(s => ({
        ...s,
        offsetX: targetOffsetX,
        offsetY: targetOffsetY
      }));
    } else {
      this.state.update(s => ({
        ...s,
        scale: targetScale,
        offsetX: targetOffsetX,
        offsetY: targetOffsetY
      }));
    }
  }

  /**
   * Reset viewport to default state
   */
  reset(): void {
    this.state.set({
      scale: DEFAULT_ZOOM,
      offsetX: 0,
      offsetY: 0,
      minScale: MIN_ZOOM,
      maxScale: MAX_ZOOM
    });
    this.stopMomentum();
    this.zoomAnimation.isActive = false;
    this.updateAnimatingState();
  }

  /**
   * Center viewport on a world point
   */
  centerOn(worldX: number, worldY: number, animate: boolean = true): void {
    const { scale } = this.state();
    const targetOffsetX = this.canvasWidth / 2 - worldX * scale;
    const targetOffsetY = this.canvasHeight / 2 - worldY * scale;

    // TODO: Add animation support
    this.state.update(s => ({
      ...s,
      offsetX: targetOffsetX,
      offsetY: targetOffsetY
    }));
  }

  /**
   * Update viewport animations (call each frame)
   */
  update(deltaTime: number): boolean {
    let hasChanges = false;

    // Update momentum scrolling
    if (this.momentum.isActive) {
      const { velocityX, velocityY } = this.momentum;

      if (
        Math.abs(velocityX) > MOMENTUM_MIN_VELOCITY ||
        Math.abs(velocityY) > MOMENTUM_MIN_VELOCITY
      ) {
        // Apply momentum
        this.pan(velocityX * deltaTime, velocityY * deltaTime);

        // Apply friction
        this.momentum.velocityX *= MOMENTUM_FRICTION;
        this.momentum.velocityY *= MOMENTUM_FRICTION;
        hasChanges = true;
      } else {
        // Stop momentum when velocity is too low
        this.momentum.isActive = false;
      }
    }

    // Update zoom animation
    if (this.zoomAnimation.isActive) {
      const { scale } = this.state();
      const { targetScale, centerX, centerY } = this.zoomAnimation;

      // Use spring animation for zoom
      const result = updateSpring(
        scale,
        targetScale,
        this.zoomAnimation.velocity,
        SPRING_GENTLE,
        deltaTime
      );

      this.zoomAnimation.velocity = result.velocity;

      if (!result.isAtRest) {
        // Apply zoom at center point
        const delta = (result.value - scale) / scale / ZOOM_STEP;
        this.zoomAt(centerX, centerY, delta);
        hasChanges = true;
      } else {
        this.zoomAnimation.isActive = false;
      }
    }

    this.updateAnimatingState();
    return hasChanges;
  }

  /**
   * Check if a world point is visible in the viewport
   */
  isPointVisible(worldX: number, worldY: number): boolean {
    const screen = this.worldToScreen(worldX, worldY);
    return (
      screen.x >= 0 &&
      screen.x <= this.canvasWidth &&
      screen.y >= 0 &&
      screen.y <= this.canvasHeight
    );
  }

  /**
   * Get visible world bounds
   */
  getVisibleBounds(): Bounds {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvasWidth, this.canvasHeight);
    return {
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y
    };
  }

  /**
   * Constrain viewport to stay within content bounds
   */
  constrainToBounds(contentBounds: Bounds): void {
    // TODO: Implement bounds constraining with elastic edge effect
  }

  private updateAnimatingState(): void {
    this.isAnimating.set(this.momentum.isActive || this.zoomAnimation.isActive);
  }
}
