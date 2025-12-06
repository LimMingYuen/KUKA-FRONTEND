import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LicenseService } from '../../../services/license.service';
import { RobotLicenseStatus } from '../../../models/license.models';

export interface RobotLicenseDialogData {
  robotId: string;
  currentStatus?: RobotLicenseStatus;
}

export interface RobotLicenseDialogResult {
  success: boolean;
  status?: RobotLicenseStatus;
}

@Component({
  selector: 'app-robot-license-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './robot-license-dialog.component.html',
  styleUrl: './robot-license-dialog.component.scss'
})
export class RobotLicenseDialogComponent {
  public isLoading = false;
  public selectedFile: File | null = null;
  public errorMessage: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<RobotLicenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RobotLicenseDialogData,
    private licenseService: LicenseService,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.errorMessage = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.lic')) {
        this.selectedFile = file;
        this.errorMessage = null;
      } else {
        this.errorMessage = 'Please select a valid license file (.lic)';
      }
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.errorMessage = null;
  }

  copyRobotId(): void {
    navigator.clipboard.writeText(this.data.robotId).then(() => {
      this.snackBar.open('Robot ID copied to clipboard', 'Close', {
        duration: 2000
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  onActivate(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a license file';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.licenseService.activateRobotLicense(this.data.robotId, this.selectedFile).subscribe({
      next: (status) => {
        this.isLoading = false;
        this.snackBar.open('Robot license activated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close({ success: true, status });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.errorMessage || 'Failed to activate robot license';
        this.snackBar.open(this.errorMessage ?? 'Failed to activate robot license', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
