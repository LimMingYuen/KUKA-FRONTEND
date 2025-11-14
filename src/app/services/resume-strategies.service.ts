import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  ResumeStrategyDto,
  ResumeStrategyCreateRequest,
  ResumeStrategyUpdateRequest,
  ResumeStrategyDisplayData,
  ApiResponse,
  transformResumeStrategiesForDisplay,
  transformResumeStrategyData,
  hasValueConflict,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription,
  sortResumeStrategiesByPriority
} from '../models/resume-strategies.models';

@Injectable({
  providedIn: 'root'
})
export class ResumeStrategiesService {
  private readonly API_URL = 'http://localhost:5109/api/v1/resume-strategies';

  // Reactive state using signals
  public resumeStrategies = signal<ResumeStrategyDisplayData[]>([]);
  public isLoading = signal<boolean>(false);
  public isCreating = signal<boolean>(false);
  public isUpdating = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);
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
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
    return headers;
  }

  /**
   * Handle HTTP errors
   */
  private handleError<T>(operation = 'operation'): (error: any) => Observable<T> {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);

      // Set error state
      if (error.status === 401) {
        this.error.set('Authentication failed. Please log in again.');
      } else if (error.status === 403) {
        this.error.set('You do not have permission to perform this action.');
      } else if (error.status === 404) {
        this.error.set('The requested resume strategy was not found.');
      } else if (error.status === 409) {
        this.error.set('A resume strategy with this actual value already exists.');
      } else if (error.status >= 500) {
        this.error.set('Server error. Please try again later.');
      } else {
        this.error.set(error.error?.msg || error.message || 'An unexpected error occurred.');
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
   * Get all resume strategies
   */
  public getResumeStrategies(): Observable<ResumeStrategyDisplayData[]> {
    this.isLoading.set(true);
    this.clearError();

    return this.http.get<ApiResponse<ResumeStrategyDto[]>>(this.API_URL, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const transformedData = transformResumeStrategiesForDisplay(response.data);
          const sortedData = sortResumeStrategiesByPriority(transformedData);
          this.resumeStrategies.set(sortedData);
          this.isLoading.set(false);
          return sortedData;
        } else {
          throw new Error(response.msg || 'Failed to load resume strategies');
        }
      }),
      catchError(this.handleError<ResumeStrategyDisplayData[]>('getResumeStrategies'))
    );
  }

  /**
   * Get resume strategy by ID
   */
  public getResumeStrategyById(id: number): Observable<ResumeStrategyDisplayData> {
    this.clearError();

    return this.http.get<ApiResponse<ResumeStrategyDto>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return transformResumeStrategyData(response.data);
        } else {
          throw new Error(response.msg || 'Failed to load resume strategy');
        }
      }),
      catchError(this.handleError<ResumeStrategyDisplayData>('getResumeStrategyById'))
    );
  }

  /**
   * Create new resume strategy
   */
  public createResumeStrategy(request: ResumeStrategyCreateRequest): Observable<ResumeStrategyDisplayData> {
    this.isCreating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateResumeStrategyRequest(request)) {
      this.isCreating.set(false);
      return throwError(() => new Error('Invalid resume strategy data'));
    }

    // Check for value conflicts before sending request
    const currentResumeStrategies = this.resumeStrategies();
    if (hasValueConflict(request.actualValue, currentResumeStrategies)) {
      this.isCreating.set(false);
      this.error.set('A resume strategy with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.post<ApiResponse<ResumeStrategyDto>>(this.API_URL, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const newResumeStrategy = transformResumeStrategyData(response.data);
          const updatedResumeStrategies = sortResumeStrategiesByPriority([...currentResumeStrategies, newResumeStrategy]);
          this.resumeStrategies.set(updatedResumeStrategies);
          this.isCreating.set(false);
          return newResumeStrategy;
        } else {
          throw new Error(response.msg || 'Failed to create resume strategy');
        }
      }),
      catchError(this.handleError<ResumeStrategyDisplayData>('createResumeStrategy'))
    );
  }

  /**
   * Update existing resume strategy
   */
  public updateResumeStrategy(id: number, request: ResumeStrategyUpdateRequest): Observable<ResumeStrategyDisplayData> {
    this.isUpdating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateResumeStrategyRequest(request)) {
      this.isUpdating.set(false);
      return throwError(() => new Error('Invalid resume strategy data'));
    }

    // Check for value conflicts (excluding current resume strategy)
    const currentResumeStrategies = this.resumeStrategies();
    if (hasValueConflict(request.actualValue, currentResumeStrategies, id)) {
      this.isUpdating.set(false);
      this.error.set('A resume strategy with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.put<ApiResponse<ResumeStrategyDto>>(`${this.API_URL}/${id}`, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const updatedResumeStrategy = transformResumeStrategyData(response.data);
          const updatedResumeStrategies = currentResumeStrategies.map(rs =>
            rs.id === id ? updatedResumeStrategy : rs
          );
          const sortedResumeStrategies = sortResumeStrategiesByPriority(updatedResumeStrategies);
          this.resumeStrategies.set(sortedResumeStrategies);
          this.isUpdating.set(false);
          return updatedResumeStrategy;
        } else {
          throw new Error(response.msg || 'Failed to update resume strategy');
        }
      }),
      catchError(this.handleError<ResumeStrategyDisplayData>('updateResumeStrategy'))
    );
  }

  /**
   * Delete resume strategy
   */
  public deleteResumeStrategy(id: number): Observable<void> {
    this.isDeleting.set(true);
    this.clearError();

    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          const currentResumeStrategies = this.resumeStrategies();
          const updatedResumeStrategies = currentResumeStrategies.filter(rs => rs.id !== id);
          this.resumeStrategies.set(updatedResumeStrategies);
          this.isDeleting.set(false);
        } else {
          throw new Error(response.msg || 'Failed to delete resume strategy');
        }
      }),
      catchError(this.handleError<void>('deleteResumeStrategy'))
    );
  }

  /**
   * Toggle resume strategy status (active/inactive)
   */
  public toggleResumeStrategyStatus(id: number): Observable<ResumeStrategyDisplayData> {
    const resumeStrategy = this.resumeStrategies().find(rs => rs.id === id);
    if (!resumeStrategy) {
      return throwError(() => new Error('Resume strategy not found'));
    }

    const updateRequest: ResumeStrategyUpdateRequest = {
      displayName: resumeStrategy.displayName,
      actualValue: resumeStrategy.actualValue,
      description: resumeStrategy.description,
      isActive: !resumeStrategy.isActive
    };

    return this.updateResumeStrategy(id, updateRequest);
  }

  /**
   * Export resume strategies to CSV
   */
  public exportResumeStrategies(): Observable<Blob> {
    this.clearError();

    return this.http.get(`${this.API_URL}/export`, {
      headers: this.getHttpHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError<Blob>('exportResumeStrategies'))
    );
  }

  /**
   * Validate resume strategy request data
   */
  private validateResumeStrategyRequest(request: ResumeStrategyCreateRequest | ResumeStrategyUpdateRequest): boolean {
    if (!isValidDisplayName(request.displayName)) {
      this.error.set('Display name must be between 3 and 100 characters');
      return false;
    }

    if (!isValidActualValue(request.actualValue)) {
      this.error.set('Actual value must be between 1 and 50 characters');
      return false;
    }

    if (!isValidDescription(request.description)) {
      this.error.set('Description must be less than 500 characters');
      return false;
    }

    return true;
  }

  /**
   * Get resume strategies count statistics
   */
  public getResumeStrategiesCount(): { active: number; inactive: number; total: number } {
    const resumeStrategies = this.resumeStrategies();
    return {
      active: resumeStrategies.filter(rs => rs.isActive).length,
      inactive: resumeStrategies.filter(rs => !rs.isActive).length,
      total: resumeStrategies.length
    };
  }

  /**
   * Refresh resume strategies data
   */
  public refreshResumeStrategies(): Observable<ResumeStrategyDisplayData[]> {
    return this.getResumeStrategies();
  }

  /**
   * Search resume strategies by term
   */
  public searchResumeStrategies(searchTerm: string): ResumeStrategyDisplayData[] {
    if (!searchTerm) {
      return this.resumeStrategies();
    }

    const term = searchTerm.toLowerCase();
    return this.resumeStrategies().filter(resumeStrategy =>
      resumeStrategy.displayName.toLowerCase().includes(term) ||
      resumeStrategy.actualValue.toLowerCase().includes(term) ||
      resumeStrategy.description.toLowerCase().includes(term) ||
      resumeStrategy.statusText.toLowerCase().includes(term)
    );
  }

  /**
   * Get resume strategies by status
   */
  public getResumeStrategiesByStatus(isActive: boolean): ResumeStrategyDisplayData[] {
    return this.resumeStrategies().filter(resumeStrategy => resumeStrategy.isActive === isActive);
  }

  /**
   * Check if service has valid authentication token
   */
  public hasValidToken(): boolean {
    return !!this.getAuthToken();
  }
}
