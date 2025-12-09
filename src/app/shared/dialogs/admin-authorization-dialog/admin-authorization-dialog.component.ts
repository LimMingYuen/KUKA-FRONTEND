import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ConfigService } from '../../../services/config.service';

export interface AdminAuthorizationDialogData {
  title: string;
  message: string;
  actionLabel?: string;
}

export interface AdminAuthorizationDialogResult {
  authorized: boolean;
  adminUsername?: string;
}

interface VerifyAdminResponse {
  isValid: boolean;
  adminUsername?: string;
  message?: string;
}

interface ApiResponse<T> {
  success: boolean;
  code: string;
  msg: string;
  data?: T;
}

@Component({
  selector: 'app-admin-authorization-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule
  ],
  templateUrl: './admin-authorization-dialog.component.html',
  styleUrl: './admin-authorization-dialog.component.scss'
})
export class AdminAuthorizationDialogComponent {
  private config = inject(ConfigService);
  private get API_URL(): string {
    return this.config.apiUrl + '/api';
  }

  public username: string = '';
  public password: string = '';
  public isLoading: boolean = false;
  public errorMessage: string = '';
  public hidePassword: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<AdminAuthorizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AdminAuthorizationDialogData,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  onCancel(): void {
    this.dialogRef.close({ authorized: false } as AdminAuthorizationDialogResult);
  }

  onVerify(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post<ApiResponse<VerifyAdminResponse>>(
      `${this.API_URL}/Auth/verify-admin`,
      { username: this.username, password: this.password },
      {
        headers: {
          'Authorization': `Bearer ${this.authService.getToken()}`
        }
      }
    ).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        if (response.success && response.data?.isValid) {
          this.dialogRef.close({
            authorized: true,
            adminUsername: response.data.adminUsername
          } as AdminAuthorizationDialogResult);
        } else {
          this.errorMessage = response.msg || response.data?.message || 'Admin verification failed';
        }
      },
      error: (error) => {
        if (error.status === 401) {
          this.errorMessage = 'Session expired. Please log in again.';
        } else {
          this.errorMessage = error.error?.msg || 'Failed to verify admin credentials';
        }
      }
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
