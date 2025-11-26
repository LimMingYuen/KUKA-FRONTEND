export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponseData {
  token?: string;
  username?: string;
  expiresIn?: number;
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  msg: string;
  data?: T;
}

export interface User {
  id?: number;
  username: string;
  nickname?: string;
  token: string;
  isAuthenticated: boolean;
  isSuperAdmin?: boolean;
  roles?: string[];
  allowedPages?: string[];
  allowedTemplates?: number[];
}