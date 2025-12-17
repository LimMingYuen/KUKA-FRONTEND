import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  ApiResponse,
  UtilizationMetrics,
  UtilizationRequest,
  RobotInfo,
  transformUtilizationData,
  getDefaultDateRange,
  isValidDateRange
} from '../models/robot-analytics.models';
import { MobileRobotsService } from './mobile-robots.service';
import { MobileRobotDisplayData } from '../models/mobile-robot.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class RobotAnalyticsService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/v1/robots';
  }

  /**
   * Format date as local ISO string WITH timezone offset.
   * This ensures the backend receives the exact date/time the user selected
   * in their local timezone (e.g., Malaysia UTC+8) and can correctly convert to UTC.
   * Example output: "2025-12-10T00:00:00+08:00" for Malaysia
   */
  private formatLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Get timezone offset in minutes and convert to +HH:MM format
    const offsetMinutes = -date.getTimezoneOffset(); // Negative because getTimezoneOffset returns opposite sign
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
  }

  // Reactive state using signals
  public utilizationData = signal<UtilizationMetrics | null>(null);
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);
  public availableRobots = signal<RobotInfo[]>([]);

  constructor(
    private http: HttpClient,
    private mobileRobotsService: MobileRobotsService
  ) {}

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
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
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
        this.error.set('You do not have permission to view analytics.');
      } else if (error.status === 404) {
        this.error.set('No robots found or robot not available.');
      } else if (error.status === 400) {
        this.error.set(error.error?.msg || 'Invalid request parameters.');
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
   * Get robot utilization metrics
   */
  public getUtilization(request: UtilizationRequest): Observable<UtilizationMetrics> {
    this.isLoading.set(true);
    this.clearError();

    // Validate date range
    if (request.start && request.end && !isValidDateRange(request.start, request.end)) {
      this.isLoading.set(false);
      this.error.set('End date must be after start date');
      return throwError(() => new Error('Invalid date range'));
    }

    // Build query parameters
    let params = new HttpParams();

    if (request.robotId) {
      params = params.set('robotId', request.robotId);
    }

    if (request.start) {
      // Use local time format instead of UTC to match user's selected date/time
      params = params.set('start', this.formatLocalDateTime(request.start));
    }

    if (request.end) {
      // Use local time format instead of UTC to match user's selected date/time
      params = params.set('end', this.formatLocalDateTime(request.end));
    }

    if (request.groupBy) {
      params = params.set('groupBy', request.groupBy);
    }

    const headers = this.getHttpHeaders();
    const requestUrl = `${this.API_URL}/utilization`;

    return this.http.get<ApiResponse<any>>(requestUrl, {
      headers: headers,
      params: params
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const metrics = transformUtilizationData(response.data, request);
          this.utilizationData.set(metrics);
          this.isLoading.set(false);
          return metrics;
        } else {
          throw new Error(response.msg || 'Failed to load utilization data');
        }
      }),
      catchError(this.handleError<UtilizationMetrics>('getUtilization'))
    );
  }

  /**
   * Get utilization debug information
   */
  public getUtilizationDebug(request: Partial<UtilizationRequest>): Observable<any> {
    this.clearError();

    let params = new HttpParams();

    if (request.robotId) {
      params = params.set('robotId', request.robotId);
    }

    if (request.start) {
      params = params.set('start', this.formatLocalDateTime(request.start));
    }

    if (request.end) {
      params = params.set('end', this.formatLocalDateTime(request.end));
    }

    return this.http.get<ApiResponse<any>>(`${this.API_URL}/utilization/debug`, {
      headers: this.getHttpHeaders(),
      params: params
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        } else {
          throw new Error(response.msg || 'Failed to load debug data');
        }
      }),
      catchError(this.handleError<any>('getUtilizationDebug'))
    );
  }

  /**
   * Get available robots for analytics
   * Integrates with the existing mobile robots service
   */
  public getAvailableRobots(): Observable<RobotInfo[]> {
    this.clearError();

    return this.mobileRobotsService.getMobileRobots().pipe(
      map(mobileRobots => {
        // Transform mobile robots to RobotInfo format for analytics
        const robots: RobotInfo[] = mobileRobots.map(robot => ({
          id: robot.robotId,
          name: `Robot ${robot.robotId}`,
          type: robot.robotTypeCode || 'AMR'
        }));

        this.availableRobots.set(robots);
        return robots;
      }),
      catchError(this.handleError<RobotInfo[]>('getAvailableRobots'))
    );
  }

  /**
   * Refresh utilization data with current parameters
   */
  public refreshUtilization(): Observable<UtilizationMetrics> | null {
    const currentData = this.utilizationData();

    if (!currentData) {
      return null;
    }

    const request: UtilizationRequest = {
      robotId: currentData.robotId,
      start: new Date(currentData.timeRange.start),
      end: new Date(currentData.timeRange.end),
      groupBy: currentData.grouping
    };

    return this.getUtilization(request);
  }

  /**
   * Get default utilization (last 7 days, daily grouping, first robot)
   */
  public getDefaultUtilization(robotId?: string): Observable<UtilizationMetrics> {
    const dateRange = getDefaultDateRange();

    const request: UtilizationRequest = {
      robotId: robotId,
      start: dateRange.start,
      end: dateRange.end,
      groupBy: 'day'
    };

    return this.getUtilization(request);
  }

  /**
   * Check if service has valid authentication token
   */
  public hasValidToken(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Export utilization data to CSV
   */
  public exportToCsv(metrics: UtilizationMetrics): void {
    if (!metrics || !metrics.dataPoints || metrics.dataPoints.length === 0) {
      console.warn('No data to export');
      return;
    }

    // CSV header
    const headers = ['Timestamp', 'Utilization Rate (%)', 'Working Time (min)', 'Charging Time (min)', 'Idle Time (min)'];
    const csvRows = [headers.join(',')];

    // Data rows
    metrics.dataPoints.forEach(point => {
      const row = [
        point.timestamp,
        point.utilizationRate.toString(),
        point.workingMinutes.toString(),
        point.chargingMinutes.toString(),
        point.idleMinutes.toString()
      ];
      csvRows.push(row.join(','));
    });

    // Summary rows
    csvRows.push(''); // Empty line
    csvRows.push('Summary Statistics');
    csvRows.push(`Average Utilization,${metrics.summary.averageUtilization}%`);
    csvRows.push(`Total Working Time,${metrics.summary.totalWorkingTime} min`);
    csvRows.push(`Total Charging Time,${metrics.summary.totalChargingTime} min`);
    csvRows.push(`Total Idle Time,${metrics.summary.totalIdleTime} min`);
    csvRows.push(`Peak Utilization,${metrics.summary.peakUtilization.value}%,${metrics.summary.peakUtilization.timestamp}`);
    csvRows.push(`Lowest Utilization,${metrics.summary.lowestUtilization.value}%,${metrics.summary.lowestUtilization.timestamp}`);

    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `robot-analytics-${metrics.robotId}-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
