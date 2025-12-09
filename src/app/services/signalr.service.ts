import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ConfigService } from './config.service';

export interface MissionStatusChange {
  missionId: number;
  status: number;
  statusName: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService implements OnDestroy {
  private config = inject(ConfigService);
  private hubConnection: signalR.HubConnection | null = null;
  private get HUB_URL(): string {
    return this.config.apiUrl + '/hubs/queue';
  }

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
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;
    } catch (err) {
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
    }
  }

  /**
   * Register event handlers for hub messages
   */
  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    // Queue updated event
    this.hubConnection.on('QueueUpdated', () => {
      this.queueUpdated.set(true);
      // Reset after a short delay to allow re-triggering
      setTimeout(() => this.queueUpdated.set(false), 100);
    });

    // Mission status changed event
    this.hubConnection.on('MissionStatusChanged', (data: MissionStatusChange) => {
      this.missionStatusChanged.set(data);
    });

    // Statistics updated event
    this.hubConnection.on('StatisticsUpdated', () => {
      this.statisticsUpdated.set(true);
      setTimeout(() => this.statisticsUpdated.set(false), 100);
    });

    // Connection lifecycle events
    this.hubConnection.onreconnecting((error) => {
      this.connectionState.set('connecting');
    });

    this.hubConnection.onreconnected((connectionId) => {
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;
    });

    this.hubConnection.onclose((error) => {
      this.connectionState.set('disconnected');
      this.attemptReconnect();
    });
  }

  /**
   * Attempt to reconnect after connection failure
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState.set('error');
      return;
    }

    this.reconnectAttempts++;

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
