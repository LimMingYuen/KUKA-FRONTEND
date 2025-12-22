/**
 * Background Renderer - Draws background image and dot grid pattern
 */

import { RenderContext } from '../core/canvas-types';
import {
  COLOR_BACKGROUND,
  COLOR_GRID,
  GRID_SPACING,
  GRID_DOT_RADIUS
} from '../core/constants';

export class BackgroundRenderer {
  private backgroundImage: HTMLImageElement | null = null;
  private imageWidth = 0;
  private imageHeight = 0;
  private isImageLoaded = false;

  /**
   * Set the background image
   */
  setImage(url: string | null, width: number, height: number): Promise<void> {
    this.imageWidth = width;
    this.imageHeight = height;

    if (!url) {
      this.backgroundImage = null;
      this.isImageLoaded = false;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.backgroundImage = img;
        this.isImageLoaded = true;
        resolve();
      };

      img.onerror = () => {
        this.backgroundImage = null;
        this.isImageLoaded = false;
        reject(new Error('Failed to load background image'));
      };

      img.src = url;
    });
  }

  /**
   * Clear the background image
   */
  clearImage(): void {
    this.backgroundImage = null;
    this.isImageLoaded = false;
  }

  /**
   * Render the background
   */
  render(context: RenderContext, showGrid: boolean = true): void {
    const { ctx, viewport } = context;

    // Draw background image if loaded
    if (this.isImageLoaded && this.backgroundImage) {
      this.renderImage(ctx);
    } else if (showGrid) {
      // Draw dot grid pattern when no image
      this.renderDotGrid(context);
    }
  }

  /**
   * Get the image dimensions
   */
  getImageDimensions(): { width: number; height: number } {
    return { width: this.imageWidth, height: this.imageHeight };
  }

  /**
   * Check if image is loaded
   */
  hasImage(): boolean {
    return this.isImageLoaded;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private renderImage(ctx: CanvasRenderingContext2D): void {
    if (!this.backgroundImage) return;

    ctx.save();

    // Draw the image at origin, scaled to specified dimensions
    ctx.drawImage(
      this.backgroundImage,
      0,
      0,
      this.imageWidth,
      this.imageHeight
    );

    ctx.restore();
  }

  private renderDotGrid(context: RenderContext): void {
    const { ctx, viewport, canvasSize } = context;
    const { scale, offsetX, offsetY } = viewport;

    // Calculate visible area in world coordinates
    const startX = -offsetX / scale;
    const startY = -offsetY / scale;
    const endX = (canvasSize.width - offsetX) / scale;
    const endY = (canvasSize.height - offsetY) / scale;

    // Adjust grid spacing based on zoom level
    let gridSpacing = GRID_SPACING;
    if (scale < 0.5) {
      gridSpacing = GRID_SPACING * 2;
    } else if (scale < 0.25) {
      gridSpacing = GRID_SPACING * 4;
    }

    // Align to grid
    const gridStartX = Math.floor(startX / gridSpacing) * gridSpacing;
    const gridStartY = Math.floor(startY / gridSpacing) * gridSpacing;

    ctx.save();
    ctx.fillStyle = COLOR_GRID;

    // Draw dots
    const dotRadius = GRID_DOT_RADIUS / scale;

    for (let x = gridStartX; x <= endX; x += gridSpacing) {
      for (let y = gridStartY; y <= endY; y += gridSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
