/**
 * Robot Renderer - Draws robot icons with status, battery, and direction
 */

import { RenderContext, ElementState, Vec2 } from '../core/canvas-types';
import { AnimatedRobotState, getRobotStatusColor, getBatteryColor } from '../../../../models/robot-realtime.models';
import {
  ROBOT_SIZE,
  COLOR_SELECTION,
  COLOR_SELECTION_GLOW,
  COLOR_HOVER_GLOW,
  ROBOT_STATUS_COLORS
} from '../core/constants';
import { AnimationEngineService } from '../animation/animation-engine.service';

export interface RobotRenderData {
  robot: AnimatedRobotState;
  position: Vec2;
  orientation: number;  // Interpolated orientation in degrees
  state: ElementState;
}

export class RobotRenderer {
  private pulsePhase = 0;

  constructor(private animationEngine: AnimationEngineService) {}

  /**
   * Update pulse animation phase
   */
  updatePulse(deltaTime: number): void {
    this.pulsePhase = (this.pulsePhase + deltaTime * 2) % (Math.PI * 2);
  }

  /**
   * Render all robots
   */
  render(context: RenderContext, robots: RobotRenderData[]): void {
    const { ctx, viewport } = context;

    // Update pulse animation
    this.updatePulse(context.deltaTime);

    for (const robotData of robots) {
      this.renderRobot(ctx, robotData, viewport.scale);
    }
  }

  /**
   * Render a single robot
   */
  private renderRobot(
    ctx: CanvasRenderingContext2D,
    robotData: RobotRenderData,
    viewportScale: number
  ): void {
    const { robot, position, orientation, state } = robotData;

    // Get animation values
    const anim = this.animationEngine.getRenderValues(robot.robotId);
    const animScale = anim.scale;
    const opacity = anim.opacity;
    const glowIntensity = anim.glow;

    if (opacity <= 0) return;

    ctx.save();

    // Apply position
    ctx.translate(position.x + anim.offsetX, position.y + anim.offsetY);

    const size = ROBOT_SIZE;
    const halfSize = size / 2;

    // Draw glow for hover/selection
    if (glowIntensity > 0) {
      this.drawGlow(ctx, halfSize, glowIntensity, state);
    }

    // Draw status pulse for abnormal/warning states
    if (robot.robotStatus === 7 || robot.warningLevel > 0) {
      this.drawStatusPulse(ctx, halfSize, robot.robotStatus);
    }

    // Apply scale
    ctx.scale(animScale, animScale);
    ctx.globalAlpha = opacity;

    // Draw robot body (circle)
    const statusColor = getRobotStatusColor(robot.robotStatus);
    ctx.beginPath();
    ctx.arc(0, 0, halfSize - 2, 0, Math.PI * 2);
    ctx.fillStyle = statusColor;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = state === 'selected' ? COLOR_SELECTION : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = state === 'selected' ? 3 : 2;
    ctx.stroke();

    // Draw direction indicator (use interpolated orientation for smooth rotation)
    this.drawDirectionIndicator(ctx, orientation, halfSize);

    // Draw battery indicator
    this.drawBatteryIndicator(ctx, robot, halfSize);

    // Draw robot ID label
    this.drawLabel(ctx, robot.robotId, halfSize);

    ctx.restore();
  }

  /**
   * Draw glow effect
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

    ctx.fillStyle = gradient;
    ctx.globalAlpha = intensity;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /**
   * Draw pulsing ring for warning/abnormal status
   */
  private drawStatusPulse(
    ctx: CanvasRenderingContext2D,
    radius: number,
    status: number
  ): void {
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
    const pulseOpacity = 0.3 + Math.sin(this.pulsePhase) * 0.2;

    const color = status === 7 ? '#f44336' : '#ff9800'; // Red for abnormal, orange for warning

    ctx.save();
    ctx.scale(pulseScale, pulseScale);
    ctx.globalAlpha = pulseOpacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw direction arrow
   */
  private drawDirectionIndicator(
    ctx: CanvasRenderingContext2D,
    orientation: number,
    radius: number
  ): void {
    const angleRad = (orientation * Math.PI) / 180;

    ctx.save();
    ctx.rotate(angleRad);

    // Draw arrow pointing in direction
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(radius - 4, 0);
    ctx.lineTo(radius - 12, -6);
    ctx.lineTo(radius - 10, 0);
    ctx.lineTo(radius - 12, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw battery indicator
   */
  private drawBatteryIndicator(
    ctx: CanvasRenderingContext2D,
    robot: AnimatedRobotState,
    radius: number
  ): void {
    const battery = robot.batteryLevel ?? 0;
    const isCharging = robot.batteryIsCharging ?? false;

    // Battery bar dimensions
    const barWidth = radius * 1.2;
    const barHeight = 6;
    const barX = -barWidth / 2;
    const barY = radius - 2;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // Battery level
    const fillWidth = (barWidth * battery) / 100;
    const batteryColor = getBatteryColor(battery, isCharging);
    ctx.fillStyle = batteryColor;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Charging indicator
    if (isCharging) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, barY + barHeight / 2);
    }
  }

  /**
   * Draw robot ID label
   */
  private drawLabel(
    ctx: CanvasRenderingContext2D,
    robotId: string,
    radius: number
  ): void {
    // Truncate long IDs
    const displayId = robotId.length > 8
      ? robotId.substring(robotId.length - 6)
      : robotId;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText(displayId, 0, -2);
    ctx.shadowBlur = 0;
  }

  /**
   * Get status color for robot
   */
  static getStatusColor(status: number): string {
    return ROBOT_STATUS_COLORS[status] || ROBOT_STATUS_COLORS[0];
  }
}
