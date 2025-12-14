import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { NotificationService } from './notification.service';
import { ConfigService } from './config.service';
import {
  TemplateCategoryDto,
  TemplateCategoryCreateRequest,
  TemplateCategoryUpdateRequest,
  TemplateCategoryApiResponse
} from '../models/template-category.models';

@Injectable({
  providedIn: 'root'
})
export class TemplateCategoryService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/v1';
  }
  private readonly ENDPOINT = '/template-categories';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public categories = signal<TemplateCategoryDto[]>([]);

  private notificationService = inject(NotificationService);

  constructor(private http: HttpClient) {}

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
   * Get all template categories
   */
  getAll(): Observable<TemplateCategoryDto[]> {
    this.isLoading.set(true);
    return this.http.get<TemplateCategoryApiResponse<TemplateCategoryDto[]>>(
      `${this.API_URL}${this.ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => response.data || []),
      tap(categories => {
        this.isLoading.set(false);
        this.categories.set(categories);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load categories');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a single template category by ID
   */
  getById(id: number): Observable<TemplateCategoryDto> {
    return this.http.get<TemplateCategoryApiResponse<TemplateCategoryDto>>(
      `${this.API_URL}${this.ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => response.data as TemplateCategoryDto),
      catchError(error => {
        this.handleError(error, `Failed to load category ${id}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new template category
   */
  create(request: TemplateCategoryCreateRequest): Observable<TemplateCategoryDto> {
    return this.http.post<TemplateCategoryApiResponse<TemplateCategoryDto>>(
      `${this.API_URL}${this.ENDPOINT}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => response.data as TemplateCategoryDto),
      tap(() => {
        this.notificationService.success('Category created successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to create category');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing template category
   */
  update(id: number, request: TemplateCategoryUpdateRequest): Observable<TemplateCategoryDto> {
    return this.http.put<TemplateCategoryApiResponse<TemplateCategoryDto>>(
      `${this.API_URL}${this.ENDPOINT}/${id}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      map(response => response.data as TemplateCategoryDto),
      tap(() => {
        this.notificationService.success('Category updated successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to update category');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a template category
   */
  delete(id: number): Observable<void> {
    return this.http.delete<TemplateCategoryApiResponse<void>>(
      `${this.API_URL}${this.ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.notificationService.success('Category deleted. Templates moved to Uncategorized.');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to delete category');
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
    } else if (error.status === 409) {
      errorMessage = error.error?.detail || 'Category with this name already exists.';
    } else if (error.status === 404) {
      errorMessage = 'Category not found.';
    } else if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.notificationService.error(errorMessage);
    console.error('Template Category Service Error:', error);
  }
}
