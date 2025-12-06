export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponseData {
  token?: string;
  expiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  user?: {
    id?: number;
    username?: string;
    nickname?: string;
    isSuperAdmin?: boolean;
    roles?: string[];
    allowedPages?: string[];
    allowedTemplates?: number[];
  };
  [key: string]: any;
}

export interface RefreshTokenRequest {
  refreshToken: string;
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
  refreshToken?: string;
  tokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  isAuthenticated: boolean;
  isSuperAdmin?: boolean;
  roles?: string[];
  allowedPages?: string[];
  allowedTemplates?: number[];
}