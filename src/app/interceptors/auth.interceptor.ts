import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * HTTP Interceptor to automatically add JWT token to all requests
 * Uses functional interceptor pattern (Angular 15+)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const TOKEN_KEY = 'auth_token';

  // Get token from localStorage
  const token = localStorage.getItem(TOKEN_KEY);

  // Clone request and add Authorization header if token exists
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle response and catch 401 errors
  return next(authReq).pipe(
    catchError((error) => {
      // If 401 Unauthorized, clear token and redirect to login
      if (error.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('user_data');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
