import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

import {
  RobotTypeDto,
  RobotTypeDisplayData,
  RobotTypeCreateRequest,
  RobotTypeUpdateRequest,
  ApiResponse,
  transformRobotTypeDtoToDisplayData
} from '../models/robot-types.models';

@Injectable({
  providedIn: 'root'
})
export class RobotTypesService {
  private readonly apiUrl = 'http://localhost:5109/api/v1/robot-types';

  // Reactive state using signals
  public robotTypes = signal<RobotTypeDisplayData[]>([]);
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
  private handleError<T>(operation = 'operation'): (error: any) => Observable<never> {
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);

      // Set error state
      if (error.status === 401) {
        this.error.set('Authentication failed. Please log in again.');
      } else if (error.status === 403) {
        this.error.set('You do not have permission to perform this action.');
      } else if (error.status === 404) {
        this.error.set('The requested robot type was not found.');
      } else {
        this.error.set('An unexpected error occurred. Please try again.');
      }

      this.isLoading.set(false);
      this.isCreating.set(false);
      this.isUpdating.set(false);
      this.isDeleting.set(false);

      return throwError(() => error);
    };
  }

  /**
   * Get all robot types
   */
  public getRobotTypes(): Observable<RobotTypeDisplayData[]> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<ApiResponse<RobotTypeDto[]>>(this.apiUrl, { headers: this.getHttpHeaders() }).pipe(
      map(response => {
        const displayData = response.data.map(transformRobotTypeDtoToDisplayData);
        this.robotTypes.set(displayData);
        this.isLoading.set(false);
        return displayData;
      }),
      catchError(this.handleError('Failed to load robot types'))
    );
  }

  /**
   * Get robot type by ID
   */
  public getRobotTypeById(id: number): Observable<RobotTypeDisplayData> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<ApiResponse<RobotTypeDto>>(`${this.apiUrl}/${id}`, { headers: this.getHttpHeaders() }).pipe(
      map(response => {
        const displayData = transformRobotTypeDtoToDisplayData(response.data);
        this.isLoading.set(false);
        return displayData;
      }),
      catchError(this.handleError('Failed to load robot type'))
    );
  }

  /**
   * Create new robot type
   */
  public createRobotType(request: RobotTypeCreateRequest): Observable<RobotTypeDisplayData> {
    this.isCreating.set(true);
    this.error.set(null);

    return this.http.post<ApiResponse<RobotTypeDto>>(this.apiUrl, request, { headers: this.getHttpHeaders() }).pipe(
      map(response => {
        const displayData = transformRobotTypeDtoToDisplayData(response.data);
        const current = this.robotTypes();
        this.robotTypes.set([...current, displayData]);
        this.isCreating.set(false);
        return displayData;
      }),
      catchError(this.handleError('Failed to create robot type'))
    );
  }

  /**
   * Update existing robot type
   */
  public updateRobotType(id: number, request: RobotTypeUpdateRequest): Observable<RobotTypeDisplayData> {
    this.isUpdating.set(true);
    this.error.set(null);

    return this.http.put<ApiResponse<RobotTypeDto>>(`${this.apiUrl}/${id}`, request, { headers: this.getHttpHeaders() }).pipe(
      map(response => {
        const displayData = transformRobotTypeDtoToDisplayData(response.data);
        const current = this.robotTypes();
        const index = current.findIndex(item => item.id === id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = displayData;
          this.robotTypes.set(updated);
        }
        this.isUpdating.set(false);
        return displayData;
      }),
      catchError(this.handleError('Failed to update robot type'))
    );
  }

  /**
   * Delete robot type
   */
  public deleteRobotType(id: number): Observable<void> {
    this.isDeleting.set(true);
    this.error.set(null);

    return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${id}`, { headers: this.getHttpHeaders() }).pipe(
      map(() => {
        const current = this.robotTypes();
        this.robotTypes.set(current.filter(item => item.id !== id));
        this.isDeleting.set(false);
      }),
      catchError(this.handleError('Failed to delete robot type'))
    );
  }

  /**
   * Toggle robot type status
   */
  public toggleRobotTypeStatus(id: number): Observable<RobotTypeDisplayData> {
    return this.http.patch<ApiResponse<RobotTypeDto>>(`${this.apiUrl}/${id}/toggle-status`, {}, { headers: this.getHttpHeaders() }).pipe(
      map(response => {
        const displayData = transformRobotTypeDtoToDisplayData(response.data);
        const current = this.robotTypes();
        const index = current.findIndex(item => item.id === id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = displayData;
          this.robotTypes.set(updated);
        }
        return displayData;
      }),
      catchError(this.handleError('Failed to toggle robot type status'))
    );
  }

  /**
   * Export robot types data
   */
  public exportRobotTypes(): Observable<Blob> {
    const params = new HttpParams().set('export', 'true');

    return this.http.get(`${this.apiUrl}/export`, {
      headers: this.getHttpHeaders(),
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError('Failed to export robot types'))
    );
  }

  /**
   * Get robot types count
   */
  public getRobotTypesCount(): { active: number; inactive: number; total: number } {
    const types = this.robotTypes();
    return {
      active: types.filter(type => type.isActive).length,
      inactive: types.filter(type => !type.isActive).length,
      total: types.length
    };
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this.error.set(null);
  }

  /**
   * Check if a robot type is being used by any workflow templates
   * Returns the count of templates using this robot type
   */
  public checkUsageInTemplates(robotTypeValue: string): Observable<{
    isUsed: boolean;
    usageCount: number;
    templateNames: string[];
  }> {
    const url = `${this.apiUrl.replace('/v1/robot-types', '')}/saved-custom-missions`;

    return this.http.get<ApiResponse<any[]>>(url, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const templatesUsingThisType = response.data.filter(
            (template: any) => template.robotType === robotTypeValue
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
        console.error('Error checking robot type usage:', error);
        return throwError(() => error);
      })
    );
  }
}