import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MobileRobotSummaryDto,
  MobileRobotSyncResultDto,
  MobileRobotDisplayData,
  transformMobileRobotsForDisplay
} from '../models/mobile-robot.models';

@Injectable({
  providedIn: 'root'
})
export class MobileRobotsService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly MOBILE_ROBOTS_ENDPOINT = '/MobileRobot';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public lastSyncResult = signal<MobileRobotSyncResultDto | null>(null);

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
   * Get all mobile robots from the API
   */
  getMobileRobots(): Observable<MobileRobotDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<MobileRobotSummaryDto[]>(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(robots => {
        // Transform and sort by RobotId in ascending order
        const transformedRobots = transformMobileRobotsForDisplay(robots);
        return transformedRobots.sort((a, b) => a.robotId.localeCompare(b.robotId));
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load mobile robots');
        return throwError(() => error);
      })
    );
  }

  /**
   * Sync mobile robots from external API
   */
  syncMobileRobots(): Observable<MobileRobotSyncResultDto> {
    this.isSyncing.set(true);
    this.lastSyncResult.set(null);

    return this.http.post<MobileRobotSyncResultDto>(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}/sync`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      tap(result => {
        this.isSyncing.set(false);
        this.lastSyncResult.set(result);
        this.showSuccessMessage(
          `Mobile robots sync completed successfully. ` +
          `${result.inserted} new, ${result.updated} updated out of ${result.total} total.`
        );
      }),
      catchError(error => {
        this.isSyncing.set(false);
        this.handleError(error, 'Failed to sync mobile robots');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get mobile robot by ID (for view/edit operations)
   */
  getMobileRobotById(robotId: string): Observable<MobileRobotDisplayData> {
    return this.http.get<MobileRobotSummaryDto>(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}/${robotId}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(robot => transformMobileRobotsForDisplay([robot])[0]),
      catchError(error => {
        this.handleError(error, 'Failed to load mobile robot details');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get distinct robot types
   */
  getMobileRobotTypes(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}/types`,
      { headers: this.createHeaders() }
    ).pipe(
      catchError(error => {
        this.handleError(error, 'Failed to load robot types');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get mobile robots by type
   */
  getMobileRobotsByType(typeCode: string): Observable<MobileRobotDisplayData[]> {
    return this.http.get<MobileRobotSummaryDto[]>(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}/by-type/${typeCode}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(robots => {
        // Transform and sort by RobotId in ascending order
        const transformedRobots = transformMobileRobotsForDisplay(robots);
        return transformedRobots.sort((a, b) => a.robotId.localeCompare(b.robotId));
      }),
      catchError(error => {
        this.handleError(error, 'Failed to load mobile robots by type');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update mobile robot (for edit operations)
   */
  updateMobileRobot(robotId: string, robot: Partial<MobileRobotSummaryDto>): Observable<MobileRobotDisplayData> {
    return this.http.put<MobileRobotSummaryDto>(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}/${robotId}`,
      robot,
      { headers: this.createHeaders() }
    ).pipe(
      map(updatedRobot => transformMobileRobotsForDisplay([updatedRobot])[0]),
      tap(() => {
        this.showSuccessMessage('Mobile robot updated successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to update mobile robot');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete mobile robot
   */
  deleteMobileRobot(robotId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}/${robotId}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('Mobile robot deleted successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to delete mobile robot');
        return throwError(() => error);
      })
    );
  }

  /**
   * Export mobile robots data
   */
  exportMobileRobots(): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}${this.MOBILE_ROBOTS_ENDPOINT}/export`,
      {
        headers: this.createHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('Mobile robots exported successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to export mobile robots');
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear last sync result
   */
  clearSyncResult(): void {
    this.lastSyncResult.set(null);
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
      errorMessage = 'The requested mobile robot resource was not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('Mobile Robots Service Error:', error);
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