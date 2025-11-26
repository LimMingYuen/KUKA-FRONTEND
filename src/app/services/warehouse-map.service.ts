import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FloorInfo,
  MapNode,
  MapZoneDisplay,
  MapRealtimeData,
  CacheStatus,
  MapEdge,
  MapImportResponse,
} from '../models/warehouse-map.models';

/**
 * Service for fetching warehouse map data from backend API
 */
@Injectable({
  providedIn: 'root',
})
export class WarehouseMapService {
  private readonly API_URL = 'http://localhost:5109/api/MapData';

  constructor(private http: HttpClient) {}

  /**
   * Get available floors/maps for tab navigation
   */
  getFloors(): Observable<FloorInfo[]> {
    return this.http.get<FloorInfo[]>(`${this.API_URL}/floors`);
  }

  /**
   * Get QR code nodes for a specific floor/map
   */
  getNodes(floorNumber?: string, mapCode?: string): Observable<MapNode[]> {
    let params = new HttpParams();
    if (floorNumber) {
      params = params.set('floorNumber', floorNumber);
    }
    if (mapCode) {
      params = params.set('mapCode', mapCode);
    }
    return this.http.get<MapNode[]>(`${this.API_URL}/nodes`, { params });
  }

  /**
   * Get zone polygons for a specific floor/map
   */
  getZones(floorNumber?: string, mapCode?: string): Observable<MapZoneDisplay[]> {
    let params = new HttpParams();
    if (floorNumber) {
      params = params.set('floorNumber', floorNumber);
    }
    if (mapCode) {
      params = params.set('mapCode', mapCode);
    }
    return this.http.get<MapZoneDisplay[]>(`${this.API_URL}/zones`, { params });
  }

  /**
   * Get cached realtime data (robots, containers)
   */
  getRealtimeData(floorNumber?: string, mapCode?: string): Observable<MapRealtimeData> {
    let params = new HttpParams();
    if (floorNumber) {
      params = params.set('floorNumber', floorNumber);
    }
    if (mapCode) {
      params = params.set('mapCode', mapCode);
    }
    return this.http.get<MapRealtimeData>(`${this.API_URL}/realtime`, { params });
  }

  /**
   * Get cache status (last update time)
   */
  getCacheStatus(): Observable<CacheStatus> {
    return this.http.get<CacheStatus>(`${this.API_URL}/cache-status`);
  }

  /**
   * Get map edges (connections between nodes) for a specific floor/map
   */
  getEdges(floorNumber?: string, mapCode?: string): Observable<MapEdge[]> {
    let params = new HttpParams();
    if (floorNumber) {
      params = params.set('floorNumber', floorNumber);
    }
    if (mapCode) {
      params = params.set('mapCode', mapCode);
    }
    return this.http.get<MapEdge[]>(`${this.API_URL}/edges`, { params });
  }

  /**
   * Upload and import map JSON file
   */
  uploadMapFile(file: File): Observable<MapImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MapImportResponse>(
      'http://localhost:5109/api/MapImport/upload',
      formData
    );
  }
}
