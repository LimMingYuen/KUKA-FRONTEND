import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SavedCustomMissionDto,
  SavedCustomMissionsDisplayData,
  SavedCustomMissionCreateRequest,
  SavedCustomMissionUpdateRequest,
  TriggerMissionResponse,
  ApiResponse,
  SavedCustomMissionsUtils
} from '../models/saved-custom-missions.models';

@Injectable({
  providedIn: 'root'
})
export class SavedCustomMissionsService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly SAVED_CUSTOM_MISSIONS_ENDPOINT = '/saved-custom-missions';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isCreating = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);
  public isTriggering = signal<boolean>(false);

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
   * Get all saved custom missions from the API
   */
  getAllSavedCustomMissions(): Observable<SavedCustomMissionsDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<ApiResponse<SavedCustomMissionDto[]>>(
      `${this.API_URL}${this.SAVED_CUSTOM_MISSIONS_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.msg || 'Failed to load saved custom missions');
        }
        // Transform for display
        return response.data.map(mission => SavedCustomMissionsUtils.transformToDisplay(mission));
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load saved custom missions');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get saved custom mission by ID
   */
  getSavedCustomMissionById(id: number): Observable<SavedCustomMissionsDisplayData> {
    return this.http.get<ApiResponse<SavedCustomMissionDto>>(
      `${this.API_URL}${this.SAVED_CUSTOM_MISSIONS_ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.msg || 'Failed to load saved custom mission');
        }
        return SavedCustomMissionsUtils.transformToDisplay(response.data);
      }),
      catchError(error => {
        this.handleError(error, `Failed to load saved custom mission #${id}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new saved custom mission
   */
  createSavedCustomMission(request: SavedCustomMissionCreateRequest): Observable<SavedCustomMissionsDisplayData> {
    this.isCreating.set(true);

    return this.http.post<ApiResponse<SavedCustomMissionDto>>(
      `${this.API_URL}${this.SAVED_CUSTOM_MISSIONS_ENDPOINT}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.msg || 'Failed to create saved custom mission');
        }
        return SavedCustomMissionsUtils.transformToDisplay(response.data);
      }),
      tap(() => {
        this.isCreating.set(false);
        this.showSuccessMessage('Saved custom mission created successfully');
      }),
      catchError(error => {
        this.isCreating.set(false);
        this.handleError(error, 'Failed to create saved custom mission');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update existing saved custom mission
   */
  updateSavedCustomMission(id: number, request: SavedCustomMissionUpdateRequest): Observable<SavedCustomMissionsDisplayData> {
    this.isUpdating.set(true);

    return this.http.put<ApiResponse<SavedCustomMissionDto>>(
      `${this.API_URL}${this.SAVED_CUSTOM_MISSIONS_ENDPOINT}/${id}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.msg || 'Failed to update saved custom mission');
        }
        return SavedCustomMissionsUtils.transformToDisplay(response.data);
      }),
      tap(() => {
        this.isUpdating.set(false);
        this.showSuccessMessage('Saved custom mission updated successfully');
      }),
      catchError(error => {
        this.isUpdating.set(false);
        this.handleError(error, `Failed to update saved custom mission #${id}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete saved custom mission
   */
  deleteSavedCustomMission(id: number): Observable<void> {
    this.isDeleting.set(true);

    return this.http.delete<ApiResponse<object>>(
      `${this.API_URL}${this.SAVED_CUSTOM_MISSIONS_ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.msg || 'Failed to delete saved custom mission');
        }
      }),
      tap(() => {
        this.isDeleting.set(false);
        this.showSuccessMessage('Saved custom mission deleted successfully');
      }),
      catchError(error => {
        this.isDeleting.set(false);
        this.handleError(error, `Failed to delete saved custom mission #${id}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Trigger saved custom mission execution
   */
  triggerSavedCustomMission(id: number): Observable<TriggerMissionResponse> {
    this.isTriggering.set(true);

    return this.http.post<ApiResponse<TriggerMissionResponse>>(
      `${this.API_URL}${this.SAVED_CUSTOM_MISSIONS_ENDPOINT}/${id}/trigger`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.msg || 'Failed to trigger saved custom mission');
        }
        return response.data;
      }),
      tap(() => {
        this.isTriggering.set(false);
        this.showSuccessMessage('Mission triggered successfully');
      }),
      catchError(error => {
        this.isTriggering.set(false);
        this.handleError(error, `Failed to trigger saved custom mission #${id}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Export saved custom missions data
   */
  exportSavedCustomMissions(): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}${this.SAVED_CUSTOM_MISSIONS_ENDPOINT}/export`,
      {
        headers: this.createHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('Saved custom missions exported successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to export saved custom missions');
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate mission steps JSON
   */
  validateMissionStepsJson(json: string): { isValid: boolean; error?: string } {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        return { isValid: false, error: 'Mission steps must be an array' };
      }
      if (parsed.length === 0) {
        return { isValid: false, error: 'Mission steps cannot be empty' };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid JSON format' };
    }
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
      errorMessage = 'The requested saved custom mission was not found.';
    } else if (error.status === 409) {
      errorMessage = 'A saved custom mission with this name already exists.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.detail || error.error?.message) {
      errorMessage = error.error.detail || error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('Saved Custom Missions Service Error:', error);
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