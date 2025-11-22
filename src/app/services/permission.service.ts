import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  PageDto,
  PageCreateRequest,
  PageSyncRequest,
  PageSyncResponse,
  RolePermissionDto,
  RolePermissionCreateRequest,
  RolePermissionBulkSetRequest,
  RolePermissionMatrix,
  UserPermissionDto,
  UserPermissionCreateRequest,
  UserPermissionBulkSetRequest,
  ApiResponse
} from '../models/permission.models';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly API_URL = 'http://localhost:5109/api/v1';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  // ==================== Page Management ====================

  getAllPages(): Observable<PageDto[]> {
    return this.http
      .get<ApiResponse<PageDto[]>>(`${this.API_URL}/pages`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getPageById(id: number): Observable<PageDto> {
    return this.http
      .get<ApiResponse<PageDto>>(`${this.API_URL}/pages/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  getPageByPath(pagePath: string): Observable<PageDto> {
    // Encode the path to handle leading slash
    const encodedPath = encodeURIComponent(pagePath);
    return this.http
      .get<ApiResponse<PageDto>>(`${this.API_URL}/pages/path/${encodedPath}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  createPage(request: PageCreateRequest): Observable<PageDto> {
    return this.http
      .post<ApiResponse<PageDto>>(`${this.API_URL}/pages`, request, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  updatePage(id: number, request: PageCreateRequest): Observable<PageDto> {
    return this.http
      .put<ApiResponse<PageDto>>(`${this.API_URL}/pages/${id}`, request, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  deletePage(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.API_URL}/pages/${id}`, {
        headers: this.getHeaders()
      });
  }

  syncPages(request: PageSyncRequest): Observable<PageSyncResponse> {
    return this.http
      .post<ApiResponse<PageSyncResponse>>(`${this.API_URL}/pages/sync`, request, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  // ==================== Role Permissions ====================

  getAllRolePermissions(): Observable<RolePermissionDto[]> {
    return this.http
      .get<ApiResponse<RolePermissionDto[]>>(`${this.API_URL}/role-permissions`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getRolePermissionById(id: number): Observable<RolePermissionDto> {
    return this.http
      .get<ApiResponse<RolePermissionDto>>(`${this.API_URL}/role-permissions/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  getRolePermissionsByRoleId(roleId: number): Observable<RolePermissionDto[]> {
    return this.http
      .get<ApiResponse<RolePermissionDto[]>>(`${this.API_URL}/role-permissions/role/${roleId}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getRolePermissionsByPageId(pageId: number): Observable<RolePermissionDto[]> {
    return this.http
      .get<ApiResponse<RolePermissionDto[]>>(`${this.API_URL}/role-permissions/page/${pageId}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getRolePermissionMatrix(): Observable<RolePermissionMatrix> {
    return this.http
      .get<ApiResponse<RolePermissionMatrix>>(`${this.API_URL}/role-permissions/matrix`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  createRolePermission(request: RolePermissionCreateRequest): Observable<RolePermissionDto> {
    return this.http
      .post<ApiResponse<RolePermissionDto>>(`${this.API_URL}/role-permissions`, request, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  updateRolePermission(id: number, canAccess: boolean): Observable<RolePermissionDto> {
    return this.http
      .put<ApiResponse<RolePermissionDto>>(
        `${this.API_URL}/role-permissions/${id}`,
        { canAccess },
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  deleteRolePermission(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.API_URL}/role-permissions/${id}`, {
        headers: this.getHeaders()
      });
  }

  bulkSetRolePermissions(request: RolePermissionBulkSetRequest): Observable<{ modifiedCount: number }> {
    return this.http
      .post<ApiResponse<{ modifiedCount: number }>>(
        `${this.API_URL}/role-permissions/bulk-set`,
        request,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  // ==================== User Permissions ====================

  getAllUserPermissions(): Observable<UserPermissionDto[]> {
    return this.http
      .get<ApiResponse<UserPermissionDto[]>>(`${this.API_URL}/user-permissions`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getUserPermissionById(id: number): Observable<UserPermissionDto> {
    return this.http
      .get<ApiResponse<UserPermissionDto>>(`${this.API_URL}/user-permissions/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  getUserPermissionsByUserId(userId: number): Observable<UserPermissionDto[]> {
    return this.http
      .get<ApiResponse<UserPermissionDto[]>>(`${this.API_URL}/user-permissions/user/${userId}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getUserPermissionsByPageId(pageId: number): Observable<UserPermissionDto[]> {
    return this.http
      .get<ApiResponse<UserPermissionDto[]>>(`${this.API_URL}/user-permissions/page/${pageId}`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  createUserPermission(request: UserPermissionCreateRequest): Observable<UserPermissionDto> {
    return this.http
      .post<ApiResponse<UserPermissionDto>>(`${this.API_URL}/user-permissions`, request, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data!));
  }

  updateUserPermission(id: number, canAccess: boolean): Observable<UserPermissionDto> {
    return this.http
      .put<ApiResponse<UserPermissionDto>>(
        `${this.API_URL}/user-permissions/${id}`,
        { canAccess },
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  deleteUserPermission(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.API_URL}/user-permissions/${id}`, {
        headers: this.getHeaders()
      });
  }

  bulkSetUserPermissions(request: UserPermissionBulkSetRequest): Observable<{ modifiedCount: number }> {
    return this.http
      .post<ApiResponse<{ modifiedCount: number }>>(
        `${this.API_URL}/user-permissions/bulk-set`,
        request,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }
}
