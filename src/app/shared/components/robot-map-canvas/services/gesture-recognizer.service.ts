/**
 * Gesture Recognizer Service - Touch gesture detection (pinch, pan, tap, long-press)
 */

import { Injectable, signal, inject, EventEmitter } from '@angular/core';
import { GestureState, Vec2 } from '../core/canvas-types';
import {
  LONG_PRESS_DURATION,
  PINCH_THRESHOLD,
  TWO_FINGER_PAN_THRESHOLD,
  TAP_TOLERANCE
} from '../core/constants';
import { ViewportService } from './viewport.service';
import { CanvasEngineService } from '../core/canvas-engine.service';

export interface PinchEvent {
  center: Vec2;
  scale: number;
  delta: Vec2;
}

export interface TwoFingerPanEvent {
  center: Vec2;
  delta: Vec2;
}

export interface TapEvent {
  screenPos: Vec2;
  worldPos: Vec2;
}

export interface LongPressEvent {
  screenPos: Vec2;
  worldPos: Vec2;
}

export interface DoubleTapEvent {
  screenPos: Vec2;
  worldPos: Vec2;
}

@Injectable()
export class GestureRecognizerService {
  private canvasEngine = inject(CanvasEngineService);
  private viewportService = inject(ViewportService);

  // Events
  public readonly onPinch = new EventEmitter<PinchEvent>();
  public readonly onTwoFingerPan = new EventEmitter<TwoFingerPanEvent>();
  public readonly onTap = new EventEmitter<TapEvent>();
  public readonly onDoubleTap = new EventEmitter<DoubleTapEvent>();
  public readonly onLongPress = new EventEmitter<LongPressEvent>();

  // Gesture state
  public readonly gestureState = signal<GestureState>({
    touchCount: 0,
    isPinching: false,
    initialPinchDistance: 0,
    currentPinchDistance: 0,
    pinchCenter: { x: 0, y: 0 },
    isTwoFingerPan: false,
    longPressTimer: null,
    isLongPress: false
  });

  // Touch tracking
  private touches: Map<number, { start: Vec2; current: Vec2; startTime: number }> = new Map();
  private lastTapTime = 0;
  private lastTapPos: Vec2 = { x: 0, y: 0 };
  private initialTwoFingerCenter: Vec2 = { x: 0, y: 0 };

  /**
   * Initialize gesture recognition on canvas
   */
  initialize(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }

  // ============================================================================
  // Touch Event Handlers
  // ============================================================================

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();

