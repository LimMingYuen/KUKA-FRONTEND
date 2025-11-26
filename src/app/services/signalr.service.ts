import { Injectable, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';

export interface MissionStatusChange {
  missionId: number;
  status: number;
  statusName: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | null = null;
  private readonly HUB_URL = 'http://localhost:5109/hubs/queue';

  // Signals to notify components of updates
  public queueUpdated = signal<boolean>(false);
  public missionStatusChanged = signal<MissionStatusChange | null>(null);
  public statisticsUpdated = signal<boolean>(false);
  public connectionState = signal<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  constructor() {
    this.startConnection();
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }

  /**
   * Start SignalR connection
   */
  public async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR: Already connected');
      return;
    }

    this.connectionState.set('connecting');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 4s, 8s, then every 10s
          if (retryContext.previousRetryCount < 4) {
            return Math.pow(2, retryContext.previousRetryCount) * 1000;
          }
          return 10000;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register event handlers
    this.registerEventHandlers();

    try {
      await this.hubConnection.start();
      console.log('SignalR: Connected to QueueHub');
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;
    } catch (err) {
      console.error('SignalR: Connection failed', err);
      this.connectionState.set('error');
      this.attemptReconnect();
    }
  }

  /**
   * Stop SignalR connection
   */
  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionState.set('disconnected');
      console.log('SignalR: Disconnected');
    }
  }

  /**
   * Register event handlers for hub messages
   */
  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    // Queue updated event
    this.hubConnection.on('QueueUpdated', () => {
      console.log('SignalR: QueueUpdated received');
      this.queueUpdated.set(true);
      // Reset after a short delay to allow re-triggering
      setTimeout(() => this.queueUpdated.set(false), 100);
    });

    // Mission status changed event
    this.hubConnection.on('MissionStatusChanged', (data: MissionStatusChange) => {
      console.log('SignalR: MissionStatusChanged received', data);
      this.missionStatusChanged.set(data);
    });

    // Statistics updated event
    this.hubConnection.on('StatisticsUpdated', () => {
      console.log('SignalR: StatisticsUpdated received');
      this.statisticsUpdated.set(true);
      setTimeout(() => this.statisticsUpdated.set(false), 100);
    });

    // Connection lifecycle events
    this.hubConnection.onreconnecting((error) => {
      console.warn('SignalR: Reconnecting...', error);
      this.connectionState.set('connecting');
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR: Reconnected', connectionId);
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;
    });

    this.hubConnection.onclose((error) => {
      console.warn('SignalR: Connection closed', error);
      this.connectionState.set('disconnected');
      this.attemptReconnect();
    });
  }

  /**
   * Attempt to reconnect after connection failure
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SignalR: Max reconnection attempts reached');
      this.connectionState.set('error');
      return;
    }

    this.reconnectAttempts++;
    console.log(`SignalR: Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

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
}
