import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  MissionTypeDto,
  MissionTypeCreateRequest,
  MissionTypeUpdateRequest,
  MissionTypeDisplayData,
  ApiResponse,
  transformMissionTypesForDisplay,
  transformMissionTypeData,
  hasValueConflict,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription,
  sortMissionTypesByPriority
} from '../models/mission-types.models';

@Injectable({
  providedIn: 'root'
})
export class MissionTypesService {
  private readonly API_URL = 'http://localhost:5109/api/v1/mission-types';

  // Reactive state using signals
  public missionTypes = signal<MissionTypeDisplayData[]>([]);
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
        this.error.set('The requested mission type was not found.');
      } else if (error.status === 409) {
        this.error.set('A mission type with this actual value already exists.');
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
   * Get all mission types
   */
  public getMissionTypes(): Observable<MissionTypeDisplayData[]> {
    this.isLoading.set(true);
    this.clearError();

    return this.http.get<ApiResponse<MissionTypeDto[]>>(this.API_URL, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const transformedData = transformMissionTypesForDisplay(response.data);
          const sortedData = sortMissionTypesByPriority(transformedData);
          this.missionTypes.set(sortedData);
          this.isLoading.set(false);
          return sortedData;
        } else {
          throw new Error(response.msg || 'Failed to load mission types');
        }
      }),
      catchError(this.handleError<MissionTypeDisplayData[]>('getMissionTypes'))
    );
  }

  /**
   * Get mission type by ID
   */
  public getMissionTypeById(id: number): Observable<MissionTypeDisplayData> {
    this.clearError();

    return this.http.get<ApiResponse<MissionTypeDto>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return transformMissionTypeData(response.data);
        } else {
          throw new Error(response.msg || 'Failed to load mission type');
        }
      }),
      catchError(this.handleError<MissionTypeDisplayData>('getMissionTypeById'))
    );
  }

  /**
   * Create new mission type
   */
  public createMissionType(request: MissionTypeCreateRequest): Observable<MissionTypeDisplayData> {
    this.isCreating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateMissionTypeRequest(request)) {
      this.isCreating.set(false);
      return throwError(() => new Error('Invalid mission type data'));
    }

    // Check for value conflicts before sending request
    const currentMissionTypes = this.missionTypes();
    if (hasValueConflict(request.actualValue, currentMissionTypes)) {
      this.isCreating.set(false);
      this.error.set('A mission type with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.post<ApiResponse<MissionTypeDto>>(this.API_URL, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const newMissionType = transformMissionTypeData(response.data);
          const updatedMissionTypes = sortMissionTypesByPriority([...currentMissionTypes, newMissionType]);
          this.missionTypes.set(updatedMissionTypes);
          this.isCreating.set(false);
          return newMissionType;
        } else {
          throw new Error(response.msg || 'Failed to create mission type');
        }
      }),
      catchError(this.handleError<MissionTypeDisplayData>('createMissionType'))
    );
  }

  /**
   * Update existing mission type
   */
  public updateMissionType(id: number, request: MissionTypeUpdateRequest): Observable<MissionTypeDisplayData> {
    this.isUpdating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateMissionTypeRequest(request)) {
      this.isUpdating.set(false);
      return throwError(() => new Error('Invalid mission type data'));
    }

    // Check for value conflicts (excluding current mission type)
    const currentMissionTypes = this.missionTypes();
    if (hasValueConflict(request.actualValue, currentMissionTypes, id)) {
      this.isUpdating.set(false);
      this.error.set('A mission type with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.put<ApiResponse<MissionTypeDto>>(`${this.API_URL}/${id}`, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const updatedMissionType = transformMissionTypeData(response.data);
          const updatedMissionTypes = currentMissionTypes.map(mt =>
            mt.id === id ? updatedMissionType : mt
          );
          const sortedMissionTypes = sortMissionTypesByPriority(updatedMissionTypes);
          this.missionTypes.set(sortedMissionTypes);
          this.isUpdating.set(false);
          return updatedMissionType;
        } else {
          throw new Error(response.msg || 'Failed to update mission type');
        }
      }),
      catchError(this.handleError<MissionTypeDisplayData>('updateMissionType'))
    );
  }

  /**
   * Delete mission type
   */
  public deleteMissionType(id: number): Observable<void> {
    this.isDeleting.set(true);
    this.clearError();

    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          const currentMissionTypes = this.missionTypes();
          const updatedMissionTypes = currentMissionTypes.filter(mt => mt.id !== id);
          this.missionTypes.set(updatedMissionTypes);
          this.isDeleting.set(false);
        } else {
          throw new Error(response.msg || 'Failed to delete mission type');
        }
      }),
      catchError(this.handleError<void>('deleteMissionType'))
    );
  }

  /**
   * Toggle mission type status (active/inactive)
   */
  public toggleMissionTypeStatus(id: number): Observable<MissionTypeDisplayData> {
    const missionType = this.missionTypes().find(mt => mt.id === id);
    if (!missionType) {
      return throwError(() => new Error('Mission type not found'));
    }

    const updateRequest: MissionTypeUpdateRequest = {
      displayName: missionType.displayName,
      actualValue: missionType.actualValue,
      description: missionType.description,
      isActive: !missionType.isActive
    };

    return this.updateMissionType(id, updateRequest);
  }

  /**
   * Export mission types to CSV
   */
  public exportMissionTypes(): Observable<Blob> {
    this.clearError();

    return this.http.get(`${this.API_URL}/export`, {
      headers: this.getHttpHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError<Blob>('exportMissionTypes'))
    );
  }

  /**
   * Validate mission type request data
   */
  private validateMissionTypeRequest(request: MissionTypeCreateRequest | MissionTypeUpdateRequest): boolean {
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
   * Get mission types count statistics
   */
  public getMissionTypesCount(): { active: number; inactive: number; total: number } {
    const missionTypes = this.missionTypes();
    return {
      active: missionTypes.filter(mt => mt.isActive).length,
      inactive: missionTypes.filter(mt => !mt.isActive).length,
      total: missionTypes.length
    };
  }

  /**
   * Refresh mission types data
   */
  public refreshMissionTypes(): Observable<MissionTypeDisplayData[]> {
    return this.getMissionTypes();
  }

  /**
   * Search mission types by term
   */
  public searchMissionTypes(searchTerm: string): MissionTypeDisplayData[] {
    if (!searchTerm) {
      return this.missionTypes();
    }

    const term = searchTerm.toLowerCase();
    return this.missionTypes().filter(missionType =>
      missionType.displayName.toLowerCase().includes(term) ||
      missionType.actualValue.toLowerCase().includes(term) ||
      missionType.description.toLowerCase().includes(term) ||
      missionType.statusText.toLowerCase().includes(term)
    );
  }

  /**
   * Get mission types by status
   */
  public getMissionTypesByStatus(isActive: boolean): MissionTypeDisplayData[] {
    return this.missionTypes().filter(missionType => missionType.isActive === isActive);
  }

  /**
   * Check if service has valid authentication token
   */
  public hasValidToken(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Check if a mission type is being used by any workflow templates
   * Returns the count of templates using this mission type
   */
  public checkUsageInTemplates(missionTypeValue: string): Observable<{
    isUsed: boolean;
    usageCount: number;
    templateNames: string[];
  }> {
    const url = `${this.API_URL.replace('/v1/mission-types', '')}/saved-custom-missions`;

    return this.http.get<ApiResponse<any[]>>(url, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const templatesUsingThisType = response.data.filter(
            (template: any) => template.missionType === missionTypeValue
          );

          return {
            isUsed: templatesUsingThisType.length > 0,
            usageCount: templatesUsingThisType.length,
            templateNames: templatesUsingThisType.map((t: any) => t.missionName)
          };
        }
        return { isUsed: false, usageCount: 0, templateNames: [] };
      }),
      catchError(error => {
        console.error('Error checking mission type usage:', error);
        return throwError(() => error);
      })
    );
  }
}