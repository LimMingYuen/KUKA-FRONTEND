/**
 * Role Management Models
 * Based on backend RolesController API
 */

/**
 * Role entity
 */
export interface Role {
  id: number;
  name: string;
  roleCode: string;
  isProtected: boolean;
  createdUtc: Date;
  updatedUtc?: Date;
}

/**
 * Role DTO (Data Transfer Object)
 */
export interface RoleDto {
  id: number;
  name: string;
  roleCode: string;
  isProtected: boolean;
  createdUtc: Date;
  updatedUtc?: Date;
}

/**
 * Role create request
 */
export interface RoleCreateRequest {
  name: string;
  roleCode: string;
  isProtected: boolean;
}

/**
 * Role update request
 */
export interface RoleUpdateRequest {
  name: string;
  roleCode: string;
  isProtected: boolean;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data?: T;
}
