/**
 * Zone Renderer - Draws polygon zones with hover/selection effects
 */

import { RenderContext, ElementState, Vec2 } from '../core/canvas-types';
import { CustomZone, Point } from '../../../../models/robot-monitoring.models';
import {
  ZONE_VERTEX_RADIUS,
  COLOR_SELECTION,
  COLOR_SELECTION_GLOW,
  COLOR_HOVER_GLOW,
  DEFAULT_ZONE_OPACITY,
  ZONE_COLORS,
  COLOR_ZONE_PREVIEW
} from '../core/constants';
import { AnimationEngineService } from '../animation/animation-engine.service';

export interface ZoneRenderData {
  zone: CustomZone;
  state: ElementState;
  hoveredVertex: number | null;
  draggingVertex: number | null;
}

export class ZoneRenderer {
  constructor(private animationEngine: AnimationEngineService) {}

  /**
   * Render all zones
   */
  render(
    context: RenderContext,
    zones: ZoneRenderData[],
    showLabels: boolean = true
  ): void {
    const { ctx } = context;

    for (const zoneData of zones) {
      this.renderZone(ctx, zoneData, showLabels);
    }
  }

  /**
   * Render a rectangle preview during drag-to-draw
   */
  renderRectPreview(
    ctx: CanvasRenderingContext2D,
    start: Vec2,
    current: Vec2
  ): void {
    const minX = Math.min(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);

    if (width < 5 || height < 5) return;

    ctx.save();

    // Fill
    ctx.fillStyle = COLOR_ZONE_PREVIEW;
    ctx.fillRect(minX, minY, width, height);

    // Border
    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(minX, minY, width, height);
    ctx.setLineDash([]);

    ctx.restore();
  }

  /**
   * Render a temporary zone being drawn
   */
  renderTempZone(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    cursorPos: Vec2 | null
  ): void {
    if (points.length === 0) return;

    ctx.save();

    // Draw lines connecting points
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    // Draw line to cursor position
    if (cursorPos) {
      ctx.lineTo(cursorPos.x, cursorPos.y);
    }

    // Close path if more than 2 points
    if (points.length >= 2) {
      ctx.closePath();
      ctx.fillStyle = COLOR_ZONE_PREVIEW;
      ctx.fill();
    }

    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points
    ctx.fillStyle = COLOR_SELECTION;
    for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render a single zone
   */
  private renderZone(
    ctx: CanvasRenderingContext2D,
    zoneData: ZoneRenderData,
    showLabels: boolean
  ): void {
    const { zone, state, hoveredVertex, draggingVertex } = zoneData;

    if (zone.points.length < 3) return;

    // Get animation values
    const anim = this.animationEngine.getRenderValues(zone.id);
    const glowIntensity = anim.glow;
    const opacity = anim.opacity;

    if (opacity <= 0) return;

    ctx.save();

    // Draw glow for hover/selection
    if (glowIntensity > 0) {
      this.drawGlow(ctx, zone.points, glowIntensity, state);
    }

    // Draw polygon fill
    ctx.beginPath();
    ctx.moveTo(zone.points[0].x, zone.points[0].y);
    for (let i = 1; i < zone.points.length; i++) {
      ctx.lineTo(zone.points[i].x, zone.points[i].y);
    }
    ctx.closePath();

    const color = zone.color || ZONE_COLORS[0].color;
    const zoneOpacity = zone.opacity ?? DEFAULT_ZONE_OPACITY;
    ctx.fillStyle = this.hexToRgba(color, zoneOpacity * opacity);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = state === 'selected' ? COLOR_SELECTION : color;
    ctx.lineWidth = state === 'selected' ? 2 : 1;
    ctx.stroke();

    // Draw vertex handles when selected or hovered
    if (state === 'selected' || state === 'hovered') {
      this.drawVertexHandles(ctx, zone.points, hoveredVertex, draggingVertex);
    }

    // Draw label
    if (showLabels && zone.name) {
      this.drawLabel(ctx, zone);
    }

    ctx.restore();
  }

  /**
   * Draw glow effect around zone
   */
  private drawGlow(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    intensity: number,
    state: ElementState
  ): void {
    const glowColor = state === 'selected' ? COLOR_SELECTION_GLOW : COLOR_HOVER_GLOW;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15 * intensity;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw vertex handles for editing
   */
  private drawVertexHandles(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    hoveredVertex: number | null,
    draggingVertex: number | null
  ): void {
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const isHovered = i === hoveredVertex;
      const isDragging = i === draggingVertex;

      const radius = (isHovered || isDragging)
        ? ZONE_VERTEX_RADIUS * 1.3
        : ZONE_VERTEX_RADIUS;

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);

      if (isDragging) {
        ctx.fillStyle = COLOR_SELECTION;
      } else if (isHovered) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = COLOR_SELECTION;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        continue;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
      }

      ctx.fill();
      ctx.stroke();
    }
  }

  /**
   * Draw zone label at center
   */
  private drawLabel(ctx: CanvasRenderingContext2D, zone: CustomZone): void {
    // Calculate center
    let sumX = 0;
    let sumY = 0;
    for (const point of zone.points) {
      sumX += point.x;
      sumY += point.y;
    }
    const centerX = sumX / zone.points.length;
    const centerY = sumY / zone.points.length;

    // Draw label background
    ctx.font = '12px Arial, sans-serif';
    const textWidth = ctx.measureText(zone.name).width;
    const padding = 4;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(
      centerX - textWidth / 2 - padding,
      centerY - 8 - padding,
      textWidth + padding * 2,
      16 + padding * 2
    );

    // Draw label text
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zone.name, centerX, centerY);
  }

  /**
   * Convert hex color to rgba string
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Get color for zone by index
   */
  static getColorByIndex(index: number): string {
    return ZONE_COLORS[index % ZONE_COLORS.length].color;
  }
}
