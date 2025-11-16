import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  WorkflowNodeCodeSyncResult,
  SyncAndClassifyAllResult
} from '../models/workflow-node-codes.models';

@Injectable({
  providedIn: 'root'
})
export class WorkflowNodeCodesService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly ENDPOINT = '/workflow-node-codes';

  // Reactive state using Angular signals
  public isSyncing = signal<boolean>(false);
  public lastSyncResult = signal<WorkflowNodeCodeSyncResult | null>(null);
  public isSyncingAndClassifying = signal<boolean>(false);
  public lastSyncClassifyResult = signal<SyncAndClassifyAllResult | null>(null);

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
   * Sync all workflow node codes from external AMR API
   * Processes workflows sequentially for reliability
   */
  syncAllWorkflowNodeCodes(): Observable<WorkflowNodeCodeSyncResult> {
    this.isSyncing.set(true);
    const startTime = Date.now();

    return this.http.post<WorkflowNodeCodeSyncResult>(
      `${this.API_URL}${this.ENDPOINT}/sync`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      map(result => ({
        ...result,
        timestamp: new Date()
      })),
      tap(result => {
        this.isSyncing.set(false);
        this.lastSyncResult.set(result);

        const duration = Date.now() - startTime;
        const durationSeconds = (duration / 1000).toFixed(1);

        // Show success/failure message based on results
        let message: string;
        let panelClass: string[] = [];

        if (result.failureCount === 0) {
          message = `✓ Sync completed successfully in ${durationSeconds}s: ${result.successCount}/${result.totalWorkflows} workflows, ${result.nodeCodesInserted} inserted, ${result.nodeCodesDeleted} deleted`;
          panelClass = ['success-snackbar'];
        } else if (result.successCount > 0) {
          message = `⚠ Sync completed with ${result.failureCount} failures in ${durationSeconds}s: ${result.successCount}/${result.totalWorkflows} succeeded`;
          panelClass = ['warning-snackbar'];
        } else {
          message = `✗ Sync failed: All ${result.totalWorkflows} workflows failed`;
          panelClass = ['error-snackbar'];
        }

        this.snackBar.open(message, 'Close', {
          duration: 7000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass
        });
      }),
      catchError(error => {
        this.isSyncing.set(false);
        this.handleError(error, 'Failed to sync workflow node codes');
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
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to sync workflow node codes.';
    } else if (error.status === 404) {
      errorMessage = 'Workflow node codes service not found. Please contact administrator.';
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

    console.error('Workflow node codes service error:', error);
  }

  /**
   * Sync and classify all workflows
   * Syncs workflow node codes and classifies them into zones
   */
  syncAndClassifyAllWorkflows(): Observable<SyncAndClassifyAllResult> {
    this.isSyncingAndClassifying.set(true);
    const startTime = Date.now();

    return this.http.post<SyncAndClassifyAllResult>(
      `${this.API_URL}${this.ENDPOINT}/sync-and-classify-all`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      map(result => ({
        ...result,
        timestamp: new Date()
      })),
      tap(result => {
        this.isSyncingAndClassifying.set(false);
        this.lastSyncClassifyResult.set(result);

        const duration = Date.now() - startTime;
        const durationSeconds = (duration / 1000).toFixed(1);

        // Show success/failure message based on results
        let message: string;
        let panelClass: string[] = [];

        const hasIssues = result.failureCount > 0 || result.noZoneMatchCount > 0;

        if (!hasIssues) {
          message = `✓ Sync & classify completed successfully in ${durationSeconds}s: ${result.successCount}/${result.totalWorkflows} workflows classified`;
          panelClass = ['success-snackbar'];
        } else if (result.successCount > 0) {
          const issues = [];
          if (result.failureCount > 0) issues.push(`${result.failureCount} failures`);
          if (result.noZoneMatchCount > 0) issues.push(`${result.noZoneMatchCount} no zone match`);
          message = `⚠ Sync & classify completed with issues in ${durationSeconds}s: ${issues.join(', ')}`;
          panelClass = ['warning-snackbar'];
        } else {
          message = `✗ Sync & classify failed: All ${result.totalWorkflows} workflows failed`;
          panelClass = ['error-snackbar'];
        }

        this.snackBar.open(message, 'Close', {
          duration: 7000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass
        });
      }),
      catchError(error => {
        this.isSyncingAndClassifying.set(false);
        this.handleError(error, 'Failed to sync and classify workflows');
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear last sync result
   */
  public clearSyncResult(): void {
    this.lastSyncResult.set(null);
  }

  /**
   * Clear last sync and classify result
   */
  public clearSyncClassifyResult(): void {
    this.lastSyncClassifyResult.set(null);
  }
}
