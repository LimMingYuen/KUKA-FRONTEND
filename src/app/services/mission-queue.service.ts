import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MissionQueueDto,
  MissionQueueDisplayData,
  MissionQueueStatistics,
  AddToQueueRequest,
  ChangePriorityRequest,
  transformQueueItem,
  transformQueueItems
} from '../models/mission-queue.models';

/**
 * API Response wrapper interface
 */
interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class MissionQueueService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly ENDPOINT = '/MissionQueue';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public statistics = signal<MissionQueueStatistics | null>(null);
  public queueItems = signal<MissionQueueDisplayData[]>([]);

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
   * Get all queue items
   */
  getAllQueueItems(): Observable<MissionQueueDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<ApiResponse<MissionQueueDto[]>>(
      `${this.API_URL}${this.ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        const items = response.data || [];
        return transformQueueItems(items);
      }),
      tap(items => {
        this.queueItems.set(items);
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load queue items');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queued items only (status = Queued or Processing)
   */
  getQueuedItems(): Observable<MissionQueueDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<ApiResponse<MissionQueueDto[]>>(
      `${this.API_URL}${this.ENDPOINT}/queued`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        const items = response.data || [];
        return transformQueueItems(items);
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load queued items');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queue item by ID
   */
  getById(id: number): Observable<MissionQueueDisplayData> {
    return this.http.get<ApiResponse<MissionQueueDto>>(
      `${this.API_URL}${this.ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.data) {
          throw new Error('Queue item not found');
        }
        return transformQueueItem(response.data);
      }),
      catchError(error => {
        this.handleError(error, `Failed to load queue item ${id}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get queue statistics
   */
  getStatistics(): Observable<MissionQueueStatistics> {
    return this.http.get<ApiResponse<MissionQueueStatistics>>(
      `${this.API_URL}${this.ENDPOINT}/statistics`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.data) {
          throw new Error('Failed to get statistics');
        }
        return response.data;
      }),
      tap(stats => {
        this.statistics.set(stats);
      }),
      catchError(error => {
        this.handleError(error, 'Failed to load queue statistics');
        return throwError(() => error);
      })
    );
  }

  /**
   * Add mission to queue
   */
  addToQueue(request: AddToQueueRequest): Observable<MissionQueueDisplayData> {
    this.isLoading.set(true);

    return this.http.post<ApiResponse<MissionQueueDto>>(
      `${this.API_URL}${this.ENDPOINT}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.data) {
          throw new Error('Failed to add to queue');
        }
        return transformQueueItem(response.data);
      }),
      tap(item => {
        this.isLoading.set(false);
        this.showSuccessMessage(`Mission added to queue at position ${item.queuePosition}`);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to add mission to queue');
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancel a queued mission
   */
  cancel(id: number): Observable<void> {
    return this.http.delete<ApiResponse<object>>(
      `${this.API_URL}${this.ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(() => undefined),
      tap(() => {
        this.showSuccessMessage('Queue item cancelled successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to cancel queue item');
        return throwError(() => error);
      })
    );
  }

  /**
   * Retry a failed mission
   */
  retry(id: number): Observable<MissionQueueDisplayData> {
    return this.http.post<ApiResponse<MissionQueueDto>>(
      `${this.API_URL}${this.ENDPOINT}/${id}/retry`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.data) {
          throw new Error('Failed to retry mission');
        }
        return transformQueueItem(response.data);
      }),
      tap(item => {
        this.showSuccessMessage(`Mission queued for retry (attempt ${item.retryCount})`);
      }),
      catchError(error => {
        this.handleError(error, 'Failed to retry queue item');
        return throwError(() => error);
      })
    );
  }

  /**
   * Move queue item up (increase priority)
   */
  moveUp(id: number): Observable<void> {
    return this.http.post<ApiResponse<object>>(
      `${this.API_URL}${this.ENDPOINT}/${id}/move-up`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      map(() => undefined),
      tap(() => {
        this.showSuccessMessage('Queue item moved up');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to move queue item up');
        return throwError(() => error);
      })
    );
  }

  /**
   * Move queue item down (decrease priority)
   */
  moveDown(id: number): Observable<void> {
    return this.http.post<ApiResponse<object>>(
      `${this.API_URL}${this.ENDPOINT}/${id}/move-down`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      map(() => undefined),
      tap(() => {
        this.showSuccessMessage('Queue item moved down');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to move queue item down');
        return throwError(() => error);
      })
    );
  }

  /**
   * Change queue item priority
   */
  changePriority(id: number, priority: number): Observable<MissionQueueDisplayData> {
    const request: ChangePriorityRequest = { priority };

    return this.http.put<ApiResponse<MissionQueueDto>>(
      `${this.API_URL}${this.ENDPOINT}/${id}/priority`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.data) {
          throw new Error('Failed to change priority');
        }
        return transformQueueItem(response.data);
      }),
      tap(() => {
        this.showSuccessMessage(`Priority changed to ${priority}`);
      }),
      catchError(error => {
        this.handleError(error, 'Failed to change priority');
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh queue data (items and statistics)
   */
  refreshQueue(): void {
    this.getAllQueueItems().subscribe();
    this.getStatistics().subscribe();
  }

  /**
   * Handle HTTP errors and show user-friendly messages
   */
  private handleError(error: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    if (error.status === 401) {
      errorMessage = 'Authentication required. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to access the queue.';
    } else if (error.status === 404) {
      errorMessage = 'Queue item not found.';
    } else if (error.status === 400) {
      errorMessage = error.error?.msg || 'Invalid request.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('Mission Queue Service Error:', error);
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }
}
