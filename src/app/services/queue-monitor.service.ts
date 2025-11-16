import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MissionQueueStatusResponse,
  MapCodeQueueResponse,
  QueueStatisticsResponse,
  RobotCurrentJobResponse,
  CancelQueueItemResponse,
  QueueItemStatusDto,
  MissionQueueItem,
  CancelJobRequest,
  UpdateStatusRequest,
  MissionQueueStatus
} from '../models/missions.models';

@Injectable({
  providedIn: 'root'
})
export class QueueMonitorService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly QUEUE_ENDPOINT = '/queue';
  private readonly MISSION_QUEUE_ENDPOINT = '/mission-queue';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isCancelling = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);

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

  // =============================================================================
  // QUEUE CONTROLLER ENDPOINTS (/api/queue)
  // =============================================================================

  /**
   * Get mission status - all queue items for a specific mission code
   * GET /api/queue/status/{missionCode}
   */
  getMissionStatus(missionCode: string): Observable<MissionQueueStatusResponse> {
    this.isLoading.set(true);

    return this.http.get<MissionQueueStatusResponse>(
      `${this.API_URL}${this.QUEUE_ENDPOINT}/status/${encodeURIComponent(missionCode)}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, `Failed to load status for mission ${missionCode}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queue items for a specific map code
   * GET /api/queue/mapcode/{mapCode}
   */
  getMapCodeQueue(mapCode: string, status?: string, limit: number = 100): Observable<MapCodeQueueResponse> {
    this.isLoading.set(true);

    let url = `${this.API_URL}${this.QUEUE_ENDPOINT}/mapcode/${encodeURIComponent(mapCode)}?limit=${limit}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }

    return this.http.get<MapCodeQueueResponse>(
      url,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, `Failed to load queue for map ${mapCode}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queue statistics across all maps
   * GET /api/queue/statistics
   */
  getQueueStatistics(): Observable<QueueStatisticsResponse> {
    this.isLoading.set(true);

    return this.http.get<QueueStatisticsResponse>(
      `${this.API_URL}${this.QUEUE_ENDPOINT}/statistics`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load queue statistics');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current job assigned to a robot
   * GET /api/queue/robot/{robotId}/current
   */
  getRobotCurrentJob(robotId: string): Observable<RobotCurrentJobResponse> {
    this.isLoading.set(true);

    return this.http.get<RobotCurrentJobResponse>(
      `${this.API_URL}${this.QUEUE_ENDPOINT}/robot/${encodeURIComponent(robotId)}/current`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, `Failed to load current job for robot ${robotId}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancel a queue item
   * POST /api/queue/{queueItemId}/cancel
   */
  cancelQueueItem(queueItemId: number): Observable<CancelQueueItemResponse> {
    this.isCancelling.set(true);

    return this.http.post<CancelQueueItemResponse>(
      `${this.API_URL}${this.QUEUE_ENDPOINT}/${queueItemId}/cancel`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      tap((response) => {
        this.isCancelling.set(false);
        if (response.success) {
          this.showSuccessMessage(response.message || 'Queue item cancelled successfully');
        } else {
          this.showErrorMessage(response.message || 'Failed to cancel queue item');
        }
      }),
      catchError(error => {
        this.isCancelling.set(false);
        this.handleError(error, 'Failed to cancel queue item');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queue item by ID
   * GET /api/queue/{queueItemId}
   */
  getQueueItemById(queueItemId: number): Observable<QueueItemStatusDto> {
    this.isLoading.set(true);

    return this.http.get<QueueItemStatusDto>(
      `${this.API_URL}${this.QUEUE_ENDPOINT}/${queueItemId}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, `Failed to load queue item ${queueItemId}`);
        return throwError(() => error);
      })
    );
  }

  // =============================================================================
  // MISSION QUEUE CONTROLLER ENDPOINTS (/api/mission-queue)
  // =============================================================================

  /**
   * Get all pending jobs for a specific map code
   * GET /api/mission-queue/pending/{mapCode}
   */
  getPendingJobs(mapCode: string, limit: number = 100): Observable<MissionQueueItem[]> {
    this.isLoading.set(true);

    return this.http.get<MissionQueueItem[]>(
      `${this.API_URL}${this.MISSION_QUEUE_ENDPOINT}/pending/${encodeURIComponent(mapCode)}?limit=${limit}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, `Failed to load pending jobs for map ${mapCode}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queue item by ID (from mission-queue controller)
   * GET /api/mission-queue/{queueItemId}
   */
  getMissionQueueItemById(queueItemId: number): Observable<MissionQueueItem> {
    this.isLoading.set(true);

    return this.http.get<MissionQueueItem>(
      `${this.API_URL}${this.MISSION_QUEUE_ENDPOINT}/${queueItemId}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, `Failed to load queue item ${queueItemId}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queue item by mission code
   * GET /api/mission-queue/by-mission/{missionCode}
   */
  getQueueItemByMissionCode(missionCode: string): Observable<MissionQueueItem> {
    this.isLoading.set(true);

    return this.http.get<MissionQueueItem>(
      `${this.API_URL}${this.MISSION_QUEUE_ENDPOINT}/by-mission/${encodeURIComponent(missionCode)}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, `Failed to load queue item for mission ${missionCode}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancel a job
   * POST /api/mission-queue/{queueItemId}/cancel
   */
  cancelJob(queueItemId: number, reason?: string): Observable<any> {
    this.isCancelling.set(true);

    const request: CancelJobRequest = { reason };

    return this.http.post<any>(
      `${this.API_URL}${this.MISSION_QUEUE_ENDPOINT}/${queueItemId}/cancel`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isCancelling.set(false);
        this.showSuccessMessage('Job cancelled successfully');
      }),
      catchError(error => {
        this.isCancelling.set(false);
        this.handleError(error, 'Failed to cancel job');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update job status (for testing/debugging)
   * POST /api/mission-queue/{queueItemId}/status
   */
  updateJobStatus(queueItemId: number, status: MissionQueueStatus): Observable<any> {
    this.isUpdating.set(true);

    const request: UpdateStatusRequest = { status };

    return this.http.post<any>(
      `${this.API_URL}${this.MISSION_QUEUE_ENDPOINT}/${queueItemId}/status`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isUpdating.set(false);
        this.showSuccessMessage(`Job status updated to ${status}`);
      }),
      catchError(error => {
        this.isUpdating.set(false);
        this.handleError(error, 'Failed to update job status');
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    if (error.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
      localStorage.removeItem('auth_token');
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status === 409) {
      errorMessage = 'A conflict occurred. The request could not be completed.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message || error.error?.msg) {
      errorMessage = error.error.message || error.error.msg;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('Queue Monitor Service Error:', error);
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
