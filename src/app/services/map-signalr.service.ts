import { Injectable, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MapRealtimeData } from '../models/warehouse-map.models';

/**
 * SignalR service for real-time map updates
 */
@Injectable({
  providedIn: 'root',
})
export class MapSignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | null = null;
  private readonly HUB_URL = 'http://localhost:5109/hubs/map';

  // Signals to notify components of updates
  public robotPositionsUpdated = signal<MapRealtimeData | null>(null);
  public connectionState = signal<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected'
  );

  // Current floor subscription
  private currentFloor: string | null = null;
  private currentMapCode: string | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  constructor() {
    // Don't auto-connect - let component control when to connect
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }

  /**
   * Start SignalR connection
   */
  public async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('MapSignalR: Already connected');
      return;
    }

    this.connectionState.set('connecting');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Exponential backoff: 0s, 2s, 4s, 8s, then every 10s
          if (retryContext.previousRetryCount < 4) {
            return Math.pow(2, retryContext.previousRetryCount) * 1000;
          }
          return 10000;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register event handlers
    this.registerEventHandlers();

    try {
      await this.hubConnection.start();
      console.log('MapSignalR: Connected to MapHub');
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;

      // Rejoin floor if we were subscribed before reconnection
      if (this.currentFloor) {
        await this.joinFloor(this.currentFloor, this.currentMapCode ?? undefined);
      }
    } catch (err) {
      console.error('MapSignalR: Connection failed', err);
      this.connectionState.set('error');
      this.attemptReconnect();
    }
  }

  /**
   * Stop SignalR connection
   */
  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      // Leave current floor before disconnecting
      if (this.currentFloor) {
        try {
          await this.leaveFloor(this.currentFloor, this.currentMapCode ?? undefined);
        } catch {
          // Ignore errors when leaving
        }
      }

      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionState.set('disconnected');
      this.currentFloor = null;
      this.currentMapCode = null;
      console.log('MapSignalR: Disconnected');
    }
  }

  /**
   * Join a floor group to receive updates for that floor
   */
  public async joinFloor(floorNumber: string, mapCode?: string): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('MapSignalR: Cannot join floor - not connected');
      return;
    }

    // Leave previous floor if different
    if (this.currentFloor && (this.currentFloor !== floorNumber || this.currentMapCode !== mapCode)) {
      await this.leaveFloor(this.currentFloor, this.currentMapCode ?? undefined);
    }

    try {
      await this.hubConnection.invoke('JoinFloor', floorNumber, mapCode ?? null);
      this.currentFloor = floorNumber;
      this.currentMapCode = mapCode ?? null;
      console.log(`MapSignalR: Joined floor ${floorNumber}${mapCode ? ' map ' + mapCode : ''}`);
    } catch (err) {
      console.error('MapSignalR: Failed to join floor', err);
    }
  }

  /**
   * Leave a floor group
   */
  public async leaveFloor(floorNumber: string, mapCode?: string): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.hubConnection.invoke('LeaveFloor', floorNumber, mapCode ?? null);
      console.log(`MapSignalR: Left floor ${floorNumber}${mapCode ? ' map ' + mapCode : ''}`);
    } catch (err) {
      console.error('MapSignalR: Failed to leave floor', err);
    }

    if (this.currentFloor === floorNumber) {
      this.currentFloor = null;
      this.currentMapCode = null;
    }
  }

  /**
   * Register event handlers for hub messages
   */
  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    // Robot positions updated event
    this.hubConnection.on('RobotPositionsUpdated', (data: MapRealtimeData) => {
      console.log('MapSignalR: RobotPositionsUpdated received', {
        robots: data.robots?.length ?? 0,
        containers: data.containers?.length ?? 0,
      });
      this.robotPositionsUpdated.set(data);
    });

    // Connection lifecycle events
    this.hubConnection.onreconnecting(error => {
      console.warn('MapSignalR: Reconnecting...', error);
      this.connectionState.set('connecting');
    });

    this.hubConnection.onreconnected(connectionId => {
      console.log('MapSignalR: Reconnected', connectionId);
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;

      // Rejoin floor after reconnection
      if (this.currentFloor) {
        this.joinFloor(this.currentFloor, this.currentMapCode ?? undefined);
      }
    });

    this.hubConnection.onclose(error => {
      console.warn('MapSignalR: Connection closed', error);
      this.connectionState.set('disconnected');
      this.attemptReconnect();
    });
  }

  /**
   * Attempt to reconnect after connection failure
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('MapSignalR: Max reconnection attempts reached');
      this.connectionState.set('error');
      return;
    }

    this.reconnectAttempts++;
    console.log(`MapSignalR: Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.startConnection();
    }, this.reconnectInterval);
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Get current subscribed floor
   */
  public getCurrentFloor(): { floorNumber: string; mapCode: string | null } | null {
    if (!this.currentFloor) return null;
    return {
      floorNumber: this.currentFloor,
      mapCode: this.currentMapCode,
    };
  }
}
