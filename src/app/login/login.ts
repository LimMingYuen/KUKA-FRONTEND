import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../services/auth.service';
import { LoginRequest } from '../models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  hidePassword = true;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/workflows']);
    }

    // Check for return URL from query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['returnUrl'] && this.authService.isLoggedIn()) {
          this.router.navigate([params['returnUrl']]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const credentials: LoginRequest = {
        username: this.loginForm.value.username.trim(),
        password: this.loginForm.value.password
      };

      this.authService.login(credentials).subscribe({
        next: (success) => {
          if (success) {
            // Get return URL from query params or default to workflows
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/workflows';
            this.router.navigate([returnUrl]);
          }
        }
      });
    } else {
      // Mark all fields as touched to trigger validation messages
      this.loginForm.markAllAsTouched();
    }
  }

  // Getters for easy template access to form controls
  get usernameControl() {
    return this.loginForm.get('username');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  // Helper methods for validation
  getErrorMessage(control: any): string {
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.minlength?.requiredLength;
      return `Minimum length is ${requiredLength} characters`;
    }
    return '';
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
