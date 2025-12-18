import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ConfigService } from './config.service';
import {
  RobotPositionDto,
  RobotPositionUpdateDto,
  AnimatedRobotState
} from '../models/robot-realtime.models';

@Injectable({
  providedIn: 'root'
})
export class RobotRealtimeSignalRService implements OnDestroy {
  private config = inject(ConfigService);
  private hubConnection: signalR.HubConnection | null = null;

  private get HUB_URL(): string {
    return this.config.apiUrl + '/hubs/robot-realtime';
  }

  // Signals for reactive updates
  public robotPositions = signal<Map<string, AnimatedRobotState>>(new Map());
  public connectionState = signal<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  public lastUpdateTime = signal<Date | null>(null);

  // Current subscription
  private currentMapCode: string | null = null;
  private currentFloorNumber: string | null = null;

  // Animation
  private animationFrameId: number | null = null;
  private readonly INTERPOLATION_DURATION_MS = 1000; // Match polling interval

  constructor() {}

  ngOnDestroy(): void {
    this.stopConnection();
    this.stopAnimation();
  }

  /**
   * Start SignalR connection and subscribe to a specific map/floor
   */
  public async connect(mapCode?: string, floorNumber?: string): Promise<void> {
    // Store subscription params
    this.currentMapCode = mapCode ?? null;
    this.currentFloorNumber = floorNumber ?? null;

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      // Already connected, just update subscription
      await this.updateSubscription();
      return;
    }

    this.connectionState.set('connecting');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < 4) {
            return Math.pow(2, retryContext.previousRetryCount) * 1000;
          }
          return 10000;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerEventHandlers();

    try {
      await this.hubConnection.start();
      this.connectionState.set('connected');
      await this.updateSubscription();
      this.startAnimation();
      console.log('Connected to robot realtime hub');
    } catch (err) {
      console.error('Failed to connect to robot realtime hub:', err);
      this.connectionState.set('error');
    }
  }

  /**
   * Stop SignalR connection
   */
  public async stopConnection(): Promise<void> {
    this.stopAnimation();
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionState.set('disconnected');
    }
    this.robotPositions.set(new Map());
  }

  /**
   * Change map/floor subscription
   */
  public async subscribeToMap(mapCode?: string, floorNumber?: string): Promise<void> {
    // Unsubscribe from current
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('UnsubscribeFromMap',
          this.currentMapCode, this.currentFloorNumber);
      } catch (err) {
        console.warn('Failed to unsubscribe from previous map:', err);
      }
    }

    this.currentMapCode = mapCode ?? null;
    this.currentFloorNumber = floorNumber ?? null;

    await this.updateSubscription();

    // Clear current positions when changing maps
    this.robotPositions.set(new Map());
  }

  private async updateSubscription(): Promise<void> {
    if (this.hubConnection?.state !== signalR.HubConnectionState.Connected) return;

    try {
      await this.hubConnection.invoke('SubscribeToMap',
        this.currentMapCode, this.currentFloorNumber);

      console.log(`Subscribed to robot updates: mapCode=${this.currentMapCode}, floorNumber=${this.currentFloorNumber}`);
    } catch (err) {
      console.error('Failed to subscribe to map:', err);
    }
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    // Robot positions update event
    this.hubConnection.on('RobotPositionsUpdated', (update: RobotPositionUpdateDto) => {
      this.handleRobotUpdate(update);
    });

    // Connection lifecycle
    this.hubConnection.onreconnecting(() => {
      this.connectionState.set('connecting');
      console.log('Reconnecting to robot realtime hub...');
    });

    this.hubConnection.onreconnected(async () => {
      this.connectionState.set('connected');
      await this.updateSubscription();
      console.log('Reconnected to robot realtime hub');
    });

    this.hubConnection.onclose(() => {
      this.connectionState.set('disconnected');
      this.stopAnimation();
      console.log('Disconnected from robot realtime hub');
    });
  }

  private handleRobotUpdate(update: RobotPositionUpdateDto): void {
    const currentPositions = new Map(this.robotPositions());
    const now = performance.now();

    for (const robot of update.robots) {
      const existing = currentPositions.get(robot.robotId);

      if (existing) {
        // Update existing robot - set current to previous target for smooth transition
        existing.currentX = existing.currentX + (existing.targetX - existing.currentX) * existing.interpolationProgress;
        existing.currentY = existing.currentY + (existing.targetY - existing.currentY) * existing.interpolationProgress;
        existing.currentOrientation = this.interpolateAngle(
          existing.currentOrientation,
          existing.targetOrientation,
          existing.interpolationProgress
        );
        existing.targetX = robot.xCoordinate;
        existing.targetY = robot.yCoordinate;
        existing.targetOrientation = robot.robotOrientation;
        existing.robotStatus = robot.robotStatus;
        existing.robotStatusText = robot.robotStatusText;
        existing.batteryLevel = robot.batteryLevel;
        existing.batteryIsCharging = robot.batteryIsCharging;
        existing.robotTypeCode = robot.robotTypeCode;
        existing.connectionState = robot.connectionState;
        existing.warningLevel = robot.warningLevel;
        existing.velocity = robot.velocity;
        existing.lastUpdateTime = now;
        existing.interpolationProgress = 0;
      } else {
        // New robot
        currentPositions.set(robot.robotId, {
          robotId: robot.robotId,
          currentX: robot.xCoordinate,
          currentY: robot.yCoordinate,
          targetX: robot.xCoordinate,
          targetY: robot.yCoordinate,
          currentOrientation: robot.robotOrientation,
          targetOrientation: robot.robotOrientation,
          robotStatus: robot.robotStatus,
          robotStatusText: robot.robotStatusText,
          batteryLevel: robot.batteryLevel,
          batteryIsCharging: robot.batteryIsCharging,
          robotTypeCode: robot.robotTypeCode,
          connectionState: robot.connectionState,
          warningLevel: robot.warningLevel,
          velocity: robot.velocity,
          lastUpdateTime: now,
          interpolationProgress: 1
        });
      }
    }

    this.robotPositions.set(currentPositions);
    this.lastUpdateTime.set(new Date(update.serverTimestamp));
  }

  /**
   * Animation loop for smooth interpolation
   */
  private startAnimation(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      this.updateInterpolation();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateInterpolation(): void {
    const now = performance.now();
    const positions = this.robotPositions();
    let hasChanges = false;

    positions.forEach((robot) => {
      if (robot.interpolationProgress < 1) {
        const elapsed = now - robot.lastUpdateTime;
        robot.interpolationProgress = Math.min(1, elapsed / this.INTERPOLATION_DURATION_MS);
        hasChanges = true;
      }
    });

    // Only trigger signal update if there are active interpolations
    if (hasChanges) {
      this.robotPositions.set(new Map(positions));
    }
  }

  /**
   * Interpolate between two angles, handling wraparound
   */
  private interpolateAngle(from: number, to: number, progress: number): number {
    let diff = to - from;

    // Handle wraparound (e.g., 350 -> 10 should go through 360, not backwards)
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    return from + diff * progress;
  }

  /**
   * Get current interpolated position for a robot
   */
  public getInterpolatedPosition(robotId: string): { x: number; y: number; orientation: number } | null {
    const robot = this.robotPositions().get(robotId);
    if (!robot) return null;

    const progress = robot.interpolationProgress;
    return {
      x: robot.currentX + (robot.targetX - robot.currentX) * progress,
      y: robot.currentY + (robot.targetY - robot.currentY) * progress,
      orientation: this.interpolateAngle(robot.currentOrientation, robot.targetOrientation, progress)
    };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }
}
