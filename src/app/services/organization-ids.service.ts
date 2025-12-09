import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  OrganizationIdDto,
  OrganizationIdCreateRequest,
  OrganizationIdUpdateRequest,
  OrganizationIdDisplayData,
  ApiResponse,
  transformOrganizationIdsForDisplay,
  transformOrganizationIdData,
  hasValueConflict,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription,
  sortOrganizationIdsByPriority
} from '../models/organization-ids.models';
import { ConfigService } from './config.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class OrganizationIdsService {
  private config = inject(ConfigService);
  private notificationService = inject(NotificationService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/v1/organization-ids';
  }

  // Reactive state using signals
  public organizationIds = signal<OrganizationIdDisplayData[]>([]);
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

      let errorMessage: string;

      // Set error state
      if (error.status === 400) {
        errorMessage = error.error?.detail || error.error?.title || error.error?.msg || 'Invalid request. Please check your input.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'The requested organization ID was not found.';
      } else if (error.status === 409) {
        errorMessage = 'An organization ID with this actual value already exists.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = error.error?.msg || error.message || 'An unexpected error occurred.';
      }

      this.error.set(errorMessage);
      this.showErrorMessage(errorMessage);

      return throwError(() => error);
    };
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    this.notificationService.success(message);
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    this.notificationService.error(message);
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this.error.set(null);
  }

  /**
   * Get all organization IDs
   */
  public getOrganizationIds(): Observable<OrganizationIdDisplayData[]> {
    this.isLoading.set(true);
    this.clearError();

    return this.http.get<ApiResponse<OrganizationIdDto[]>>(this.API_URL, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const transformedData = transformOrganizationIdsForDisplay(response.data);
          const sortedData = sortOrganizationIdsByPriority(transformedData);
          this.organizationIds.set(sortedData);
          this.isLoading.set(false);
          return sortedData;
        } else {
          throw new Error(response.msg || 'Failed to load organization IDs');
        }
      }),
      catchError(this.handleError<OrganizationIdDisplayData[]>('getOrganizationIds'))
    );
  }

  /**
   * Get organization ID by ID
   */
  public getOrganizationIdById(id: number): Observable<OrganizationIdDisplayData> {
    this.clearError();

    return this.http.get<ApiResponse<OrganizationIdDto>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return transformOrganizationIdData(response.data);
        } else {
          throw new Error(response.msg || 'Failed to load organization ID');
        }
      }),
      catchError(this.handleError<OrganizationIdDisplayData>('getOrganizationIdById'))
    );
  }

  /**
   * Create new organization ID
   */
  public createOrganizationId(request: OrganizationIdCreateRequest): Observable<OrganizationIdDisplayData> {
    this.isCreating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateOrganizationIdRequest(request)) {
      this.isCreating.set(false);
      return throwError(() => new Error('Invalid organization ID data'));
    }

    // Check for value conflicts before sending request
    const currentOrganizationIds = this.organizationIds();
    if (hasValueConflict(request.actualValue, currentOrganizationIds)) {
      this.isCreating.set(false);
      this.error.set('An organization ID with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.post<ApiResponse<OrganizationIdDto>>(this.API_URL, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const newOrganizationId = transformOrganizationIdData(response.data);
          const updatedOrganizationIds = sortOrganizationIdsByPriority([...currentOrganizationIds, newOrganizationId]);
          this.organizationIds.set(updatedOrganizationIds);
          this.isCreating.set(false);
          this.showSuccessMessage('Organization ID created successfully');
          return newOrganizationId;
        } else {
          throw new Error(response.msg || 'Failed to create organization ID');
        }
      }),
      catchError((error) => {
        this.isCreating.set(false);
        return this.handleError<OrganizationIdDisplayData>('createOrganizationId')(error);
      })
    );
  }

  /**
   * Update existing organization ID
   */
  public updateOrganizationId(id: number, request: OrganizationIdUpdateRequest): Observable<OrganizationIdDisplayData> {
    this.isUpdating.set(true);
    this.clearError();

    // Validate request data
    if (!this.validateOrganizationIdRequest(request)) {
      this.isUpdating.set(false);
      return throwError(() => new Error('Invalid organization ID data'));
    }

    // Check for value conflicts (excluding current organization ID)
    const currentOrganizationIds = this.organizationIds();
    if (hasValueConflict(request.actualValue, currentOrganizationIds, id)) {
      this.isUpdating.set(false);
      this.error.set('An organization ID with this actual value already exists');
      return throwError(() => new Error('Value conflict'));
    }

    return this.http.put<ApiResponse<OrganizationIdDto>>(`${this.API_URL}/${id}`, request, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const updatedOrganizationId = transformOrganizationIdData(response.data);
          const updatedOrganizationIds = currentOrganizationIds.map(o =>
            o.id === id ? updatedOrganizationId : o
          );
          const sortedOrganizationIds = sortOrganizationIdsByPriority(updatedOrganizationIds);
          this.organizationIds.set(sortedOrganizationIds);
          this.isUpdating.set(false);
          this.showSuccessMessage('Organization ID updated successfully');
          return updatedOrganizationId;
        } else {
          throw new Error(response.msg || 'Failed to update organization ID');
        }
      }),
      catchError((error) => {
        this.isUpdating.set(false);
        return this.handleError<OrganizationIdDisplayData>('updateOrganizationId')(error);
      })
    );
  }

  /**
   * Delete organization ID
   */
  public deleteOrganizationId(id: number): Observable<void> {
    this.isDeleting.set(true);
    this.clearError();

    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          const currentOrganizationIds = this.organizationIds();
          const updatedOrganizationIds = currentOrganizationIds.filter(o => o.id !== id);
          this.organizationIds.set(updatedOrganizationIds);
          this.isDeleting.set(false);
          this.showSuccessMessage('Organization ID deleted successfully');
        } else {
          throw new Error(response.msg || 'Failed to delete organization ID');
        }
      }),
      catchError((error) => {
        this.isDeleting.set(false);
        return this.handleError<void>('deleteOrganizationId')(error);
      })
    );
  }

  /**
   * Toggle organization ID status (active/inactive)
   */
  public toggleOrganizationIdStatus(id: number): Observable<OrganizationIdDisplayData> {
    const organizationId = this.organizationIds().find(o => o.id === id);
    if (!organizationId) {
      return throwError(() => new Error('Organization ID not found'));
    }

    const updateRequest: OrganizationIdUpdateRequest = {
      displayName: organizationId.displayName,
      actualValue: organizationId.actualValue,
      description: organizationId.description,
      isActive: !organizationId.isActive
    };

    return this.updateOrganizationId(id, updateRequest);
  }

  /**
   * Export organization IDs to CSV
   */
  public exportOrganizationIds(): Observable<Blob> {
    this.clearError();

    return this.http.get(`${this.API_URL}/export`, {
      headers: this.getHttpHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError<Blob>('exportOrganizationIds'))
    );
  }

  /**
   * Validate organization ID request data
   */
  private validateOrganizationIdRequest(request: OrganizationIdCreateRequest | OrganizationIdUpdateRequest): boolean {
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
   * Get organization IDs count statistics
   */
  public getOrganizationIdsCount(): { active: number; inactive: number; total: number } {
    const organizationIds = this.organizationIds();
    return {
      active: organizationIds.filter(o => o.isActive).length,
      inactive: organizationIds.filter(o => !o.isActive).length,
      total: organizationIds.length
    };
  }

  /**
   * Refresh organization IDs data
   */
  public refreshOrganizationIds(): Observable<OrganizationIdDisplayData[]> {
    return this.getOrganizationIds();
  }

  /**
   * Search organization IDs by term
   */
  public searchOrganizationIds(searchTerm: string): OrganizationIdDisplayData[] {
    if (!searchTerm) {
      return this.organizationIds();
    }

    const term = searchTerm.toLowerCase();
    return this.organizationIds().filter(organizationId =>
      organizationId.displayName.toLowerCase().includes(term) ||
      organizationId.actualValue.toLowerCase().includes(term) ||
      organizationId.description.toLowerCase().includes(term) ||
      organizationId.statusText.toLowerCase().includes(term)
    );
  }

  /**
   * Get organization IDs by status
   */
  public getOrganizationIdsByStatus(isActive: boolean): OrganizationIdDisplayData[] {
    return this.organizationIds().filter(organizationId => organizationId.isActive === isActive);
  }

  /**
   * Check if service has valid authentication token
   */
  public hasValidToken(): boolean {
    return !!this.getAuthToken();
  }
}