    // Track new touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const screenPos = this.getScreenPosition(touch);
      this.touches.set(touch.identifier, {
        start: screenPos,
        current: screenPos,
        startTime: Date.now()
      });
    }

    const touchCount = this.touches.size;

    // Update gesture state
    this.gestureState.update(s => ({
      ...s,
      touchCount
    }));

    if (touchCount === 1) {
      // Single touch - start long press timer
      this.startLongPressTimer();
    } else if (touchCount === 2) {
      // Two touches - initialize pinch/pan
      this.cancelLongPressTimer();
      this.initializeTwoFingerGesture();
    } else {
      // More than 2 touches - cancel gestures
      this.cancelLongPressTimer();
      this.cancelTwoFingerGesture();
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    // Update touch positions
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const tracked = this.touches.get(touch.identifier);
      if (tracked) {
        tracked.current = this.getScreenPosition(touch);
      }
    }

    const touchCount = this.touches.size;

    if (touchCount === 1) {
      // Check if moved too much for long press
      const touch = Array.from(this.touches.values())[0];
      const distance = this.distance(touch.start, touch.current);
      if (distance > TAP_TOLERANCE) {
        this.cancelLongPressTimer();
      }
    } else if (touchCount === 2) {
      this.handleTwoFingerMove();
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    // Remove ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const tracked = this.touches.get(touch.identifier);

      if (tracked && this.touches.size === 1) {
        // Single touch ended
        const distance = this.distance(tracked.start, tracked.current);
        const duration = Date.now() - tracked.startTime;

        this.cancelLongPressTimer();

        if (distance < TAP_TOLERANCE && duration < LONG_PRESS_DURATION) {
          // Tap detected
          const screenPos = tracked.current;
          const worldPos = this.canvasEngine.screenToWorld(screenPos.x, screenPos.y);

          // Check for double tap
          const now = Date.now();
          if (now - this.lastTapTime < 300 && this.distance(screenPos, this.lastTapPos) < 30) {
            this.onDoubleTap.emit({ screenPos, worldPos });
          } else {
            this.onTap.emit({ screenPos, worldPos });
          }

          this.lastTapTime = now;
          this.lastTapPos = screenPos;
        }
      }

      this.touches.delete(touch.identifier);
    }

    const touchCount = this.touches.size;

    // Update gesture state
    this.gestureState.update(s => ({
      ...s,
      touchCount,
      isPinching: false,
      isTwoFingerPan: false
    }));

    if (touchCount < 2) {
      this.cancelTwoFingerGesture();
    }
  }

  // ============================================================================
  // Two-Finger Gestures
  // ============================================================================

  private initializeTwoFingerGesture(): void {
    const touchArray = Array.from(this.touches.values());
    if (touchArray.length !== 2) return;

    const [t1, t2] = touchArray;
    const distance = this.distance(t1.current, t2.current);
    const center = this.midpoint(t1.current, t2.current);

    this.gestureState.update(s => ({
      ...s,
      initialPinchDistance: distance,
      currentPinchDistance: distance,
      pinchCenter: center
    }));

    this.initialTwoFingerCenter = center;
  }

  private handleTwoFingerMove(): void {
    const touchArray = Array.from(this.touches.values());
    if (touchArray.length !== 2) return;

    const [t1, t2] = touchArray;
    const currentDistance = this.distance(t1.current, t2.current);
    const currentCenter = this.midpoint(t1.current, t2.current);

    const state = this.gestureState();

    // Detect pinch
    const distanceDelta = Math.abs(currentDistance - state.initialPinchDistance);
    if (distanceDelta > PINCH_THRESHOLD) {
      const scale = currentDistance / state.initialPinchDistance;

      this.gestureState.update(s => ({
        ...s,
        isPinching: true,
        currentPinchDistance: currentDistance,
        pinchCenter: currentCenter
      }));

      this.onPinch.emit({
        center: currentCenter,
        scale,
        delta: {
          x: currentCenter.x - this.initialTwoFingerCenter.x,
          y: currentCenter.y - this.initialTwoFingerCenter.y
        }
      });

      // Apply zoom
      const zoomDelta = (currentDistance - state.currentPinchDistance) / 100;
      this.viewportService.zoomAt(currentCenter.x, currentCenter.y, zoomDelta);

      // Update stored distance for next frame
      this.gestureState.update(s => ({
        ...s,
        currentPinchDistance: currentDistance
      }));
    }

    // Detect pan
    const panDelta = this.distance(currentCenter, this.initialTwoFingerCenter);
    if (panDelta > TWO_FINGER_PAN_THRESHOLD && !state.isPinching) {
      this.gestureState.update(s => ({
        ...s,
        isTwoFingerPan: true,
        pinchCenter: currentCenter
      }));

      const delta = {
        x: currentCenter.x - state.pinchCenter.x,
        y: currentCenter.y - state.pinchCenter.y
      };

      this.onTwoFingerPan.emit({
        center: currentCenter,
        delta
      });

      // Apply pan
      this.viewportService.pan(delta.x, delta.y);

      // Update stored center for next frame
      this.gestureState.update(s => ({
        ...s,
        pinchCenter: currentCenter
      }));
    }
  }

  private cancelTwoFingerGesture(): void {
    this.gestureState.update(s => ({
      ...s,
      isPinching: false,
      isTwoFingerPan: false,
      initialPinchDistance: 0,
      currentPinchDistance: 0
    }));
  }

  // ============================================================================
  // Long Press
  // ============================================================================

  private startLongPressTimer(): void {
    this.cancelLongPressTimer();

    const timer = window.setTimeout(() => {
      const touch = Array.from(this.touches.values())[0];
      if (touch) {
        const screenPos = touch.current;
        const worldPos = this.canvasEngine.screenToWorld(screenPos.x, screenPos.y);

        this.gestureState.update(s => ({
          ...s,
          isLongPress: true
        }));

        this.onLongPress.emit({ screenPos, worldPos });
      }
    }, LONG_PRESS_DURATION);

    this.gestureState.update(s => ({
      ...s,
      longPressTimer: timer,
      isLongPress: false
    }));
  }

  private cancelLongPressTimer(): void {
    const timer = this.gestureState().longPressTimer;
    if (timer !== null) {
      clearTimeout(timer);
      this.gestureState.update(s => ({
        ...s,
        longPressTimer: null
      }));
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getScreenPosition(touch: Touch): Vec2 {
    const canvas = this.canvasEngine.getCanvas();
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  private distance(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private midpoint(a: Vec2, b: Vec2): Vec2 {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }
}
