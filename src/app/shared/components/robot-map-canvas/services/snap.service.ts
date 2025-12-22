/**
 * Snap Service - Smart snapping for node alignment
 *
 * Provides alignment snapping when dragging nodes to help users
 * arrange nodes in straight lines (horizontal, vertical, 45°)
 */

import { Injectable } from '@angular/core';
import { Vec2, SnapGuide, SnapResult } from '../core/canvas-types';
import { CustomNode } from '../../../../models/robot-monitoring.models';

@Injectable()
export class SnapService {
  /** Distance threshold in world coordinates for snapping */
  private readonly SNAP_THRESHOLD = 10;

  /**
   * Calculate snap position for a node being dragged
   * Returns the snapped position and guide lines to render
   *
   * @param dragPos Current drag position (before snapping)
   * @param otherNodes All nodes to check alignment against
   * @param excludeId ID of the node being dragged (to exclude from checks)
   * @returns Snapped position and visual guides
   */
  calculateSnap(
    dragPos: Vec2,
    otherNodes: CustomNode[],
    excludeId: string
  ): SnapResult {
    let snappedX = dragPos.x;
    let snappedY = dragPos.y;
    const guides: SnapGuide[] = [];

    // Track closest snap distances to prioritize nearest alignment
    let closestHorizontalDist = this.SNAP_THRESHOLD;
    let closestVerticalDist = this.SNAP_THRESHOLD;
    let closestDiagonalDist = this.SNAP_THRESHOLD;

    for (const node of otherNodes) {
      if (node.id === excludeId) continue;

      // Horizontal alignment (same Y coordinate)
      const hDist = Math.abs(dragPos.y - node.y);
      if (hDist < closestHorizontalDist) {
        closestHorizontalDist = hDist;
        snappedY = node.y;

        // Remove previous horizontal guides and add new one
        const hIndex = guides.findIndex(g => g.type === 'horizontal');
        if (hIndex >= 0) guides.splice(hIndex, 1);

        guides.push({
          type: 'horizontal',
          y: node.y,
          x1: Math.min(dragPos.x, node.x),
          x2: Math.max(dragPos.x, node.x)
        });
      }

      // Vertical alignment (same X coordinate)
      const vDist = Math.abs(dragPos.x - node.x);
      if (vDist < closestVerticalDist) {
        closestVerticalDist = vDist;
        snappedX = node.x;

        // Remove previous vertical guides and add new one
        const vIndex = guides.findIndex(g => g.type === 'vertical');
        if (vIndex >= 0) guides.splice(vIndex, 1);

        guides.push({
          type: 'vertical',
          x: node.x,
          y1: Math.min(dragPos.y, node.y),
          y2: Math.max(dragPos.y, node.y)
        });
      }

      // 45-degree diagonal alignment
      const dx = dragPos.x - node.x;
      const dy = dragPos.y - node.y;
      const diagonalDiff = Math.abs(Math.abs(dx) - Math.abs(dy));

      if (diagonalDiff < closestDiagonalDist && Math.abs(dx) > 20 && Math.abs(dy) > 20) {
        // Only snap to diagonal if not already snapped to H or V
        // and if there's meaningful distance
        closestDiagonalDist = diagonalDiff;

        // Snap to exact 45 degrees
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const diagX = node.x + Math.sign(dx) * distance;
        const diagY = node.y + Math.sign(dy) * distance;

        // Only apply diagonal snap if it doesn't conflict with H/V snaps
        if (closestHorizontalDist >= this.SNAP_THRESHOLD &&
            closestVerticalDist >= this.SNAP_THRESHOLD) {
          snappedX = diagX;
          snappedY = diagY;

          // Remove previous diagonal guides and add new one
          const dIndex = guides.findIndex(g => g.type === 'diagonal');
          if (dIndex >= 0) guides.splice(dIndex, 1);

          guides.push({
            type: 'diagonal',
            from: { x: node.x, y: node.y },
            to: { x: diagX, y: diagY }
          });
        }
      }
    }

    return {
      snappedPos: { x: snappedX, y: snappedY },
      guides
    };
  }

  /**
   * Clear all guides (call when drag ends)
   */
  clearGuides(): SnapGuide[] {
    return [];
  }
}
