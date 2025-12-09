import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { NotificationService } from './notification.service';
import {
  MapZoneSummaryDto,
  MapZoneSyncResultDto,
  MapZoneDisplayData,
  MapZoneWithNodesDto,
  getAreaPurpose,
  getZoneStatusText
} from '../models/map-zone.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class MapZonesService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api';
  }
  private readonly MAP_ZONES_ENDPOINT = '/MapZones';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public lastSyncResult = signal<MapZoneSyncResultDto | null>(null);

  private notificationService = inject(NotificationService);

  constructor(
    private http: HttpClient
  ) {}

  /**
   * Get JWT token from localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Create HTTP headers with JWT authentication
   */
  private createHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get all map zones from the API
   */
  getMapZones(): Observable<MapZoneDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<MapZoneSummaryDto[]>(
      `${this.API_URL}${this.MAP_ZONES_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(mapZones => {
        // Transform map zone data to display format and sort by ID ascending
        return mapZones
          .map(mapZone => ({
            id: mapZone.id,
            name: mapZone.zoneName || 'Unnamed Zone',
            code: mapZone.zoneCode || 'N/A',
            layout: mapZone.layout || 'N/A',
            areaPurpose: mapZone.areaPurpose || getAreaPurpose('0'),
            status: mapZone.statusText === 'Enabled' ? 1 : 0,
            statusText: mapZone.statusText || 'Unknown',
            createdDate: this.formatDateTime(mapZone.createTime),
            updatedDate: this.formatDateTime(mapZone.lastUpdateTime)
          }))
          .sort((a, b) => a.id - b.id); // Sort by ID in ascending order
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load map zones');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all map zones with nodes (for categorization)
   */
  getMapZonesWithNodes(): Observable<MapZoneWithNodesDto[]> {
    return this.http.get<MapZoneWithNodesDto[]>(
      `${this.API_URL}${this.MAP_ZONES_ENDPOINT}/with-nodes`,
      { headers: this.createHeaders() }
    ).pipe(
      catchError(error => {
        this.handleError(error, 'Failed to load map zones with nodes');
        return throwError(() => error);
      })
    );
  }

  /**
   * Sync map zones from external API
   */
  syncMapZones(): Observable<MapZoneSyncResultDto> {
    this.isSyncing.set(true);

    return this.http.post<MapZoneSyncResultDto>(
      `${this.API_URL}${this.MAP_ZONES_ENDPOINT}/sync`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      tap(result => {
        this.isSyncing.set(false);
        this.lastSyncResult.set(result);

        // Show success message
        const message = `Sync completed: ${result.inserted} new, ${result.updated} updated, ${result.total} total`;
        this.notificationService.success(message);
      }),
      catchError(error => {
        this.isSyncing.set(false);
        this.handleError(error, 'Failed to sync map zones');
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle HTTP errors and show user-friendly messages
   */
  private handleError(error: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    if (error.status === 401) {
      errorMessage = 'Authentication required. Please log in again.';
      // Clear token and redirect to login might be needed here
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to access map zones.';
    } else if (error.status === 404) {
      errorMessage = 'Map zones service not found. Please contact administrator.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.error?.Message) {
      errorMessage = error.error.Message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.notificationService.error(errorMessage);

    console.error('Map zones service error:', error);
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  public isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Basic JWT token validation (check if token is properly formatted)
      const parts = token.split('.');
      return parts.length === 3;
    } catch {
      return false;
    }
  }

  /**
   * Clear last sync result
   */
  public clearSyncResult(): void {
    this.lastSyncResult.set(null);
  }

  /**
   * Format datetime string to display format
   */
  private formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return 'N/A';
    }
  }
}