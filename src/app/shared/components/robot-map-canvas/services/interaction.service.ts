/**
 * Interaction Service - Unified pointer handling for mouse and touch
 */

import { Injectable, signal, inject, EventEmitter, Output } from '@angular/core';
import { PointerState, DragState, HitTestResult, Vec2, PointerButton } from '../core/canvas-types';
import {
  DRAG_THRESHOLD,
  DOUBLE_CLICK_DELAY
} from '../core/constants';
import { ViewportService } from './viewport.service';
import { HitTestService } from './hit-test.service';
import { CanvasEngineService } from '../core/canvas-engine.service';

export interface PointerEvent {
  screenPos: Vec2;
  worldPos: Vec2;
  button: PointerButton;
  isTouch: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export interface DragEvent {
  startWorld: Vec2;
  currentWorld: Vec2;
  deltaWorld: Vec2;
  target: HitTestResult | null;
  isTouch: boolean;
}

@Injectable()
export class InteractionService {
  private canvasEngine = inject(CanvasEngineService);
  private viewportService = inject(ViewportService);
  private hitTestService = inject(HitTestService);

  // Current pointer state
  public readonly pointerState = signal<PointerState>({
    screenPos: { x: 0, y: 0 },
    worldPos: { x: 0, y: 0 },
    button: 'none',
    isDown: false,
    isTouch: false
  });

  // Drag state
  public readonly dragState = signal<DragState>({
    isDragging: false,
    startWorld: { x: 0, y: 0 },
    currentWorld: { x: 0, y: 0 },
    target: null,
    offset: { x: 0, y: 0 }
  });

  // Hovered element
  public readonly hoveredElement = signal<HitTestResult | null>(null);

  // Events
  public readonly onClick = new EventEmitter<PointerEvent>();
  public readonly onDoubleClick = new EventEmitter<PointerEvent>();
  public readonly onRightClick = new EventEmitter<PointerEvent>();
  public readonly onDragStart = new EventEmitter<DragEvent>();
  public readonly onDrag = new EventEmitter<DragEvent>();
  public readonly onDragEnd = new EventEmitter<DragEvent>();
  public readonly onHoverChange = new EventEmitter<HitTestResult | null>();

  // Internal state
  private pointerDownTime = 0;
  private pointerDownPos: Vec2 = { x: 0, y: 0 };
  private lastClickTime = 0;
  private lastClickPos: Vec2 = { x: 0, y: 0 };
  private isSpaceDown = false;
  private isPanning = false;
  private panStartOffset: Vec2 = { x: 0, y: 0 };

