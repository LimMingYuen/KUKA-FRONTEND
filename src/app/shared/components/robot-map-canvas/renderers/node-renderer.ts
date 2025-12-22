/**
 * Node Renderer - Draws nodes with hover/selection effects
 */

import { RenderContext, ElementState } from '../core/canvas-types';
import { CustomNode } from '../../../../models/robot-monitoring.models';
import {
  NODE_RADIUS,
  COLOR_SELECTION,
  COLOR_SELECTION_GLOW,
  COLOR_HOVER_GLOW,
  NODE_COLORS
} from '../core/constants';
import { AnimationEngineService } from '../animation/animation-engine.service';

export interface NodeRenderData {
  node: CustomNode;
  state: ElementState;
  isLineStart?: boolean;
}

export class NodeRenderer {
  constructor(private animationEngine: AnimationEngineService) {}

  /**
   * Render all nodes
   */
  render(
    context: RenderContext,
    nodes: NodeRenderData[],
    showLabels: boolean = true
  ): void {
    const { ctx, viewport } = context;

    for (const nodeData of nodes) {
      this.renderNode(ctx, nodeData, viewport.scale, showLabels);
    }
  }

  /**
   * Render a single node
   */
  private renderNode(
    ctx: CanvasRenderingContext2D,
    nodeData: NodeRenderData,
    scale: number,
    showLabels: boolean
  ): void {
    const { node, state, isLineStart } = nodeData;

    // Get animation values
    const anim = this.animationEngine.getRenderValues(node.id);
    const animScale = anim.scale;
    const glowIntensity = anim.glow;
    const opacity = anim.opacity;

    // Skip if fully transparent
    if (opacity <= 0) return;

    ctx.save();

    // Apply position with animation offset
    ctx.translate(node.x + anim.offsetX, node.y + anim.offsetY);

    // Apply animated scale
    ctx.scale(animScale, animScale);

    const radius = NODE_RADIUS;
    const color = node.color || NODE_COLORS[0];

    // Draw glow effect for hover/selection
    if (glowIntensity > 0) {
      this.drawGlow(ctx, radius, glowIntensity, state);
    }

    // Draw main circle
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = state === 'selected' ? COLOR_SELECTION : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = state === 'selected' ? 3 : 1;
    ctx.stroke();

    // Draw line start indicator
    if (isLineStart) {
      this.drawLineStartIndicator(ctx, radius);
    }

    // Draw label
    if (showLabels && (node.nodeNumber !== undefined || node.label)) {
      this.drawLabel(ctx, node, radius);
    }

    ctx.restore();
  }

  /**
   * Draw glow effect around node
   */
  private drawGlow(
    ctx: CanvasRenderingContext2D,
    radius: number,
    intensity: number,
    state: ElementState
  ): void {
    const glowColor = state === 'selected' ? COLOR_SELECTION_GLOW : COLOR_HOVER_GLOW;
    const glowRadius = radius * 1.5;

    const gradient = ctx.createRadialGradient(0, 0, radius, 0, 0, glowRadius);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.globalAlpha = intensity;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /**
   * Draw indicator showing this node is start of line being drawn
   */
  private drawLineStartIndicator(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.strokeStyle = COLOR_SELECTION;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Draw node label
   */
  private drawLabel(
    ctx: CanvasRenderingContext2D,
    node: CustomNode,
    radius: number
  ): void {
    const text = node.nodeNumber !== undefined
      ? node.nodeNumber.toString()
      : node.label;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
  }

  /**
   * Get color for node by index (cycling through palette)
   */
  static getColorByIndex(index: number): string {
    return NODE_COLORS[index % NODE_COLORS.length];
  }
}
