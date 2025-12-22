/**
 * Selection Renderer - Draws selection box, handles, and outlines
 */

import { RenderContext, Vec2, SelectionBox, SnapGuide } from '../core/canvas-types';
import {
  COLOR_SELECTION,
  SELECTION_HANDLE_SIZE
} from '../core/constants';

export class SelectionRenderer {
  /**
   * Render selection box (drag to select)
   */
  renderSelectionBox(context: RenderContext, box: SelectionBox): void {
    if (!box.isActive) return;

    const { ctx } = context;
    const { startWorld, endWorld } = box;

    const x = Math.min(startWorld.x, endWorld.x);
    const y = Math.min(startWorld.y, endWorld.y);
    const width = Math.abs(endWorld.x - startWorld.x);
    const height = Math.abs(endWorld.y - startWorld.y);

    ctx.save();

    // Fill
    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    ctx.restore();
  }

  /**
   * Render bounding box with resize handles around selected elements
   */
  renderBoundingBox(
    context: RenderContext,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): void {
    const { ctx, viewport } = context;
    const { minX, minY, maxX, maxY } = bounds;

    const width = maxX - minX;
    const height = maxY - minY;

    // Add padding
    const padding = 8 / viewport.scale;
    const x = minX - padding;
    const y = minY - padding;
    const w = width + padding * 2;
    const h = height + padding * 2;

    ctx.save();

    // Dashed border
    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = 1 / viewport.scale;
    ctx.setLineDash([4 / viewport.scale, 4 / viewport.scale]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = SELECTION_HANDLE_SIZE / viewport.scale;
    this.drawHandle(ctx, x, y, handleSize); // Top-left
    this.drawHandle(ctx, x + w, y, handleSize); // Top-right
    this.drawHandle(ctx, x, y + h, handleSize); // Bottom-left
    this.drawHandle(ctx, x + w, y + h, handleSize); // Bottom-right

    // Draw edge midpoint handles
    this.drawHandle(ctx, x + w / 2, y, handleSize); // Top
    this.drawHandle(ctx, x + w / 2, y + h, handleSize); // Bottom
    this.drawHandle(ctx, x, y + h / 2, handleSize); // Left
    this.drawHandle(ctx, x + w, y + h / 2, handleSize); // Right

    ctx.restore();
  }

  /**
   * Render rotation handle
   */
  renderRotationHandle(
    context: RenderContext,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): void {
    const { ctx, viewport } = context;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const topY = bounds.minY - 30 / viewport.scale;

    ctx.save();

    // Line from bounding box to rotation handle
    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = 1 / viewport.scale;
    ctx.beginPath();
    ctx.moveTo(centerX, bounds.minY - 8 / viewport.scale);
    ctx.lineTo(centerX, topY + 8 / viewport.scale);
    ctx.stroke();

    // Rotation handle (circle)
    const handleRadius = 6 / viewport.scale;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = 2 / viewport.scale;
    ctx.beginPath();
    ctx.arc(centerX, topY, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotation icon
    ctx.fillStyle = COLOR_SELECTION;
    ctx.font = `${10 / viewport.scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↻', centerX, topY);

    ctx.restore();
  }

  /**
   * Render guide lines for alignment
   */
  renderAlignmentGuides(
    context: RenderContext,
    guides: { horizontal: number[]; vertical: number[] }
  ): void {
    const { ctx, canvasSize, viewport } = context;

    ctx.save();
    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 1 / viewport.scale;
    ctx.setLineDash([4 / viewport.scale, 4 / viewport.scale]);

    // Calculate visible bounds in world coordinates
    const visibleBounds = {
      minX: -viewport.offsetX / viewport.scale,
      minY: -viewport.offsetY / viewport.scale,
      maxX: (canvasSize.width - viewport.offsetX) / viewport.scale,
      maxY: (canvasSize.height - viewport.offsetY) / viewport.scale
    };

    // Draw horizontal guides
    for (const y of guides.horizontal) {
      ctx.beginPath();
      ctx.moveTo(visibleBounds.minX, y);
      ctx.lineTo(visibleBounds.maxX, y);
      ctx.stroke();
    }

    // Draw vertical guides
    for (const x of guides.vertical) {
      ctx.beginPath();
      ctx.moveTo(x, visibleBounds.minY);
      ctx.lineTo(x, visibleBounds.maxY);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Render distance indicator between two points
   */
  renderDistanceIndicator(
    context: RenderContext,
    from: Vec2,
    to: Vec2
  ): void {
    const { ctx, viewport } = context;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) return;

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const angle = Math.atan2(dy, dx);

    ctx.save();

    // Draw line with end markers
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1 / viewport.scale;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Draw distance label
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    const fontSize = 11 / viewport.scale;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Flip text if upside down
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
      ctx.rotate(Math.PI);
    }

    ctx.fillText(`${distance.toFixed(0)}px`, 0, -3 / viewport.scale);

    ctx.restore();
  }

  /**
   * Draw a resize handle
   */
  private drawHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = size * 0.15;

    ctx.beginPath();
    ctx.rect(x - size / 2, y - size / 2, size, size);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Render snap guides during node dragging
   * Shows alignment lines (horizontal, vertical, diagonal)
   */
  renderSnapGuides(context: RenderContext, guides: SnapGuide[]): void {
    if (guides.length === 0) return;

    const { ctx, canvasSize, viewport } = context;

    ctx.save();

    // Magenta color for snap guides (like Figma)
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 1 / viewport.scale;
    ctx.setLineDash([4 / viewport.scale, 4 / viewport.scale]);

    // Calculate visible bounds for extending lines
    const padding = 1000; // Extend lines beyond visible area
    const visibleBounds = {
      minX: -viewport.offsetX / viewport.scale - padding,
      minY: -viewport.offsetY / viewport.scale - padding,
      maxX: (canvasSize.width - viewport.offsetX) / viewport.scale + padding,
      maxY: (canvasSize.height - viewport.offsetY) / viewport.scale + padding
    };

    for (const guide of guides) {
      ctx.beginPath();

      switch (guide.type) {
        case 'horizontal':
          // Horizontal line at y, from x1 to x2 (extend to visible bounds)
          ctx.moveTo(visibleBounds.minX, guide.y);
          ctx.lineTo(visibleBounds.maxX, guide.y);
          break;

        case 'vertical':
          // Vertical line at x, from y1 to y2 (extend to visible bounds)
          ctx.moveTo(guide.x, visibleBounds.minY);
          ctx.lineTo(guide.x, visibleBounds.maxY);
          break;

        case 'diagonal':
          // Diagonal line from one node to another
          ctx.moveTo(guide.from.x, guide.from.y);
          ctx.lineTo(guide.to.x, guide.to.y);
          break;
      }

      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }
}
