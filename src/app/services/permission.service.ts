import { Injectable, inject } from '@angular/core';
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
  RoleTemplatePermissionDto,
  RoleTemplatePermissionCreateRequest,
  RoleTemplatePermissionBulkSetRequest,
  RoleTemplatePermissionMatrix,
  UserTemplatePermissionDto,
  UserTemplatePermissionCreateRequest,
  UserTemplatePermissionBulkSetRequest,
  ApiResponse
} from '../models/permission.models';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api/v1';
  }

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

  // ==================== Role Template Permissions ====================

  getAllRoleTemplatePermissions(): Observable<RoleTemplatePermissionDto[]> {
    return this.http
      .get<ApiResponse<RoleTemplatePermissionDto[]>>(`${this.API_URL}/role-template-permissions`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getRoleTemplatePermissionsByRoleId(roleId: number): Observable<RoleTemplatePermissionDto[]> {
    return this.http
      .get<ApiResponse<RoleTemplatePermissionDto[]>>(
        `${this.API_URL}/role-template-permissions/role/${roleId}`,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data || []));
  }

  getRoleTemplatePermissionsByTemplateId(templateId: number): Observable<RoleTemplatePermissionDto[]> {
    return this.http
      .get<ApiResponse<RoleTemplatePermissionDto[]>>(
        `${this.API_URL}/role-template-permissions/template/${templateId}`,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data || []));
  }

  getRoleTemplatePermissionMatrix(): Observable<RoleTemplatePermissionMatrix> {
    return this.http
      .get<ApiResponse<RoleTemplatePermissionMatrix>>(
        `${this.API_URL}/role-template-permissions/matrix`,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  createRoleTemplatePermission(
    request: RoleTemplatePermissionCreateRequest
  ): Observable<RoleTemplatePermissionDto> {
    return this.http
      .post<ApiResponse<RoleTemplatePermissionDto>>(
        `${this.API_URL}/role-template-permissions`,
        request,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  updateRoleTemplatePermission(id: number, canAccess: boolean): Observable<RoleTemplatePermissionDto> {
    return this.http
      .put<ApiResponse<RoleTemplatePermissionDto>>(
        `${this.API_URL}/role-template-permissions/${id}`,
        { canAccess },
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  deleteRoleTemplatePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/role-template-permissions/${id}`, {
      headers: this.getHeaders()
    });
  }

  bulkSetRoleTemplatePermissions(
    request: RoleTemplatePermissionBulkSetRequest
  ): Observable<{ modifiedCount: number }> {
    return this.http
      .post<ApiResponse<{ modifiedCount: number }>>(
        `${this.API_URL}/role-template-permissions/bulk-set`,
        request,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  // ==================== User Template Permissions ====================

  getAllUserTemplatePermissions(): Observable<UserTemplatePermissionDto[]> {
    return this.http
      .get<ApiResponse<UserTemplatePermissionDto[]>>(`${this.API_URL}/user-template-permissions`, {
        headers: this.getHeaders()
      })
      .pipe(map((response) => response.data || []));
  }

  getUserTemplatePermissionsByUserId(userId: number): Observable<UserTemplatePermissionDto[]> {
    return this.http
      .get<ApiResponse<UserTemplatePermissionDto[]>>(
        `${this.API_URL}/user-template-permissions/user/${userId}`,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data || []));
  }

  getUserTemplatePermissionsByTemplateId(templateId: number): Observable<UserTemplatePermissionDto[]> {
    return this.http
      .get<ApiResponse<UserTemplatePermissionDto[]>>(
        `${this.API_URL}/user-template-permissions/template/${templateId}`,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data || []));
  }

  createUserTemplatePermission(
    request: UserTemplatePermissionCreateRequest
  ): Observable<UserTemplatePermissionDto> {
    return this.http
      .post<ApiResponse<UserTemplatePermissionDto>>(
        `${this.API_URL}/user-template-permissions`,
        request,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  updateUserTemplatePermission(id: number, canAccess: boolean): Observable<UserTemplatePermissionDto> {
    return this.http
      .put<ApiResponse<UserTemplatePermissionDto>>(
        `${this.API_URL}/user-template-permissions/${id}`,
        { canAccess },
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }

  deleteUserTemplatePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/user-template-permissions/${id}`, {
      headers: this.getHeaders()
    });
  }

  bulkSetUserTemplatePermissions(
    request: UserTemplatePermissionBulkSetRequest
  ): Observable<{ modifiedCount: number }> {
    return this.http
      .post<ApiResponse<{ modifiedCount: number }>>(
        `${this.API_URL}/user-template-permissions/bulk-set`,
        request,
        {
          headers: this.getHeaders()
        }
      )
      .pipe(map((response) => response.data!));
  }
}
