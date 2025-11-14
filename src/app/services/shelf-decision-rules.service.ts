import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ShelfDecisionRuleDto,
  ShelfDecisionRuleCreateRequest,
  ShelfDecisionRuleUpdateRequest,
  ApiResponse,
  ShelfDecisionRuleDisplayData,
  transformShelfDecisionRulesForDisplay,
  hasValueConflict
} from '../models/shelf-decision-rules.models';

@Injectable({
  providedIn: 'root'
})
export class ShelfDecisionRulesService {
  private readonly API_URL = 'http://localhost:5109/api/v1';
  private readonly SHELF_DECISION_RULES_ENDPOINT = '/shelf-decision-rules';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isCreating = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);
  public rules = signal<ShelfDecisionRuleDisplayData[]>([]);

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
   * Get all shelf decision rules from the API
   */
  getShelfDecisionRules(): Observable<ShelfDecisionRuleDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<ApiResponse<ShelfDecisionRuleDto[]>>(
      `${this.API_URL}${this.SHELF_DECISION_RULES_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          const transformedRules = transformShelfDecisionRulesForDisplay(response.data);
          this.rules.set(transformedRules);
          return transformedRules;
        }
        throw new Error('Failed to load shelf decision rules');
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load shelf decision rules');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get shelf decision rule by ID
   */
  getShelfDecisionRuleById(id: number): Observable<ShelfDecisionRuleDisplayData> {
    return this.http.get<ApiResponse<ShelfDecisionRuleDto>>(
      `${this.API_URL}${this.SHELF_DECISION_RULES_ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return transformShelfDecisionRulesForDisplay([response.data])[0];
        }
        throw new Error(`Shelf decision rule with ID ${id} not found`);
      }),
      catchError(error => {
        this.handleError(error, 'Failed to load shelf decision rule');
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new shelf decision rule
   */
  createShelfDecisionRule(request: ShelfDecisionRuleCreateRequest): Observable<ShelfDecisionRuleDisplayData> {
    this.isCreating.set(true);

    // Check for value conflicts before sending request
    const currentRules = this.rules();
    if (hasValueConflict(request.actualValue, currentRules)) {
      this.isCreating.set(false);
      this.showErrorMessage('A rule with this value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.post<ApiResponse<ShelfDecisionRuleDto>>(
      `${this.API_URL}${this.SHELF_DECISION_RULES_ENDPOINT}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          const newRule = transformShelfDecisionRulesForDisplay([response.data])[0];
          this.rules.update(rules => [newRule, ...rules]);
          return newRule;
        }
        throw new Error('Failed to create shelf decision rule');
      }),
      tap(() => {
        this.isCreating.set(false);
        this.showSuccessMessage('Shelf decision rule created successfully');
      }),
      catchError(error => {
        this.isCreating.set(false);
        this.handleError(error, 'Failed to create shelf decision rule');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update existing shelf decision rule
   */
  updateShelfDecisionRule(id: number, request: ShelfDecisionRuleUpdateRequest): Observable<ShelfDecisionRuleDisplayData> {
    this.isUpdating.set(true);

    // Check for value conflicts before sending request
    const currentRules = this.rules();
    if (hasValueConflict(request.actualValue, currentRules, id)) {
      this.isUpdating.set(false);
      this.showErrorMessage('A rule with this value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.put<ApiResponse<ShelfDecisionRuleDto>>(
      `${this.API_URL}${this.SHELF_DECISION_RULES_ENDPOINT}/${id}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          const updatedRule = transformShelfDecisionRulesForDisplay([response.data])[0];
          this.rules.update(rules =>
            rules.map(rule => rule.id === id ? updatedRule : rule)
          );
          return updatedRule;
        }
        throw new Error('Failed to update shelf decision rule');
      }),
      tap(() => {
        this.isUpdating.set(false);
        this.showSuccessMessage('Shelf decision rule updated successfully');
      }),
      catchError(error => {
        this.isUpdating.set(false);
        this.handleError(error, 'Failed to update shelf decision rule');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete shelf decision rule
   */
  deleteShelfDecisionRule(id: number): Observable<void> {
    this.isDeleting.set(true);

    return this.http.delete<ApiResponse<object>>(
      `${this.API_URL}${this.SHELF_DECISION_RULES_ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (response.success) {
          this.rules.update(rules => rules.filter(rule => rule.id !== id));
          return;
        }
        throw new Error('Failed to delete shelf decision rule');
      }),
      tap(() => {
        this.isDeleting.set(false);
        this.showSuccessMessage('Shelf decision rule deleted successfully');
      }),
      catchError(error => {
        this.isDeleting.set(false);
        this.handleError(error, 'Failed to delete shelf decision rule');
        return throwError(() => error);
      })
    );
  }

  /**
   * Export shelf decision rules data
   */
  exportShelfDecisionRules(): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}${this.SHELF_DECISION_RULES_ENDPOINT}/export`,
      {
        headers: this.createHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('Shelf decision rules exported successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to export shelf decision rules');
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh all rules from server
   */
  refreshRules(): Observable<ShelfDecisionRuleDisplayData[]> {
    return this.getShelfDecisionRules();
  }

  /**
   * Get rules count by status
   */
  getRulesCount(): { active: number; inactive: number; total: number } {
    const rules = this.rules();
    const active = rules.filter(rule => rule.isActive).length;
    const inactive = rules.filter(rule => !rule.isActive).length;

    return { active, inactive, total: rules.length };
  }

  /**
   * Toggle rule status
   */
  toggleRuleStatus(id: number): Observable<ShelfDecisionRuleDisplayData> {
    const rule = this.rules().find(r => r.id === id);
    if (!rule) {
      return throwError(() => new Error('Rule not found'));
    }

    const updateRequest: ShelfDecisionRuleUpdateRequest = {
      displayName: rule.displayName,
      actualValue: rule.actualValue,
      description: rule.description,
      isActive: !rule.isActive
    };

    return this.updateShelfDecisionRule(id, updateRequest);
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
      errorMessage = 'The requested shelf decision rule was not found.';
    } else if (error.status === 409) {
      errorMessage = 'A rule with this value already exists. Please use a different value.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('Shelf Decision Rules Service Error:', error);
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