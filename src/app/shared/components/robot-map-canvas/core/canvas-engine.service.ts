/**
 * Canvas Engine Service - Core rendering engine with 60fps render loop
 */

import { Injectable, signal, inject, NgZone } from '@angular/core';
import {
  CanvasSize,
  RenderContext,
  ViewportState,
  CanvasConfig
} from './canvas-types';
import { DEFAULT_CANVAS_CONFIG, TARGET_FPS, FRAME_BUDGET_MS } from './constants';
import { AnimationEngineService } from '../animation/animation-engine.service';

export type RenderCallback = (ctx: RenderContext) => void;

@Injectable()
export class CanvasEngineService {
  private ngZone = inject(NgZone);
  private animationEngine = inject(AnimationEngineService);

  // Canvas reference
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Render loop state
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private isRunning = false;

  // Render callbacks (layers)
  private renderCallbacks: RenderCallback[] = [];

  // Configuration
  private config: CanvasConfig = DEFAULT_CANVAS_CONFIG;

  // Signals for reactive state
  public readonly canvasSize = signal<CanvasSize>({
    width: 0,
    height: 0,
    devicePixelRatio: 1
  });

  public readonly viewport = signal<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minScale: 0.1,
    maxScale: 5
  });

  public readonly fps = signal(0);
  public readonly isRendering = signal(false);

  // Performance tracking
  private frameTimeHistory: number[] = [];
  private readonly FRAME_HISTORY_SIZE = 60;

  /**
   * Initialize the engine with a canvas element
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false, // Opaque background for better performance
      desynchronized: true // Reduce latency on supported browsers
    });

    if (!this.ctx) {
      console.error('Failed to get 2D rendering context');
      return;
    }

    // Set up high-DPI canvas
    this.updateCanvasSize();

    // Start the render loop
    this.start();
  }

  /**
   * Update canvas size (call on resize)
   */
  updateCanvasSize(): void {
    if (!this.canvas || !this.ctx) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set display size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Set actual size in memory (scaled for high-DPI)
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Scale context to match high-DPI
    this.ctx.scale(dpr, dpr);

    this.canvasSize.set({
      width: rect.width,
      height: rect.height,
      devicePixelRatio: dpr
    });
  }

  /**
   * Set engine configuration
   */
  setConfig(config: Partial<CanvasConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update viewport state
   */
  setViewport(viewport: Partial<ViewportState>): void {
    this.viewport.update(current => ({ ...current, ...viewport }));
  }

  /**
   * Register a render callback (called every frame)
   */
  addRenderCallback(callback: RenderCallback): void {
    this.renderCallbacks.push(callback);
  }

  /**
   * Remove a render callback
   */
  removeRenderCallback(callback: RenderCallback): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index !== -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  /**
   * Clear all render callbacks
   */
  clearRenderCallbacks(): void {
    this.renderCallbacks = [];
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    // Run outside Angular zone for better performance
    this.ngZone.runOutsideAngular(() => {
      this.scheduleFrame();
    });
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isRendering.set(false);
  }

  /**
   * Request a single render (for when not continuously rendering)
   */
  requestRender(): void {
    if (!this.isRunning) {
      this.renderFrame(performance.now());
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.canvas = null;
    this.ctx = null;
    this.renderCallbacks = [];
    this.animationEngine.clear();
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Get the 2D rendering context
   */
  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private scheduleFrame(): void {
    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.renderFrame(timestamp);
      if (this.isRunning) {
        this.scheduleFrame();
      }
    });
  }

  private renderFrame(timestamp: number): void {
    if (!this.ctx || !this.canvas) return;

    const frameStart = performance.now();
    const deltaTime = (timestamp - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = timestamp;

    // Update animations
    const hasAnimations = this.animationEngine.update(deltaTime);

    // Only render if there are animations or this is a requested render
    this.isRendering.set(true);

    const size = this.canvasSize();
    const viewportState = this.viewport();

    // Create render context
    const renderContext: RenderContext = {
      ctx: this.ctx,
      viewport: viewportState,
      canvasSize: size,
      timestamp,
      deltaTime
    };

    // Clear canvas
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fill background (use canvas dimensions for high-DPI support)
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // Apply viewport transform
    this.ctx.save();
    this.ctx.translate(viewportState.offsetX, viewportState.offsetY);
    this.ctx.scale(viewportState.scale, viewportState.scale);

    // Call all render callbacks
    for (const callback of this.renderCallbacks) {
      try {
        callback(renderContext);
      } catch (error) {
        console.error('Render callback error:', error);
      }
    }

    this.ctx.restore();

    // Track frame time
    const frameTime = performance.now() - frameStart;
    this.updateFPS(frameTime);
  }

  private updateFPS(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    // Calculate average FPS
    const avgFrameTime =
      this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const fps = Math.round(1000 / Math.max(avgFrameTime, 1));

    // Only update signal occasionally to avoid too many updates
    if (this.frameTimeHistory.length % 10 === 0) {
      this.ngZone.run(() => {
        this.fps.set(fps);
      });
    }
  }

  // ============================================================================
  // Coordinate Transforms (convenience methods)
  // ============================================================================

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const vp = this.viewport();
    return {
      x: (screenX - vp.offsetX) / vp.scale,
      y: (screenY - vp.offsetY) / vp.scale
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const vp = this.viewport();
    return {
      x: worldX * vp.scale + vp.offsetX,
      y: worldY * vp.scale + vp.offsetY
    };
  }

  /**
   * Get screen position from mouse event relative to canvas
   */
  getScreenPosition(event: MouseEvent | Touch): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };

    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  /**
   * Get world position from mouse event
   */
  getWorldPosition(event: MouseEvent | Touch): { x: number; y: number } {
    const screen = this.getScreenPosition(event);
    return this.screenToWorld(screen.x, screen.y);
  }
}
