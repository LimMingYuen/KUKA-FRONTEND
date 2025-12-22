/**
 * Line Renderer - Draws lines between nodes with direction indicators
 */

import { RenderContext, ElementState, Vec2 } from '../core/canvas-types';
import { CustomLine } from '../../../../models/robot-monitoring.models';
import {
  DEFAULT_LINE_COLOR,
  DEFAULT_LINE_WEIGHT,
  COLOR_SELECTION,
  COLOR_SELECTION_GLOW,
  COLOR_HOVER_GLOW,
  COLOR_LINE_PREVIEW
} from '../core/constants';
import { AnimationEngineService } from '../animation/animation-engine.service';

export interface LineRenderData {
  line: CustomLine;
  from: Vec2;
  to: Vec2;
  state: ElementState;
}

export class LineRenderer {
  constructor(private animationEngine: AnimationEngineService) {}

  /**
   * Render all lines
   */
  render(context: RenderContext, lines: LineRenderData[]): void {
    const { ctx } = context;

    for (const lineData of lines) {
      this.renderLine(ctx, lineData);
    }
  }

  /**
   * Render a preview line from node to cursor
   */
  renderPreviewLine(
    ctx: CanvasRenderingContext2D,
    from: Vec2,
    to: Vec2
  ): void {
    ctx.save();

    ctx.strokeStyle = COLOR_LINE_PREVIEW;
    ctx.lineWidth = DEFAULT_LINE_WEIGHT;
    ctx.setLineDash([8, 4]);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Render a single line
   */
  private renderLine(ctx: CanvasRenderingContext2D, lineData: LineRenderData): void {
    const { line, from, to, state } = lineData;

    // Get animation values
    const anim = this.animationEngine.getRenderValues(line.id);
    const opacity = anim.opacity;
    const glowIntensity = anim.glow;

    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;

    const color = line.color || DEFAULT_LINE_COLOR;
    const weight = line.weight || DEFAULT_LINE_WEIGHT;

    // Draw glow for hover/selection
    if (glowIntensity > 0) {
      this.drawGlow(ctx, from, to, glowIntensity, state, weight);
    }

    // Draw main line
    ctx.strokeStyle = state === 'selected' ? COLOR_SELECTION : color;
    ctx.lineWidth = state === 'selected' ? weight + 1 : weight;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw glow effect for line
   */
  private drawGlow(
    ctx: CanvasRenderingContext2D,
    from: Vec2,
    to: Vec2,
    intensity: number,
    state: ElementState,
    weight: number
  ): void {
    const glowColor = state === 'selected' ? COLOR_SELECTION_GLOW : COLOR_HOVER_GLOW;

    ctx.save();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = weight + 8;
    ctx.lineCap = 'round';
    ctx.globalAlpha = intensity * 0.5;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw direction arrow at midpoint of line
   */
  private drawDirectionArrow(
    ctx: CanvasRenderingContext2D,
    from: Vec2,
    to: Vec2,
    color: string,
    state: ElementState
  ): void {
    // Calculate midpoint
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // Calculate angle
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Arrow dimensions
    const arrowSize = 8;
    const arrowAngle = Math.PI / 6; // 30 degrees

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);

    // Draw arrow
    ctx.fillStyle = state === 'selected' ? COLOR_SELECTION : color;
    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize * 0.5, -arrowSize * Math.sin(arrowAngle));
    ctx.lineTo(-arrowSize * 0.5, arrowSize * Math.sin(arrowAngle));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Calculate line length
   */
  static getLineLength(from: Vec2, to: Vec2): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate line angle in radians
   */
  static getLineAngle(from: Vec2, to: Vec2): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }
}
