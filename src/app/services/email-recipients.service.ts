import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import {
  EmailRecipientDto,
  EmailRecipientCreateRequest,
  EmailRecipientUpdateRequest,
  TestEmailRequest,
  ApiResponse,
  transformEmailRecipient
} from '../models/email-recipients.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class EmailRecipientsService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/v1/email-recipients';
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
   * Get all email recipients
   */
  getAll(): Observable<EmailRecipientDto[]> {
    return this.http
      .get<ApiResponse<EmailRecipientDto[]>>(this.API_URL, { headers: this.getHeaders() })
      .pipe(
        map((response) => (response.data || []).map(transformEmailRecipient)),
        catchError(this.handleError)
      );
  }

  /**
   * Get email recipient by ID
   */
  getById(id: number): Observable<EmailRecipientDto> {
    return this.http
      .get<ApiResponse<EmailRecipientDto>>(`${this.API_URL}/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Email recipient not found');
          }
          return transformEmailRecipient(response.data);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new email recipient
   */
  create(request: EmailRecipientCreateRequest): Observable<EmailRecipientDto> {
    return this.http
      .post<ApiResponse<EmailRecipientDto>>(this.API_URL, request, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Failed to create email recipient');
          }
          return transformEmailRecipient(response.data);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing email recipient
   */
  update(id: number, request: EmailRecipientUpdateRequest): Observable<EmailRecipientDto> {
    return this.http
      .put<ApiResponse<EmailRecipientDto>>(`${this.API_URL}/${id}`, request, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('Failed to update email recipient');
          }
          return transformEmailRecipient(response.data);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Delete an email recipient
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
   * Send a test email to verify SMTP configuration
   */
  sendTestEmail(testEmailAddress: string): Observable<string> {
    const request: TestEmailRequest = { testEmailAddress };
    return this.http
      .post<ApiResponse<void>>(`${this.API_URL}/test-email`, request, {
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => response.msg || 'Test email sent successfully'),
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

    console.error('Email Recipients Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
