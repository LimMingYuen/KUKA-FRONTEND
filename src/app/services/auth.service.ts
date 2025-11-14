import { Injectable, signal } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:5109/api';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  // Reactive state using Angular signals
  public currentUser = signal<User | null>(null);
  public isAuthenticated = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

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

    return this.http.post<ApiResponse<LoginResponseData>>(
      `${this.API_URL}/Login`,
      credentials
    ).pipe(
      map(response => {
        if (response.success && response.data?.token) {
          const user: User = {
            username: response.data.username || credentials.username,
            token: response.data.token,
            isAuthenticated: true
          };

          // Store token and user data
          localStorage.setItem(this.TOKEN_KEY, response.data.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));

          // Update reactive state
          this.currentUser.set(user);
          this.isAuthenticated.set(true);

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
    // Clear stored data
    localStorage.removeItem(this.TOKEN_KEY);
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
}