  /**
   * Initialize event listeners on canvas
   */
  initialize(canvas: HTMLCanvasElement): void {
    // Mouse events
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

    // Touch events
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    // Keyboard events (for spacebar pan)
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Set space key state (for external control)
   */
  setSpaceDown(isDown: boolean): void {
    this.isSpaceDown = isDown;
  }

  // ============================================================================
  // Mouse Event Handlers
  // ============================================================================

  private handleMouseDown(e: MouseEvent): void {
    const screenPos = this.canvasEngine.getScreenPosition(e);
    const worldPos = this.canvasEngine.screenToWorld(screenPos.x, screenPos.y);
    const button = this.getMouseButton(e);

    this.pointerDownTime = Date.now();
    this.pointerDownPos = { ...screenPos };

    // Update pointer state
    this.pointerState.set({
      screenPos,
      worldPos,
      button,
      isDown: true,
      isTouch: false
    });

    // Check for pan mode (middle button or space+left)
    if (button === 'middle' || (this.isSpaceDown && button === 'left')) {
      this.startPan(screenPos);
      return;
    }

    // Hit test to find what was clicked
    const hit = this.hitTestService.hitTest(worldPos.x, worldPos.y);

    // Store potential drag target
    if (hit && button === 'left') {
      const offset = {
        x: worldPos.x - this.getElementPosition(hit).x,
        y: worldPos.y - this.getElementPosition(hit).y
      };

      this.dragState.set({
        isDragging: false,
        startWorld: worldPos,
        currentWorld: worldPos,
        target: hit,
        offset
      });
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const screenPos = this.canvasEngine.getScreenPosition(e);
    const worldPos = this.canvasEngine.screenToWorld(screenPos.x, screenPos.y);

    const pointer = this.pointerState();

    // Update pointer state
    this.pointerState.update(s => ({
      ...s,
      screenPos,
      worldPos
    }));

    // Handle panning
    if (this.isPanning) {
      this.updatePan(screenPos);
      return;
    }

    // Handle dragging
    if (pointer.isDown && pointer.button === 'left') {
      const drag = this.dragState();
      const distance = this.distance(screenPos, this.pointerDownPos);

      if (!drag.isDragging && distance > DRAG_THRESHOLD) {
        // Start dragging
        this.dragState.update(s => ({
          ...s,
          isDragging: true,
          currentWorld: worldPos
        }));

        this.onDragStart.emit({
          startWorld: drag.startWorld,
          currentWorld: worldPos,
          deltaWorld: { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y },
          target: drag.target,
          isTouch: false
        });
      } else if (drag.isDragging) {
        // Continue dragging
        this.dragState.update(s => ({
          ...s,
          currentWorld: worldPos
        }));

        this.onDrag.emit({
          startWorld: drag.startWorld,
          currentWorld: worldPos,
          deltaWorld: { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y },
          target: drag.target,
          isTouch: false
        });
      }
      return;
    }

    // Update hover state
    const hit = this.hitTestService.hitTest(worldPos.x, worldPos.y);
    const currentHover = this.hoveredElement();

    if (hit?.id !== currentHover?.id || hit?.type !== currentHover?.type) {
      this.hoveredElement.set(hit);
      this.onHoverChange.emit(hit);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const screenPos = this.canvasEngine.getScreenPosition(e);
    const worldPos = this.canvasEngine.screenToWorld(screenPos.x, screenPos.y);
    const button = this.getMouseButton(e);

    // End panning
    if (this.isPanning) {
      this.endPan();
      this.pointerState.update(s => ({ ...s, isDown: false, button: 'none' }));
      return;
    }

    // End dragging
    const drag = this.dragState();
    if (drag.isDragging) {
      this.onDragEnd.emit({
        startWorld: drag.startWorld,
        currentWorld: worldPos,
        deltaWorld: { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y },
        target: drag.target,
        isTouch: false
      });
    } else if (button === 'left') {
      // Click (not drag)
      const now = Date.now();
      const clickDistance = this.distance(screenPos, this.lastClickPos);

      if (now - this.lastClickTime < DOUBLE_CLICK_DELAY && clickDistance < 10) {
        // Double click
        this.onDoubleClick.emit({
          screenPos,
          worldPos,
          button,
          isTouch: false,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey
        });
      } else {
        // Single click
        this.onClick.emit({
          screenPos,
          worldPos,
          button,
          isTouch: false,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey
        });
      }

      this.lastClickTime = now;
      this.lastClickPos = screenPos;
    }

    // Reset state
    this.dragState.set({
      isDragging: false,
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 0, y: 0 },
      target: null,
      offset: { x: 0, y: 0 }
    });

    this.pointerState.update(s => ({ ...s, isDown: false, button: 'none' }));
  }

  private handleMouseLeave(e: MouseEvent): void {
    this.hoveredElement.set(null);
    this.onHoverChange.emit(null);
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const screenPos = this.canvasEngine.getScreenPosition(e);
    const delta = -Math.sign(e.deltaY);

    this.viewportService.zoomAt(screenPos.x, screenPos.y, delta);
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();

    const canvasPos = this.canvasEngine.getScreenPosition(e);
    const worldPos = this.canvasEngine.screenToWorld(canvasPos.x, canvasPos.y);

    // Use clientX/clientY for context menu positioning (viewport coordinates)
    // since context menu uses position: fixed
    this.onRightClick.emit({
      screenPos: { x: e.clientX, y: e.clientY },
      worldPos,
      button: 'right',
      isTouch: false,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey
    });
  }

  // ============================================================================
  // Touch Event Handlers (basic - gesture recognizer handles complex gestures)
  // ============================================================================

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const screenPos = this.canvasEngine.getScreenPosition(touch);
      const worldPos = this.canvasEngine.screenToWorld(screenPos.x, screenPos.y);

      this.pointerDownTime = Date.now();
      this.pointerDownPos = { ...screenPos };

      this.pointerState.set({
        screenPos,
        worldPos,
        button: 'left',
        isDown: true,
        isTouch: true
      });

      const hit = this.hitTestService.hitTest(worldPos.x, worldPos.y);
      if (hit) {
        const offset = {
          x: worldPos.x - this.getElementPosition(hit).x,
          y: worldPos.y - this.getElementPosition(hit).y
        };

        this.dragState.set({
          isDragging: false,
          startWorld: worldPos,
          currentWorld: worldPos,
          target: hit,
          offset
        });
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const screenPos = this.canvasEngine.getScreenPosition(touch);
      const worldPos = this.canvasEngine.screenToWorld(screenPos.x, screenPos.y);

      this.pointerState.update(s => ({
        ...s,
        screenPos,
        worldPos
      }));

      const drag = this.dragState();
      const distance = this.distance(screenPos, this.pointerDownPos);

      if (!drag.isDragging && distance > DRAG_THRESHOLD) {
        this.dragState.update(s => ({
          ...s,
          isDragging: true,
          currentWorld: worldPos
        }));

        this.onDragStart.emit({
          startWorld: drag.startWorld,
          currentWorld: worldPos,
          deltaWorld: { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y },
          target: drag.target,
          isTouch: true
        });
      } else if (drag.isDragging) {
        this.dragState.update(s => ({
          ...s,
          currentWorld: worldPos
        }));

        this.onDrag.emit({
          startWorld: drag.startWorld,
          currentWorld: worldPos,
          deltaWorld: { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y },
          target: drag.target,
          isTouch: true
        });
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    const drag = this.dragState();

    if (drag.isDragging) {
      this.onDragEnd.emit({
        startWorld: drag.startWorld,
        currentWorld: drag.currentWorld,
        deltaWorld: {
          x: drag.currentWorld.x - drag.startWorld.x,
          y: drag.currentWorld.y - drag.startWorld.y
        },
        target: drag.target,
        isTouch: true
      });
    } else if (this.pointerState().isDown) {
      // Tap
      const pointer = this.pointerState();
      this.onClick.emit({
        screenPos: pointer.screenPos,
        worldPos: pointer.worldPos,
        button: 'left',
        isTouch: true,
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      });
    }

    this.dragState.set({
      isDragging: false,
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 0, y: 0 },
      target: null,
      offset: { x: 0, y: 0 }
    });

    this.pointerState.update(s => ({ ...s, isDown: false, button: 'none' }));
  }

  // ============================================================================
  // Keyboard Event Handlers
  // ============================================================================

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.isSpaceDown = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.isSpaceDown = false;
      if (this.isPanning) {
        this.endPan();
      }
    }
  }

  // ============================================================================
  // Pan Helpers
  // ============================================================================

  private startPan(screenPos: Vec2): void {
    this.isPanning = true;
    this.panStartOffset = { ...screenPos };
  }

  private updatePan(screenPos: Vec2): void {
    const deltaX = screenPos.x - this.panStartOffset.x;
    const deltaY = screenPos.y - this.panStartOffset.y;
    this.viewportService.pan(deltaX, deltaY);
    this.panStartOffset = { ...screenPos };
  }

  private endPan(): void {
    this.isPanning = false;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getMouseButton(e: MouseEvent): PointerButton {
    switch (e.button) {
      case 0: return 'left';
      case 1: return 'middle';
      case 2: return 'right';
      default: return 'none';
    }
  }

  private distance(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getElementPosition(hit: HitTestResult): Vec2 {
    switch (hit.type) {
      case 'node':
      case 'node-edge':
        const node = hit.element as any;
        return { x: node.x, y: node.y };
      case 'zone':
        const zone = hit.element as any;
        return this.getPolygonCenter(zone.points);
      case 'robot':
        return hit.worldPoint;
      default:
        return hit.worldPoint;
    }
  }

  private getPolygonCenter(points: Vec2[]): Vec2 {
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }
}
