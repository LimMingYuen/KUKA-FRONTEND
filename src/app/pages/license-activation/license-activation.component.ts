import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';

import { LicenseService } from '../../services/license.service';
import { LicenseStatusResponse } from '../../models/license.models';

@Component({
  selector: 'app-license-activation',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ClipboardModule
  ],
  templateUrl: './license-activation.component.html',
  styleUrl: './license-activation.component.scss'
})
export class LicenseActivationComponent implements OnInit {
  isLoading = signal<boolean>(false);
  machineId = signal<string>('');
  displayMachineId = signal<string>('');
  licenseStatus = signal<LicenseStatusResponse | null>(null);
  selectedFile: File | null = null;
  errorMessage = signal<string>('');

  constructor(
    private licenseService: LicenseService,
    private router: Router,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.loadMachineId();
    this.checkLicenseStatus();
  }

  loadMachineId(): void {
    this.licenseService.getMachineId().subscribe({
      next: (response) => {
        this.machineId.set(response.machineId);
        this.displayMachineId.set(response.displayMachineId);
      },
      error: (error) => {
        console.error('Failed to get machine ID:', error);
        this.errorMessage.set('Failed to get machine ID. Please check if the server is running.');
      }
    });
  }

  checkLicenseStatus(): void {
    this.isLoading.set(true);
    this.licenseService.getLicenseStatus().subscribe({
      next: (status) => {
        this.isLoading.set(false);
        this.licenseStatus.set(status);

        if (status.isValid) {
          // License is valid, redirect to login
          this.snackBar.open('License is valid! Redirecting...', 'Close', { duration: 2000 });
          setTimeout(() => this.router.navigate(['/login']), 1500);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  copyMachineId(): void {
    const id = this.displayMachineId() || this.machineId();
    if (id) {
      this.clipboard.copy(id);
      this.snackBar.open('Machine ID copied to clipboard!', 'Close', { duration: 3000 });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.errorMessage.set('');
    }
  }

  activateLicense(): void {
    if (!this.selectedFile) {
      this.errorMessage.set('Please select a license file');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.licenseService.activateLicense(this.selectedFile).subscribe({
      next: (status) => {
        this.isLoading.set(false);
        this.licenseStatus.set(status);

        if (status.isValid) {
          this.snackBar.open('License activated successfully!', 'Close', { duration: 3000 });
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else {
          this.errorMessage.set(status.errorMessage || 'License activation failed');
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Failed to activate license');
      }
    });
  }

  getErrorCodeDisplay(): string {
    const status = this.licenseStatus();
    if (!status) return '';

    switch (status.errorCode) {
      case 'LICENSE_NOT_FOUND':
        return 'No License Found';
      case 'LICENSE_INVALID_SIGNATURE':
        return 'Invalid License';
      case 'LICENSE_MACHINE_MISMATCH':
        return 'Wrong Machine';
      case 'LICENSE_EXPIRED':
        return 'License Expired';
      case 'LICENSE_PARSE_ERROR':
        return 'Corrupted File';
      default:
        return status.errorCode || 'Error';
    }
  }
}
