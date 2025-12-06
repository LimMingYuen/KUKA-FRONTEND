import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError, map, of } from 'rxjs';

import { ApiResponse } from '../models/auth.models';
import { MachineIdResponse, LicenseStatusResponse, RobotLicenseStatus } from '../models/license.models';

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private readonly API_URL = 'http://localhost:5109/api';

  // Reactive state using Angular signals
  public licenseStatus = signal<LicenseStatusResponse | null>(null);
  public isLicenseValid = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public machineId = signal<string>('');
  public displayMachineId = signal<string>('');

  constructor(private http: HttpClient) {
    // Don't auto-check on construction - let app component do it
  }

  /**
   * Get the machine ID (fingerprint) for this machine
   */
  getMachineId(): Observable<MachineIdResponse> {
    return this.http.get<ApiResponse<MachineIdResponse>>(
      `${this.API_URL}/license/machine-id`
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          this.machineId.set(response.data.machineId);
          this.displayMachineId.set(response.data.displayMachineId);
          return response.data;
        }
        throw new Error('Failed to get machine ID');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get the current license status
   */
  getLicenseStatus(): Observable<LicenseStatusResponse> {
    this.isLoading.set(true);

    return this.http.get<ApiResponse<LicenseStatusResponse>>(
      `${this.API_URL}/license/status`
    ).pipe(
      map(response => {
        this.isLoading.set(false);

        if (response.data) {
          this.licenseStatus.set(response.data);
          this.isLicenseValid.set(response.data.isValid);
          return response.data;
        }

        // Handle case where data is null but response exists
        const status: LicenseStatusResponse = {
          isValid: false,
          errorCode: response.code || 'LICENSE_ERROR',
          errorMessage: response.msg || 'Unknown license error'
        };
        this.licenseStatus.set(status);
        this.isLicenseValid.set(false);
        return status;
      }),
      catchError(error => {
        this.isLoading.set(false);

        // Handle license errors gracefully
        const status: LicenseStatusResponse = {
          isValid: false,
          errorCode: error.error?.code || 'LICENSE_ERROR',
          errorMessage: error.error?.msg || 'Failed to check license status'
        };
        this.licenseStatus.set(status);
        this.isLicenseValid.set(false);

        return of(status);
      })
    );
  }

  /**
   * Activate a license by uploading a license file
   */
  activateLicense(file: File): Observable<LicenseStatusResponse> {
    this.isLoading.set(true);

    const formData = new FormData();
    formData.append('licenseFile', file);

    return this.http.post<ApiResponse<LicenseStatusResponse>>(
      `${this.API_URL}/license/activate`,
      formData
    ).pipe(
      map(response => {
        this.isLoading.set(false);

        if (response.success && response.data) {
          this.licenseStatus.set(response.data);
          this.isLicenseValid.set(response.data.isValid);
          return response.data;
        }

        throw new Error(response.msg || 'License activation failed');
      }),
      catchError(error => {
        this.isLoading.set(false);

        const status: LicenseStatusResponse = {
          isValid: false,
          errorCode: error.error?.code || 'LICENSE_ERROR',
          errorMessage: error.error?.msg || 'Failed to activate license'
        };
        this.licenseStatus.set(status);
        this.isLicenseValid.set(false);

        return throwError(() => new Error(status.errorMessage));
      })
    );
  }

  // ============================================
  // ROBOT LICENSE METHODS
  // ============================================

  /**
   * Get license statuses for all robots
   */
  getAllRobotLicenseStatuses(): Observable<RobotLicenseStatus[]> {
    return this.http.get<ApiResponse<RobotLicenseStatus[]>>(
      `${this.API_URL}/license/robots`
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Failed to get robot license statuses:', error);
        return of([]);
      })
    );
  }

  /**
   * Get license status for a specific robot
   */
  getRobotLicenseStatus(robotId: string): Observable<RobotLicenseStatus> {
    return this.http.get<ApiResponse<RobotLicenseStatus>>(
      `${this.API_URL}/license/robots/${encodeURIComponent(robotId)}`
    ).pipe(
      map(response => {
        if (response.data) {
          return response.data;
        }
        return {
          robotId,
          isLicensed: false,
          errorCode: response.code || 'ROBOT_UNLICENSED',
          errorMessage: response.msg || 'Robot is not licensed'
        };
      }),
      catchError(error => {
        return of({
          robotId,
          isLicensed: false,
          errorCode: error.error?.code || 'ROBOT_LICENSE_ERROR',
          errorMessage: error.error?.msg || 'Failed to get robot license status'
        });
      })
    );
  }

  /**
   * Activate a license for a specific robot
   */
  activateRobotLicense(robotId: string, file: File): Observable<RobotLicenseStatus> {
    const formData = new FormData();
    formData.append('licenseFile', file);

    return this.http.post<ApiResponse<RobotLicenseStatus>>(
      `${this.API_URL}/license/robots/${encodeURIComponent(robotId)}/activate`,
      formData
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.msg || 'Robot license activation failed');
      }),
      catchError(error => {
        const status: RobotLicenseStatus = {
          robotId,
          isLicensed: false,
          errorCode: error.error?.code || 'ROBOT_LICENSE_ERROR',
          errorMessage: error.error?.msg || 'Failed to activate robot license'
        };
        return throwError(() => status);
      })
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.error?.msg) {
      // Server-side error with message
      errorMessage = error.error.msg;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else {
      errorMessage = `Server error: ${error.status}`;
    }

    return throwError(() => new Error(errorMessage));
  }
}
