import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, catchError, map } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  LoginRequest,
  LoginResponseData,
  ApiResponse,
  User
} from '../models/auth.models';
import { PageInitializationService } from './page-initialization.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  // Reactive state using Angular signals
  public currentUser = signal<User | null>(null);
  public isAuthenticated = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  // Track if a refresh is in progress to prevent multiple simultaneous refresh calls
  private refreshInProgress = false;
  private refreshPromise: Promise<boolean> | null = null;

  private pageInitService = inject(PageInitializationService);

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.checkAuthStatus();
  }

  /**
   * Login user with credentials
   */
  login(credentials: LoginRequest): Observable<boolean> {
    this.isLoading.set(true);

    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/Auth/login`,
      credentials
    ).pipe(
      map(response => {
        if (response.success && response.data?.token) {
          const userData = response.data.user || {};
          const user: User = {
            id: userData.id,
            username: userData.username || credentials.username,
            nickname: userData.nickname,
            token: response.data.token,
            refreshToken: response.data.refreshToken,
            tokenExpiresAt: response.data.expiresAt ? new Date(response.data.expiresAt) : undefined,
            refreshTokenExpiresAt: response.data.refreshTokenExpiresAt ? new Date(response.data.refreshTokenExpiresAt) : undefined,
            isAuthenticated: true,
            isSuperAdmin: userData.isSuperAdmin || false,
            roles: userData.roles || [],
            allowedPages: userData.allowedPages || [],
            allowedTemplates: userData.allowedTemplates || []
          };

          // Store tokens and user data
          localStorage.setItem(this.TOKEN_KEY, response.data.token);
          if (response.data.refreshToken) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, response.data.refreshToken);
          }
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));

          // Update reactive state
          this.currentUser.set(user);
          this.isAuthenticated.set(true);

          // Initialize pages in the background (don't wait for it)
          this.pageInitService.initializePages().catch(err => {
            console.warn('Page initialization failed (non-critical):', err);
          });

          this.snackBar.open('Login successful!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });

          return true;
        } else {
          this.snackBar.open(response.msg || 'Login failed', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return false;
        }
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Login failed. Please try again.';

        if (error.error?.msg) {
          errorMessage = error.error.msg;
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }

        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });

        return throwError(() => error);
      }),
      // Final block to set loading to false
      map((result) => {
        this.isLoading.set(false);
        return result;
      })
    );
  }

  /**
   * Logout user and clear stored data
   */
  logout(): void {
    // Revoke refresh token on server (fire and forget)
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http.post(`${this.API_URL}/Auth/logout`, { refreshToken })
        .subscribe({
          error: () => {} // Silently ignore errors
        });
    }

    // Clear stored data
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    // Update reactive state
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    this.snackBar.open('Logged out successfully', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });

    // Navigate to login page
    this.router.navigate(['/login']);
  }

  /**
   * Check authentication status on app initialization
   */
  private checkAuthStatus(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user: User = JSON.parse(userStr);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (error) {
        // Clear corrupted data
        this.logout();
      }
    }
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Returns a promise that resolves to true if refresh was successful, false otherwise.
   * Implements request deduplication - multiple calls during refresh will share the same promise.
   */
  async refreshToken(): Promise<boolean> {
    // If a refresh is already in progress, return the existing promise
    if (this.refreshInProgress && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.refreshInProgress = true;
    this.refreshPromise = this.performTokenRefresh(refreshToken);

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh HTTP call
   */
  private async performTokenRefresh(refreshToken: string): Promise<boolean> {
    try {
      const response = await this.http.post<ApiResponse<any>>(
        `${this.API_URL}/Auth/refresh`,
        { refreshToken }
      ).toPromise();

      if (response?.success && response.data?.token) {
        const userData = response.data.user || {};
        const user: User = {
          id: userData.id,
          username: userData.username,
          nickname: userData.nickname,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          tokenExpiresAt: response.data.expiresAt ? new Date(response.data.expiresAt) : undefined,
          refreshTokenExpiresAt: response.data.refreshTokenExpiresAt ? new Date(response.data.refreshTokenExpiresAt) : undefined,
          isAuthenticated: true,
          isSuperAdmin: userData.isSuperAdmin || false,
          roles: userData.roles || [],
          allowedPages: userData.allowedPages || [],
          allowedTemplates: userData.allowedTemplates || []
        };

        // Store new tokens and user data
        localStorage.setItem(this.TOKEN_KEY, response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, response.data.refreshToken);
        }
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));

        // Update reactive state
        this.currentUser.set(user);
        this.isAuthenticated.set(true);

        console.log('Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Get current user value
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Check if user can access a specific page path
   */
  canAccessPage(pagePath: string): boolean {
    const user = this.currentUser();

    if (!user || !this.isAuthenticated()) {
      return false;
    }

    // SuperAdmin can access everything
    if (user.isSuperAdmin) {
      return true;
    }

    // Check if page is in user's allowed pages
    const normalizedPath = pagePath.toLowerCase().trim();
    return user.allowedPages?.some(
      (allowedPath) => allowedPath.toLowerCase().trim() === normalizedPath
    ) || false;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(roleCode: string): boolean {
    const user = this.currentUser();
    if (!user || !this.isAuthenticated()) {
      return false;
    }

    return user.roles?.includes(roleCode.toUpperCase()) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roleCodes: string[]): boolean {
    const user = this.currentUser();
    if (!user || !this.isAuthenticated()) {
      return false;
    }

    return roleCodes.some((roleCode) =>
      user.roles?.includes(roleCode.toUpperCase())
    );
  }

  /**
   * Check if user is a SuperAdmin
   */
  isSuperAdmin(): boolean {
    const user = this.currentUser();
    return user?.isSuperAdmin || false;
  }

  /**
   * Get user's allowed page paths
   */
  getAllowedPages(): string[] {
    const user = this.currentUser();
    return user?.allowedPages || [];
  }

  /**
   * Check if user can access a specific template by ID
   */
  canAccessTemplate(templateId: number): boolean {
    const user = this.currentUser();

    if (!user || !this.isAuthenticated()) {
      return false;
    }

    // SuperAdmin can access all templates
    if (user.isSuperAdmin) {
      return true;
    }

    // Check if template is in user's allowed templates
    return user.allowedTemplates?.includes(templateId) || false;
  }

  /**
   * Get user's allowed template IDs
   */
  getAllowedTemplates(): number[] {
    const user = this.currentUser();
    return user?.allowedTemplates || [];
  }
}