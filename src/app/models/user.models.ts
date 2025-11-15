/**
 * User Management Models
 * Based on backend UsersController API
 */

/**
 * User entity
 */
export interface User {
  id: number;
  username: string;
  nickname: string;
  isSuperAdmin: boolean;
  roles: string[];
  createTime: Date;
  createBy: string;
  createApp: string;
  lastUpdateTime?: Date;
  lastUpdateBy?: string;
  lastUpdateApp?: string;
}

/**
 * User DTO (Data Transfer Object)
 */
export interface UserDto {
  id: number;
  username: string;
  nickname: string;
  isSuperAdmin: boolean;
  roles: string[];
  createTime: Date;
  createBy: string;
  createApp: string;
  lastUpdateTime?: Date;
  lastUpdateBy?: string;
  lastUpdateApp?: string;
}

/**
 * User create request
 */
export interface UserCreateRequest {
  username: string;
  nickname: string;
  isSuperAdmin: boolean;
  roles?: string[];
  createBy: string;
  createApp: string;
}

/**
 * User update request
 */
export interface UserUpdateRequest {
  username: string;
  nickname: string;
  isSuperAdmin: boolean;
  roles?: string[];
  lastUpdateBy: string;
  lastUpdateApp: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data?: T;
}
