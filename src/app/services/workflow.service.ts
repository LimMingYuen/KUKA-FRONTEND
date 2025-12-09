import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { NotificationService } from './notification.service';
import {
  WorkflowSummaryDto,
  WorkflowSyncResultDto,
  ApiResponse,
  WorkflowDisplayData,
  getWorkflowStatusText
} from '../models/workflow.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api';
  }
  private readonly WORKFLOW_ENDPOINT = '/Workflows';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public lastSyncResult = signal<WorkflowSyncResultDto | null>(null);

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
   * Get all workflows from the API
   */
  getWorkflows(): Observable<WorkflowDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<WorkflowSummaryDto[]>(
      `${this.API_URL}${this.WORKFLOW_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(workflows => {
        // Transform workflow data to display format and sort by ID ascending
        return workflows
          .map(workflow => ({
            id: workflow.id,
            name: workflow.name || 'Unnamed Workflow',
            code: workflow.number || 'N/A',
            externalCode: workflow.externalCode || 'N/A',
            status: workflow.status,
            statusText: getWorkflowStatusText(workflow.status),
            layoutCode: workflow.layoutCode || 'N/A'
          }))
          .sort((a, b) => a.id - b.id); // Sort by ID in ascending order
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load workflows');
        return throwError(() => error);
      })
    );
  }

  /**
   * Sync workflows from external API
   */
  syncWorkflows(): Observable<WorkflowSyncResultDto> {
    this.isSyncing.set(true);

    return this.http.post<WorkflowSyncResultDto>(
      `${this.API_URL}${this.WORKFLOW_ENDPOINT}/sync`,
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
        this.handleError(error, 'Failed to sync workflows');
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
      errorMessage = 'You do not have permission to access workflows.';
    } else if (error.status === 404) {
      errorMessage = 'Workflow service not found. Please contact administrator.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.notificationService.error(errorMessage);

    console.error('Workflow service error:', error);
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