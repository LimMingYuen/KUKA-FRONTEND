// Page Models
export interface PageDto {
  id: number;
  pagePath: string;
  pageName: string;
  pageIcon?: string;
  createdUtc: Date;
}

export interface PageCreateRequest {
  pagePath: string;
  pageName: string;
  pageIcon?: string;
}

export interface PageSyncRequest {
  pages: PageCreateRequest[];
}

export interface PageSyncResponse {
  totalPages: number;
  newPages: number;
  updatedPages: number;
  unchangedPages: number;
}

// Role Permission Models
export interface RolePermissionDto {
  id: number;
  roleId: number;
  roleName: string;
  roleCode: string;
  pageId: number;
  pagePath: string;
  pageName: string;
  canAccess: boolean;
  createdUtc: Date;
}

export interface RolePermissionCreateRequest {
  roleId: number;
  pageId: number;
  canAccess: boolean;
}

export interface RolePagePermissionSet {
  pageId: number;
  canAccess: boolean;
}

export interface RolePermissionBulkSetRequest {
  roleId: number;
  pagePermissions: RolePagePermissionSet[];
}

export interface RolePermissionMatrix {
  roles: RoleInfo[];
  pages: PageInfo[];
  permissions: { [key: string]: boolean }; // Key format: "roleId_pageId"
}

export interface RoleInfo {
  id: number;
  name: string;
  roleCode: string;
}

export interface PageInfo {
  id: number;
  pagePath: string;
  pageName: string;
}

// User Permission Models
export interface UserPermissionDto {
  id: number;
  userId: number;
  username: string;
  pageId: number;
  pagePath: string;
  pageName: string;
  canAccess: boolean;
  createdUtc: Date;
}

export interface UserPermissionCreateRequest {
  userId: number;
  pageId: number;
  canAccess: boolean;
}

export interface UserPagePermissionSet {
  pageId: number;
  canAccess: boolean;
}

export interface UserPermissionBulkSetRequest {
  userId: number;
  pagePermissions: UserPagePermissionSet[];
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data?: T;
}
