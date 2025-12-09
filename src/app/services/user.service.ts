import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import {
  UserDto,
  UserCreateRequest,
  UserUpdateRequest,
  ApiResponse
} from '../models/user.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/v1/users';
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
   * Get all users
   */
  getAll(): Observable<UserDto[]> {
    return this.http
      .get<ApiResponse<UserDto[]>>(this.API_URL, { headers: this.getHeaders() })
      .pipe(
        map((response) => response.data || []),
        catchError(this.handleError)
      );
  }

  /**
   * Get user by ID
   */
  getById(id: number): Observable<UserDto> {
    return this.http
      .get<ApiResponse<UserDto>>(`${this.API_URL}/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('User not found');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get user by username
   */
  getByUsername(username: string): Observable<UserDto> {
    return this.http
      .get<ApiResponse<UserDto>>(`${this.API_URL}/username/${username}`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('User not found');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new user
   */
  create(request: UserCreateRequest): Observable<UserDto> {
    return this.http
      .post<ApiResponse<UserDto>>(this.API_URL, request, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Failed to create user');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing user
   */
  update(id: number, request: UserUpdateRequest): Observable<UserDto> {
    return this.http
      .put<ApiResponse<UserDto>>(`${this.API_URL}/${id}`, request, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Failed to update user');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a user
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
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else if (error.status >= 500) {
      errorMessage = 'Server error';
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('User Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
