import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AutoSyncSettings,
  AutoSyncSettingsUpdate,
  AutoSyncRunResult,
  SyncResult
} from '../models/auto-sync.models';

@Injectable({
  providedIn: 'root'
})
export class AutoSyncService {
  private readonly API_URL = 'http://localhost:5109/api/v1/auto-sync-settings';

  constructor(private http: HttpClient) {}

  /**
   * Get current auto-sync settings
   */
  getSettings(): Observable<AutoSyncSettings> {
    return this.http.get<AutoSyncSettings>(this.API_URL).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update auto-sync settings
   */
  updateSettings(settings: AutoSyncSettingsUpdate): Observable<AutoSyncSettings> {
    return this.http.put<AutoSyncSettings>(this.API_URL, settings).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Trigger immediate sync of all enabled APIs
   */
  runNow(): Observable<AutoSyncRunResult> {
    return this.http.post<AutoSyncRunResult>(`${this.API_URL}/run-now`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Sync a specific API
   */
  runSingle(apiName: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.API_URL}/run-now/${apiName}`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.Message) {
      errorMessage = error.error.Message;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    console.error('AutoSync Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
