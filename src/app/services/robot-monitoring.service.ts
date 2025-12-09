import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { NotificationService } from './notification.service';
import {
  RobotMonitoringMap,
  RobotMonitoringMapSummary,
  CreateMapRequest,
  UpdateMapRequest,
  ImageUploadResponse,
  MapData,
  MapNode
} from '../models/robot-monitoring.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class RobotMonitoringService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api';
  }
  private readonly ENDPOINT = '/RobotMonitoring';

  // Reactive state using Angular signals
  public isLoading = signal<boolean>(false);
  public selectedMap = signal<RobotMonitoringMap | null>(null);
  public mapData = signal<MapData | null>(null);

  private notificationService = inject(NotificationService);

  constructor(
    private http: HttpClient
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
   * Create HTTP headers for file upload
   */
  private createUploadHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ==================== Map Configuration CRUD ====================

  /**
   * Get all map configurations
   */
  getMaps(): Observable<RobotMonitoringMapSummary[]> {
    this.isLoading.set(true);

    return this.http.get<RobotMonitoringMapSummary[]>(
      `${this.API_URL}${this.ENDPOINT}/maps`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => this.isLoading.set(false)),
      catchError(error => {
        this.isLoading.set(false);
        this.handleError(error, 'Failed to load map configurations');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a specific map configuration by ID
   */
  getMapById(id: number): Observable<RobotMonitoringMap> {
    return this.http.get<RobotMonitoringMap>(
      `${this.API_URL}${this.ENDPOINT}/maps/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(map => this.selectedMap.set(map)),
      catchError(error => {
        this.handleError(error, 'Failed to load map configuration');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get the default map configuration
   */
  getDefaultMap(): Observable<RobotMonitoringMap> {
    return this.http.get<RobotMonitoringMap>(
      `${this.API_URL}${this.ENDPOINT}/maps/default`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(map => this.selectedMap.set(map)),
      catchError(error => {
        // Don't show error for 404 - just means no default map
        if (error.status !== 404) {
          this.handleError(error, 'Failed to load default map');
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new map configuration
   */
  createMap(request: CreateMapRequest): Observable<RobotMonitoringMap> {
    return this.http.post<RobotMonitoringMap>(
      `${this.API_URL}${this.ENDPOINT}/maps`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(map => {
        this.showSuccessMessage('Map configuration created successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to create map configuration');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing map configuration
   */
  updateMap(id: number, request: UpdateMapRequest): Observable<RobotMonitoringMap> {
    return this.http.put<RobotMonitoringMap>(
      `${this.API_URL}${this.ENDPOINT}/maps/${id}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(map => {
        this.selectedMap.set(map);
        this.showSuccessMessage('Map configuration updated successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to update map configuration');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a map configuration
   */
  deleteMap(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}${this.ENDPOINT}/maps/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        if (this.selectedMap()?.id === id) {
          this.selectedMap.set(null);
        }
        this.showSuccessMessage('Map configuration deleted successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to delete map configuration');
        return throwError(() => error);
      })
    );
  }

  // ==================== Background Image ====================

  /**
   * Upload a background image for a map
   */
  uploadBackgroundImage(mapId: number, file: File): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImageUploadResponse>(
      `${this.API_URL}${this.ENDPOINT}/maps/${mapId}/background`,
      formData,
      { headers: this.createUploadHeaders() }
    ).pipe(
      tap(response => {
        if (response.success) {
          this.showSuccessMessage('Background image uploaded successfully');
        }
      }),
      catchError(error => {
        this.handleError(error, 'Failed to upload background image');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete the background image for a map
   */
  deleteBackgroundImage(mapId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}${this.ENDPOINT}/maps/${mapId}/background`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => {
        this.showSuccessMessage('Background image deleted successfully');
      }),
      catchError(error => {
        this.handleError(error, 'Failed to delete background image');
        return throwError(() => error);
      })
    );
  }

  // ==================== Map Data ====================

  /**
   * Get map data (nodes and zones) for rendering
   */
  getMapData(mapCode?: string, floorNumber?: string): Observable<MapData> {
    let url = `${this.API_URL}${this.ENDPOINT}/map-data`;
    const params: string[] = [];

    if (mapCode) params.push(`mapCode=${encodeURIComponent(mapCode)}`);
    if (floorNumber) params.push(`floorNumber=${encodeURIComponent(floorNumber)}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<MapData>(url, { headers: this.createHeaders() }).pipe(
      tap(data => this.mapData.set(data)),
      catchError(error => {
        this.handleError(error, 'Failed to load map data');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get map nodes from local QrCode table (filtered by mapCode and floorNumber, NodeUuid != null)
   */
  getMapNodes(mapCode?: string, floorNumber?: string): Observable<MapNode[]> {
    let url = `${this.API_URL}/QrCodes/map-nodes`;
    const params: string[] = [];

    if (mapCode) params.push(`mapCode=${encodeURIComponent(mapCode)}`);
    if (floorNumber) params.push(`floorNumber=${encodeURIComponent(floorNumber)}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<MapNode[]>(url, { headers: this.createHeaders() }).pipe(
      catchError(error => {
        this.handleError(error, 'Failed to load map nodes');
        return throwError(() => error);
      })
    );
  }

  // ==================== Available Options ====================

  /**
   * Get available map codes
   */
  getMapCodes(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.API_URL}${this.ENDPOINT}/map-codes`,
      { headers: this.createHeaders() }
    ).pipe(
      catchError(error => {
        this.handleError(error, 'Failed to load map codes');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get available floor numbers for a map code
   */
  getFloorNumbers(mapCode?: string): Observable<string[]> {
    let url = `${this.API_URL}${this.ENDPOINT}/floor-numbers`;
    if (mapCode) {
      url += `?mapCode=${encodeURIComponent(mapCode)}`;
    }

    return this.http.get<string[]>(url, { headers: this.createHeaders() }).pipe(
      catchError(error => {
        this.handleError(error, 'Failed to load floor numbers');
        return throwError(() => error);
      })
    );
  }

  // ==================== Error Handling ====================

  /**
   * Handle HTTP errors
   */
  private handleError(error: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    if (error.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
      localStorage.removeItem('auth_token');
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.showErrorMessage(errorMessage);
    console.error('Robot Monitoring Service Error:', error);
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
}
