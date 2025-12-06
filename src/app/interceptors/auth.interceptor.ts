import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * HTTP Interceptor to automatically add JWT token to all requests
 * and handle silent token refresh on 401 errors.
 * Uses functional interceptor pattern (Angular 15+)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const TOKEN_KEY = 'auth_token';
  const REFRESH_TOKEN_KEY = 'refresh_token';

  // Skip auth header for refresh endpoint to avoid circular issues
  const isRefreshRequest = req.url.includes('/Auth/refresh');
  const isLoginRequest = req.url.includes('/Auth/login');
  const isLogoutRequest = req.url.includes('/Auth/logout');

  // Get token from localStorage
  const token = localStorage.getItem(TOKEN_KEY);

  // Clone request and add Authorization header if token exists
  // (except for refresh/login/logout requests)
  let authReq = req;
  if (token && !isRefreshRequest && !isLoginRequest && !isLogoutRequest) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle response and catch 401 errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized and not a refresh/login/logout request, try to refresh token
      if (error.status === 401 && !isRefreshRequest && !isLoginRequest && !isLogoutRequest) {
        // Attempt to refresh the token
        return from(authService.refreshToken()).pipe(
          switchMap((refreshed: boolean) => {
            if (refreshed) {
              // Token was refreshed successfully, retry the original request
              const newToken = localStorage.getItem(TOKEN_KEY);
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            } else {
              // Refresh failed, logout and redirect to login
              clearAuthDataAndRedirect(router, TOKEN_KEY, REFRESH_TOKEN_KEY);
              return throwError(() => error);
            }
          }),
          catchError((refreshError) => {
            // Refresh request itself failed, logout and redirect to login
            clearAuthDataAndRedirect(router, TOKEN_KEY, REFRESH_TOKEN_KEY);
            return throwError(() => refreshError);
          })
        );
      }

      // For refresh/login/logout requests or other errors, just throw
      return throwError(() => error);
    })
  );
};

/**
 * Helper function to clear auth data and redirect to login
 */
function clearAuthDataAndRedirect(router: Router, tokenKey: string, refreshTokenKey: string): void {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(refreshTokenKey);
  localStorage.removeItem('user_data');
  router.navigate(['/login']);
}
