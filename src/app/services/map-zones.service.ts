import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MapZoneSummaryDto,
  MapZoneSyncResultDto,
  MapZoneDisplayData,
  getAreaPurpose,
  getZoneStatusText
} from '../models/map-zone.models';

@Injectable({
  providedIn: 'root'
})
export class MapZonesService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly MAP_ZONES_ENDPOINT = '/MapZones';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public lastSyncResult = signal<MapZoneSyncResultDto | null>(null);

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
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
            createdDate: '', // Will be populated if backend provides it
            updatedDate: ''  // Will be populated if backend provides it
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
        this.snackBar.open(message, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
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

    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });

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
}