import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  AreaDto,
  AreaCreateRequest,
  AreaUpdateRequest,
  AreaDisplayData,
  ApiResponse,
  transformAreasForDisplay,
  transformAreaData,
  hasValueConflict,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription,
  sortAreasByPriority
} from '../models/areas.models';

@Injectable({
  providedIn: 'root'
})
export class AreasService {
  private readonly API_URL = 'http://localhost:5109/api/v1/areas';

  // Reactive state using signals
  public areas = signal<AreaDisplayData[]>([]);
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
        this.error.set('The requested area was not found.');
      } else if (error.status === 409) {
        this.error.set('An area with this actual value already exists.');
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
   * Get all areas
   */
  public getAreas(): Observable<AreaDisplayData[]> {
    this.isLoading.set(true);
    this.clearError();

    return this.http.get<ApiResponse<AreaDto[]>>(this.API_URL, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const transformedData = transformAreasForDisplay(response.data);
          const sortedData = sortAreasByPriority(transformedData);
          this.areas.set(sortedData);
          this.isLoading.set(false);
          return sortedData;
        } else {
          throw new Error(response.msg || 'Failed to load areas');
        }
      }),
      catchError(this.handleError<AreaDisplayData[]>('getAreas'))
    );
  }

  /**
   * Get area by ID
   */
  public getAreaById(id: number): Observable<AreaDisplayData> {
    this.clearError();

    return this.http.get<ApiResponse<AreaDto>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return transformAreaData(response.data);
        } else {
          throw new Error(response.msg || 'Failed to load area');
        }
      }),
      catchError(this.handleError<AreaDisplayData>('getAreaById'))
    );
  }

  /**
   * Create new area
   */
  public createArea(request: AreaCreateRequest): Observable<AreaDisplayData> {
    this.isCreating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateAreaRequest(request)) {
      this.isCreating.set(false);
      return throwError(() => new Error('Invalid area data'));
    }

    // Check for value conflicts before sending request
    const currentAreas = this.areas();
    if (hasValueConflict(request.actualValue, currentAreas)) {
      this.isCreating.set(false);
      this.error.set('An area with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.post<ApiResponse<AreaDto>>(this.API_URL, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const newArea = transformAreaData(response.data);
          const updatedAreas = sortAreasByPriority([...currentAreas, newArea]);
          this.areas.set(updatedAreas);
          this.isCreating.set(false);
          return newArea;
        } else {
          throw new Error(response.msg || 'Failed to create area');
        }
      }),
      catchError(this.handleError<AreaDisplayData>('createArea'))
    );
  }

  /**
   * Update existing area
   */
  public updateArea(id: number, request: AreaUpdateRequest): Observable<AreaDisplayData> {
    this.isUpdating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateAreaRequest(request)) {
      this.isUpdating.set(false);
      return throwError(() => new Error('Invalid area data'));
    }

    // Check for value conflicts (excluding current area)
    const currentAreas = this.areas();
    if (hasValueConflict(request.actualValue, currentAreas, id)) {
      this.isUpdating.set(false);
      this.error.set('An area with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.put<ApiResponse<AreaDto>>(`${this.API_URL}/${id}`, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const updatedArea = transformAreaData(response.data);
          const updatedAreas = currentAreas.map(a =>
            a.id === id ? updatedArea : a
          );
          const sortedAreas = sortAreasByPriority(updatedAreas);
          this.areas.set(sortedAreas);
          this.isUpdating.set(false);
          return updatedArea;
        } else {
          throw new Error(response.msg || 'Failed to update area');
        }
      }),
      catchError(this.handleError<AreaDisplayData>('updateArea'))
    );
  }

  /**
   * Delete area
   */
  public deleteArea(id: number): Observable<void> {
    this.isDeleting.set(true);
    this.clearError();

    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          const currentAreas = this.areas();
          const updatedAreas = currentAreas.filter(a => a.id !== id);
          this.areas.set(updatedAreas);
          this.isDeleting.set(false);
        } else {
          throw new Error(response.msg || 'Failed to delete area');
        }
      }),
      catchError(this.handleError<void>('deleteArea'))
    );
  }

  /**
   * Toggle area status (active/inactive)
   */
  public toggleAreaStatus(id: number): Observable<AreaDisplayData> {
    const area = this.areas().find(a => a.id === id);
    if (!area) {
      return throwError(() => new Error('Area not found'));
    }

    const updateRequest: AreaUpdateRequest = {
      displayName: area.displayName,
      actualValue: area.actualValue,
      description: area.description,
      isActive: !area.isActive
    };

    return this.updateArea(id, updateRequest);
  }

  /**
   * Export areas to CSV
   */
  public exportAreas(): Observable<Blob> {
    this.clearError();

    return this.http.get(`${this.API_URL}/export`, {
      headers: this.getHttpHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError<Blob>('exportAreas'))
    );
  }

  /**
   * Validate area request data
   */
  private validateAreaRequest(request: AreaCreateRequest | AreaUpdateRequest): boolean {
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
   * Get areas count statistics
   */
  public getAreasCount(): { active: number; inactive: number; total: number } {
    const areas = this.areas();
    return {
      active: areas.filter(a => a.isActive).length,
      inactive: areas.filter(a => !a.isActive).length,
      total: areas.length
    };
  }

  /**
   * Refresh areas data
   */
  public refreshAreas(): Observable<AreaDisplayData[]> {
    return this.getAreas();
  }

  /**
   * Search areas by term
   */
  public searchAreas(searchTerm: string): AreaDisplayData[] {
    if (!searchTerm) {
      return this.areas();
    }

    const term = searchTerm.toLowerCase();
    return this.areas().filter(area =>
      area.displayName.toLowerCase().includes(term) ||
      area.actualValue.toLowerCase().includes(term) ||
      area.description.toLowerCase().includes(term) ||
      area.statusText.toLowerCase().includes(term)
    );
  }

  /**
   * Get areas by status
   */
  public getAreasByStatus(isActive: boolean): AreaDisplayData[] {
    return this.areas().filter(area => area.isActive === isActive);
  }

  /**
   * Check if service has valid authentication token
   */
  public hasValidToken(): boolean {
    return !!this.getAuthToken();
  }
}
