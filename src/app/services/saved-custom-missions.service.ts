import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SavedCustomMissionDto,
  SavedCustomMissionsDisplayData,
  SavedCustomMissionsUtils
} from '../models/saved-custom-missions.models';

@Injectable({
  providedIn: 'root'
})
export class SavedCustomMissionsService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly ENDPOINT = '/SavedCustomMissions';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);

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
   * Get all saved custom missions
   */
  getAllSavedMissions(): Observable<SavedCustomMissionsDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<SavedCustomMissionDto[]>(
      `${this.API_URL}${this.ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(missions => missions.map(mission => SavedCustomMissionsUtils.transformToDisplay(mission))),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load saved missions');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get sync workflow templates (missions with empty missionStepsJson)
   * These are saved workflow configurations without mission steps
   */
  getSyncWorkflowTemplates(): Observable<SavedCustomMissionDto[]> {
    this.isLoading.set(true);

    return this.http.get<SavedCustomMissionDto[]>(
      `${this.API_URL}${this.ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(missions => missions.filter(mission => {
        // Filter for sync workflow templates: empty or "[]" missionStepsJson
        const stepsJson = mission.missionStepsJson?.trim();
        return !stepsJson || stepsJson === '[]';
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load sync workflow templates');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get saved mission by ID
   */
  getById(id: number): Observable<SavedCustomMissionDto> {
    return this.http.get<SavedCustomMissionDto>(
      `${this.API_URL}${this.ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      catchError(error => {
        this.handleError(error, `Failed to load saved mission ${id}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete saved mission
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}${this.ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('Saved mission deleted successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to delete saved mission');
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
      errorMessage = 'You do not have permission to access saved missions.';
    } else if (error.status === 404) {
      errorMessage = 'Saved mission not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.msg) {
      errorMessage = error.error.msg;
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
