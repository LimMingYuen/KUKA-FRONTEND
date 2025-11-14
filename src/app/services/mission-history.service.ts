import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MissionHistorySummaryDto,
  MissionHistoryRequest,
  MissionHistoryCountResponse,
  MissionHistoryDisplayData,
  transformMissionHistoryForDisplay
} from '../models/mission-history.models';

@Injectable({
  providedIn: 'root'
})
export class MissionHistoryService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly MISSION_HISTORY_ENDPOINT = '/mission-history';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isClearing = signal<boolean>(false);
  public missionCount = signal<number>(0);
  public maxRecords = signal<number>(5000);

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
   * Get all mission history from the API
   */
  getMissionHistory(): Observable<MissionHistoryDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<MissionHistorySummaryDto[]>(
      `${this.API_URL}${this.MISSION_HISTORY_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(missions => {
        // Transform for display (API already returns in descending order by CreatedDate)
        const transformedMissions = transformMissionHistoryForDisplay(missions);
        return transformedMissions;
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load mission history');
        return throwError(() => error);
      })
    );
  }

  /**
   * Add new mission history record
   */
  addMissionHistory(request: MissionHistoryRequest): Observable<MissionHistoryDisplayData> {
    return this.http.post<MissionHistorySummaryDto>(
      `${this.API_URL}${this.MISSION_HISTORY_ENDPOINT}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(mission => transformMissionHistoryForDisplay([mission])[0]),
      tap(() => {
        this.showSuccessMessage('Mission history record added successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to add mission history record');
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear all mission history records
   */
  clearMissionHistory(): Observable<{ message: string }> {
    this.isClearing.set(true);

    return this.http.delete<{ message: string }>(
      `${this.API_URL}${this.MISSION_HISTORY_ENDPOINT}/clear`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isClearing.set(false);
        this.showSuccessMessage('Mission history cleared successfully');
      }),
      catchError(error => {
        this.isClearing.set(false);
        this.handleError(error, 'Failed to clear mission history');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get mission history count and max records
   */
  getMissionHistoryCount(): Observable<MissionHistoryCountResponse> {
    return this.http.get<MissionHistoryCountResponse>(
      `${this.API_URL}${this.MISSION_HISTORY_ENDPOINT}/count`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(response => {
        this.missionCount.set(response.count);
        this.maxRecords.set(response.maxRecords);
      }),
      catchError(error => {
        this.handleError(error, 'Failed to get mission history count');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get mission history by ID (for view operations)
   */
  getMissionHistoryById(id: number): Observable<MissionHistoryDisplayData> {
    return this.http.get<MissionHistorySummaryDto[]>(
      `${this.API_URL}${this.MISSION_HISTORY_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(missions => {
        const mission = missions.find(m => m.id === id);
        if (!mission) {
          throw new Error(`Mission history record with ID ${id} not found`);
        }
        return transformMissionHistoryForDisplay([mission])[0];
      }),
      catchError(error => {
        this.handleError(error, 'Failed to load mission history details');
        return throwError(() => error);
      })
    );
  }

  /**
   * Export mission history data
   */
  exportMissionHistory(): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}${this.MISSION_HISTORY_ENDPOINT}/export`,
      {
        headers: this.createHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('Mission history exported successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to export mission history');
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if mission history is approaching the limit
   */
  checkStorageLimit(): boolean {
    const count = this.missionCount();
    const max = this.maxRecords();
    return count >= (max * 0.9); // 90% threshold
  }

  /**
   * Get storage usage percentage
   */
  getStorageUsagePercentage(): number {
    const count = this.missionCount();
    const max = this.maxRecords();
    return Math.round((count / max) * 100);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    if (error.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
      // You might want to redirect to login or clear the token
      localStorage.removeItem('auth_token');
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested mission history resource was not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('Mission History Service Error:', error);
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 8000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}