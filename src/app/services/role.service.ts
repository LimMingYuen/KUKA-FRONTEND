import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import {
  RoleDto,
  RoleCreateRequest,
  RoleUpdateRequest,
  ApiResponse
} from '../models/role.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/v1/roles';
  }

  constructor(private http: HttpClient) {}

  /**
   * Get authorization headers with JWT token
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  /**
   * Get all roles
   */
  getAll(): Observable<RoleDto[]> {
    return this.http
      .get<ApiResponse<RoleDto[]>>(this.API_URL, { headers: this.getHeaders() })
      .pipe(
        map((response) => response.data || []),
        catchError(this.handleError)
      );
  }

  /**
   * Get role by ID
   */
  getById(id: number): Observable<RoleDto> {
    return this.http
      .get<ApiResponse<RoleDto>>(`${this.API_URL}/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Role not found');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get role by role code
   */
  getByRoleCode(roleCode: string): Observable<RoleDto> {
    return this.http
      .get<ApiResponse<RoleDto>>(`${this.API_URL}/code/${roleCode}`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Role not found');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new role
   */
  create(request: RoleCreateRequest): Observable<RoleDto> {
    return this.http
      .post<ApiResponse<RoleDto>>(this.API_URL, request, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Failed to create role');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing role
   */
  update(id: number, request: RoleUpdateRequest): Observable<RoleDto> {
    return this.http
      .put<ApiResponse<RoleDto>>(`${this.API_URL}/${id}`, request, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Failed to update role');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a role
   */
  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.API_URL}/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(
        map(() => undefined),
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.error?.title) {
      errorMessage = error.error.title;
    } else if (error.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else if (error.status >= 500) {
      errorMessage = 'Server error';
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Role Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
