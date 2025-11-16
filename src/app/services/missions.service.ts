import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SubmitMissionRequest,
  SubmitMissionResponse,
  SaveMissionAsTemplateRequest,
  SaveMissionAsTemplateResponse,
  MissionCancelRequest,
  MissionCancelResponse,
  JobQueryRequest,
  JobQueryResponse,
  OperationFeedbackRequest,
  OperationFeedbackResponse,
  RobotQueryRequest,
  RobotQueryResponse
} from '../models/missions.models';

@Injectable({
  providedIn: 'root'
})
export class MissionsService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly MISSIONS_ENDPOINT = '/missions';

  // Reactive state using Angular signals
  public isSubmitting = signal<boolean>(false);
  public isCancelling = signal<boolean>(false);
  public isQuerying = signal<boolean>(false);

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
   * Submit/Queue a mission
   * POST /api/missions/submit
   */
  submitMission(request: SubmitMissionRequest): Observable<SubmitMissionResponse> {
    this.isSubmitting.set(true);

    return this.http.post<SubmitMissionResponse>(
      `${this.API_URL}${this.MISSIONS_ENDPOINT}/submit`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap((response) => {
        this.isSubmitting.set(false);
        if (response.success) {
          this.showSuccessMessage(response.message || 'Mission submitted successfully');
        } else {
          this.showErrorMessage(response.message || 'Failed to submit mission');
        }
      }),
      catchError(error => {
        this.isSubmitting.set(false);
        this.handleError(error, 'Failed to submit mission');
        return throwError(() => error);
      })
    );
  }

  /**
   * Save mission as template
   * POST /api/missions/save-as-template
   */
  saveMissionAsTemplate(request: SaveMissionAsTemplateRequest): Observable<SaveMissionAsTemplateResponse> {
    this.isSubmitting.set(true);

    return this.http.post<SaveMissionAsTemplateResponse>(
      `${this.API_URL}${this.MISSIONS_ENDPOINT}/save-as-template`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap((response) => {
        this.isSubmitting.set(false);
        if (response.success) {
          this.showSuccessMessage(response.message || 'Mission saved as template successfully');
        } else {
          this.showErrorMessage(response.message || 'Failed to save mission as template');
        }
      }),
      catchError(error => {
        this.isSubmitting.set(false);
        this.handleError(error, 'Failed to save mission as template');
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancel a mission
   * POST /api/missions/cancel
   */
  cancelMission(request: MissionCancelRequest): Observable<MissionCancelResponse> {
    this.isCancelling.set(true);

    return this.http.post<MissionCancelResponse>(
      `${this.API_URL}${this.MISSIONS_ENDPOINT}/cancel`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap((response) => {
        this.isCancelling.set(false);
        if (response.success) {
          this.showSuccessMessage(response.message || 'Mission cancelled successfully');
        } else {
          this.showErrorMessage(response.message || 'Failed to cancel mission');
        }
      }),
      catchError(error => {
        this.isCancelling.set(false);
        this.handleError(error, 'Failed to cancel mission');
        return throwError(() => error);
      })
    );
  }

  /**
   * Query job status
   * POST /api/missions/jobs/query
   */
  queryJobs(request: JobQueryRequest): Observable<JobQueryResponse> {
    this.isQuerying.set(true);

    return this.http.post<JobQueryResponse>(
      `${this.API_URL}${this.MISSIONS_ENDPOINT}/jobs/query`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isQuerying.set(false);
      }),
      catchError(error => {
        this.isQuerying.set(false);
        this.handleError(error, 'Failed to query jobs');
        return throwError(() => error);
      })
    );
  }

  /**
   * Send operation feedback
   * POST /api/missions/operation-feedback
   */
  sendOperationFeedback(request: OperationFeedbackRequest): Observable<OperationFeedbackResponse> {
    return this.http.post<OperationFeedbackResponse>(
      `${this.API_URL}${this.MISSIONS_ENDPOINT}/operation-feedback`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap((response) => {
        if (response.success) {
          this.showSuccessMessage(response.message || 'Operation feedback sent successfully');
        } else {
          this.showErrorMessage(response.message || 'Failed to send operation feedback');
        }
      }),
      catchError(error => {
        this.handleError(error, 'Failed to send operation feedback');
        return throwError(() => error);
      })
    );
  }

  /**
   * Query robot status
   * POST /api/missions/robot-query
   */
  queryRobots(request: RobotQueryRequest): Observable<RobotQueryResponse> {
    this.isQuerying.set(true);

    return this.http.post<RobotQueryResponse>(
      `${this.API_URL}${this.MISSIONS_ENDPOINT}/robot-query`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.isQuerying.set(false);
      }),
      catchError(error => {
        this.isQuerying.set(false);
        this.handleError(error, 'Failed to query robots');
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
    console.error('Missions Service Error:', error);
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
