import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  QrCodeSummaryDto,
  QrCodeSyncResultDto,
  QrCodeDisplayData,
  transformQrCodesForDisplay
} from '../models/qr-code.models';

@Injectable({
  providedIn: 'root'
})
export class QrCodesService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly QR_CODES_ENDPOINT = '/QrCodes';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public lastSyncResult = signal<QrCodeSyncResultDto | null>(null);

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

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
   * Get all QR codes from the API
   */
  getQrCodes(): Observable<QrCodeDisplayData[]> {
    this.isLoading.set(true);

    return this.http.get<QrCodeSummaryDto[]>(
      `${this.API_URL}${this.QR_CODES_ENDPOINT}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(qrCodes => {
        // Transform and sort by ID in ascending order
        const transformedQrCodes = transformQrCodesForDisplay(qrCodes);
        return transformedQrCodes.sort((a, b) => a.id - b.id);
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load QR codes');
        return throwError(() => error);
      })
    );
  }

  /**
   * Sync QR codes from external API
   */
  syncQrCodes(): Observable<QrCodeSyncResultDto> {
    this.isSyncing.set(true);
    this.lastSyncResult.set(null);

    return this.http.post<QrCodeSyncResultDto>(
      `${this.API_URL}${this.QR_CODES_ENDPOINT}/sync`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      tap(result => {
        this.isSyncing.set(false);
        this.lastSyncResult.set(result);
        this.showSuccessMessage(
          `QR codes sync completed successfully. ` +
          `${result.inserted} new, ${result.updated} updated out of ${result.total} total.`
        );
      }),
      catchError(error => {
        this.isSyncing.set(false);
        this.handleError(error, 'Failed to sync QR codes');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get QR code by ID (for view/edit operations)
   */
  getQrCodeById(id: number): Observable<QrCodeDisplayData> {
    return this.http.get<QrCodeSummaryDto>(
      `${this.API_URL}${this.QR_CODES_ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      map(qrCode => transformQrCodesForDisplay([qrCode])[0]),
      catchError(error => {
        this.handleError(error, 'Failed to load QR code details');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update QR code (for edit operations)
   */
  updateQrCode(id: number, qrCode: Partial<QrCodeSummaryDto>): Observable<QrCodeDisplayData> {
    return this.http.put<QrCodeSummaryDto>(
      `${this.API_URL}${this.QR_CODES_ENDPOINT}/${id}`,
      qrCode,
      { headers: this.createHeaders() }
    ).pipe(
      map(updatedQrCode => transformQrCodesForDisplay([updatedQrCode])[0]),
      tap(() => {
        this.showSuccessMessage('QR code updated successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to update QR code');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete QR code
   */
  deleteQrCode(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}${this.QR_CODES_ENDPOINT}/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('QR code deleted successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to delete QR code');
        return throwError(() => error);
      })
    );
  }

  /**
   * Export QR codes data
   */
  exportQrCodes(): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}${this.QR_CODES_ENDPOINT}/export`,
      {
        headers: this.createHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('QR codes exported successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to export QR codes');
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear last sync result
   */
  clearSyncResult(): void {
    this.lastSyncResult.set(null);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    if (error.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
      // You might want to redirect to login or clear the token
      localStorage.removeItem('auth_token');
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested QR code resource was not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('QR Codes Service Error:', error);
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 8000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}