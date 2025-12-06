import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  confirmColor?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirmation-dialog">
      <div class="dialog-icon">
        <mat-icon [class]="getIconClass()">{{ data.icon || 'check_circle' }}</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions [attr.align]="data.showCancel ? 'end' : 'center'">
        @if (data.showCancel) {
          <button mat-button [mat-dialog-close]="false">
            {{ data.cancelText || 'Cancel' }}
          </button>
        }
        <button mat-raised-button [color]="data.confirmColor || 'primary'" [mat-dialog-close]="true">
          {{ data.confirmText || 'OK' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      text-align: center;
      padding: 16px;
    }

    .dialog-icon {
      margin-bottom: 16px;

      .success-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #4caf50;
      }

      .warning-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ff9800;
      }

      .error-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #f44336;
      }
    }

    h2[mat-dialog-title] {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 500;
    }

    mat-dialog-content {
      margin-bottom: 24px;

      p {
        margin: 0;
        color: #666;
        font-size: 14px;
        line-height: 1.5;
      }
    }

    mat-dialog-actions {
      padding: 0;
      margin: 0;
      min-height: auto;

      button {
        min-width: 120px;
      }
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  getIconClass(): string {
    const icon = this.data.icon || 'check_circle';
    if (icon === 'warning' || icon === 'warning_amber') {
      return 'warning-icon';
    } else if (icon === 'error' || icon === 'error_outline' || icon === 'delete') {
      return 'error-icon';
    }
    return 'success-icon';
  }
}
