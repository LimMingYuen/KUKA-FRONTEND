import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface LogRetentionSetting {
  key: string;
  value: number;
}

export interface LogCleanupResult {
  success: boolean;
  message: string;
}

export interface LogFoldersResult {
  success: boolean;
  count: number;
  folders: string[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LogCleanupService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/LogCleanup';
  }

  // Reactive state using signals
  public retentionMonths = signal<number>(1);
  public folders = signal<string[]>([]);
  public isLoading = signal<boolean>(false);
  public isRunningCleanup = signal<boolean>(false);
  public error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Get JWT token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Get HTTP headers with authentication
   */
  private getHttpHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError<T>(operation = 'operation'): (error: any) => Observable<T> {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);

      if (error.status === 401) {
        this.error.set('Authentication failed. Please log in again.');
      } else if (error.status === 403) {
        this.error.set('You do not have permission to perform this action.');
      } else if (error.status >= 500) {
        this.error.set('Server error. Please try again later.');
      } else {
        this.error.set(error.error?.message || error.message || 'An unexpected error occurred.');
      }

      return throwError(() => error);
    };
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this.error.set(null);
  }

  /**
   * Get current log retention setting
   */
  public getSetting(): Observable<LogRetentionSetting> {
    this.isLoading.set(true);
    this.clearError();

    return this.http.get<LogRetentionSetting>(`${this.API_URL}/setting`, {
      headers: this.getHttpHeaders()
    }).pipe(
      tap(response => {
        this.retentionMonths.set(response.value);
        this.isLoading.set(false);
      }),
      catchError(this.handleError<LogRetentionSetting>('getSetting'))
    );
  }

  /**
   * Update log retention setting
   */
  public updateSetting(retentionMonths: number): Observable<LogCleanupResult> {
    this.isLoading.set(true);
    this.clearError();

    return this.http.post<LogCleanupResult>(`${this.API_URL}/setting`,
      { retentionMonths },
      { headers: this.getHttpHeaders() }
    ).pipe(
      tap(response => {
        if (response.success) {
          this.retentionMonths.set(retentionMonths);
        }
        this.isLoading.set(false);
      }),
      catchError(this.handleError<LogCleanupResult>('updateSetting'))
    );
  }

  /**
   * Run log cleanup manually
   */
  public runCleanup(): Observable<LogCleanupResult> {
    this.isRunningCleanup.set(true);
    this.clearError();

    return this.http.post<LogCleanupResult>(`${this.API_URL}/run`, {}, {
      headers: this.getHttpHeaders()
    }).pipe(
      tap(() => {
        this.isRunningCleanup.set(false);
      }),
      catchError((error) => {
        this.isRunningCleanup.set(false);
        return this.handleError<LogCleanupResult>('runCleanup')(error);
      })
    );
  }

  /**
   * List all log folders
   */
  public listFolders(): Observable<LogFoldersResult> {
    this.isLoading.set(true);
    this.clearError();

    return this.http.get<LogFoldersResult>(`${this.API_URL}/folders`, {
      headers: this.getHttpHeaders()
    }).pipe(
      tap(response => {
        if (response.success) {
          this.folders.set(response.folders);
        }
        this.isLoading.set(false);
      }),
      catchError(this.handleError<LogFoldersResult>('listFolders'))
    );
  }
}
