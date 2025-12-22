/**
 * Hit Test Service - Algorithms for detecting shapes under cursor
 */

import { Injectable, inject } from '@angular/core';
import { HitTestResult, Vec2 } from '../core/canvas-types';
import { CustomNode, CustomZone, CustomLine, Point } from '../../../../models/robot-monitoring.models';
import { AnimatedRobotState } from '../../../../models/robot-realtime.models';
import {
  NODE_RADIUS,
  LINE_HIT_TOLERANCE,
  ZONE_VERTEX_RADIUS,
  ROBOT_SIZE
} from '../core/constants';
import { ViewportService } from './viewport.service';

@Injectable()
export class HitTestService {
  private viewportService = inject(ViewportService);

  // Data references (set by parent component)
  private nodes: CustomNode[] = [];
  private zones: CustomZone[] = [];
  private lines: CustomLine[] = [];
  private robots: Map<string, AnimatedRobotState> = new Map();
  private placedRobotIds: Map<string, { nodeId: string; x: number; y: number }> = new Map();

  /**
   * Set data references for hit testing
   */
  setData(
    nodes: CustomNode[],
    zones: CustomZone[],
    lines: CustomLine[],
    robots: Map<string, AnimatedRobotState>,
    placedRobotIds: Map<string, { nodeId: string; x: number; y: number }>
  ): void {
    this.nodes = nodes;
    this.zones = zones;
    this.lines = lines;
    this.robots = robots;
    this.placedRobotIds = placedRobotIds;
  }

  /**
   * Perform hit test at world coordinates
   * Returns the topmost element at the given point, or null if nothing hit
   */
  hitTest(worldX: number, worldY: number): HitTestResult | null {
    const worldPoint: Vec2 = { x: worldX, y: worldY };
    const scale = this.viewportService.current.scale;

    // Check in reverse z-order (top to bottom)
    // 1. Robots (topmost)
    const robotHit = this.hitTestRobots(worldPoint, scale);
    if (robotHit) return robotHit;

    // 2. Nodes
    const nodeHit = this.hitTestNodes(worldPoint, scale);
    if (nodeHit) return nodeHit;

    // 3. Lines
    const lineHit = this.hitTestLines(worldPoint, scale);
    if (lineHit) return lineHit;

    // 4. Zone vertices (for editing)
    const vertexHit = this.hitTestZoneVertices(worldPoint, scale);
    if (vertexHit) return vertexHit;

    // 5. Zones (bottommost)
    const zoneHit = this.hitTestZones(worldPoint);
    if (zoneHit) return zoneHit;

    return null;
  }

  /**
   * Check if a point is near the edge of a node (for line drawing)
   */
  hitTestNodeEdge(worldX: number, worldY: number): HitTestResult | null {
    const worldPoint: Vec2 = { x: worldX, y: worldY };

    for (const node of this.nodes) {
      const distance = this.pointDistance(worldPoint, { x: node.x, y: node.y });
      const radius = NODE_RADIUS;
      const edgeThreshold = 4;

      // Check if point is near the edge (not center)
      if (distance >= radius - edgeThreshold && distance <= radius + edgeThreshold) {
        return {
          type: 'node-edge',
          id: node.id,
          element: node,
          worldPoint
        };
      }
    }

    return null;
  }

  /**
   * Find all elements within a selection rectangle
   */
  hitTestRect(minX: number, minY: number, maxX: number, maxY: number): HitTestResult[] {
    const results: HitTestResult[] = [];

    // Check nodes
    for (const node of this.nodes) {
      if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
        results.push({
          type: 'node',
          id: node.id,
          element: node,
          worldPoint: { x: node.x, y: node.y }
        });
      }
    }

    // Check zones (by center or any vertex)
    for (const zone of this.zones) {
      const center = this.getPolygonCenter(zone.points);
      if (center.x >= minX && center.x <= maxX && center.y >= minY && center.y <= maxY) {
        results.push({
          type: 'zone',
          id: zone.id,
          element: zone,
          worldPoint: center
        });
      }
    }

    // Check lines (by midpoint)
    for (const line of this.lines) {
      const fromNode = this.nodes.find(n => n.id === line.fromNodeId);
      const toNode = this.nodes.find(n => n.id === line.toNodeId);
      if (fromNode && toNode) {
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        if (midX >= minX && midX <= maxX && midY >= minY && midY <= maxY) {
          results.push({
            type: 'line',
            id: line.id,
            element: line,
            worldPoint: { x: midX, y: midY }
          });
        }
      }
    }

    return results;
  }

  // ============================================================================
  // Private Hit Test Methods
  // ============================================================================

  private hitTestRobots(worldPoint: Vec2, scale: number): HitTestResult | null {
    // Robot size is in world coordinates
    const hitRadius = ROBOT_SIZE / 2;

    for (const [robotId, placement] of this.placedRobotIds) {
      const robot = this.robots.get(robotId);
      if (!robot) continue;

      // Use placement position for manually placed robots
      const robotPos = { x: placement.x, y: placement.y };
      const distance = this.pointDistance(worldPoint, robotPos);

      if (distance <= hitRadius) {
        return {
          type: 'robot',
          id: robotId,
          element: robot,
          worldPoint
        };
      }
    }

    return null;
  }

  private hitTestNodes(worldPoint: Vec2, scale: number): HitTestResult | null {
    // Node radius is in world coordinates (same as rendering)
    const hitRadius = NODE_RADIUS;

    // Iterate in reverse to hit topmost first
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const distance = this.pointDistance(worldPoint, { x: node.x, y: node.y });

      if (distance <= hitRadius) {
        return {
          type: 'node',
          id: node.id,
          element: node,
          worldPoint
        };
      }
    }

    return null;
  }

  private hitTestLines(worldPoint: Vec2, scale: number): HitTestResult | null {
    // Line tolerance in world coordinates
    const tolerance = LINE_HIT_TOLERANCE;

    for (const line of this.lines) {
      const fromNode = this.nodes.find(n => n.id === line.fromNodeId);
      const toNode = this.nodes.find(n => n.id === line.toNodeId);

      if (!fromNode || !toNode) continue;

      const distance = this.pointToLineDistance(
        worldPoint,
        { x: fromNode.x, y: fromNode.y },
        { x: toNode.x, y: toNode.y }
      );

      if (distance <= tolerance) {
        return {
          type: 'line',
          id: line.id,
          element: line,
          worldPoint
        };
      }
    }

    return null;
  }

  private hitTestZoneVertices(worldPoint: Vec2, scale: number): HitTestResult | null {
    // Zone vertex radius in world coordinates
    const hitRadius = ZONE_VERTEX_RADIUS;

    for (const zone of this.zones) {
      for (let i = 0; i < zone.points.length; i++) {
        const vertex = zone.points[i];
        const distance = this.pointDistance(worldPoint, vertex);

        if (distance <= hitRadius) {
          return {
            type: 'zone-vertex',
            id: zone.id,
            element: zone,
            vertexIndex: i,
            worldPoint
          };
        }
      }
    }

    return null;
  }

  private hitTestZones(worldPoint: Vec2): HitTestResult | null {
    // Iterate in reverse to hit topmost first
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];

      if (this.isPointInPolygon(worldPoint, zone.points)) {
        return {
          type: 'zone',
          id: zone.id,
          element: zone,
          worldPoint
        };
      }
    }

    return null;
  }

  // ============================================================================
  // Geometry Algorithms
  // ============================================================================

  /**
   * Calculate distance between two points
   */
  private pointDistance(p1: Vec2, p2: Vec2): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToLineDistance(point: Vec2, lineStart: Vec2, lineEnd: Vec2): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    // Handle zero-length line
    if (lenSq === 0) {
      return this.pointDistance(point, lineStart);
    }

    // Parameter t represents position along line segment
    let t = dot / lenSq;

    // Clamp t to [0, 1] to stay on segment
    t = Math.max(0, Math.min(1, t));

    // Calculate closest point on line segment
    const closestX = lineStart.x + t * C;
    const closestY = lineStart.y + t * D;

    return this.pointDistance(point, { x: closestX, y: closestY });
  }

  /**
   * Check if point is inside polygon using ray casting algorithm
   */
  private isPointInPolygon(point: Vec2, vertices: Point[]): boolean {
    if (vertices.length < 3) return false;

    let inside = false;
    const n = vertices.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;

      // Check if ray from point intersects with edge
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate center of polygon
   */
  private getPolygonCenter(vertices: Point[]): Vec2 {
    if (vertices.length === 0) return { x: 0, y: 0 };

    let sumX = 0;
    let sumY = 0;

    for (const v of vertices) {
      sumX += v.x;
      sumY += v.y;
    }

    return {
      x: sumX / vertices.length,
      y: sumY / vertices.length
    };
  }

  /**
   * Check if point is inside circle
   */
  isPointInCircle(point: Vec2, center: Vec2, radius: number): boolean {
    return this.pointDistance(point, center) <= radius;
  }

  /**
   * Get bounding box of points
   */
  getBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (points.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, minY, maxX, maxY };
  }
}
