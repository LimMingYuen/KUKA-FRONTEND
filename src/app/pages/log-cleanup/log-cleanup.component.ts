import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LogCleanupService } from '../../services/log-cleanup.service';

@Component({
  selector: 'app-log-cleanup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="log-cleanup-container">
      <div class="page-header">
        <h1>Log Cleanup</h1>
        <p class="page-subtitle">Manage log file retention and cleanup old log folders</p>
      </div>

      <!-- Retention Settings Card -->
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>settings</mat-icon>
            Retention Settings
          </mat-card-title>
          <mat-card-subtitle>
            Configure how long log files should be retained
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading settings...</p>
          </div>

          <div *ngIf="!isLoading" class="settings-form">
            <div class="setting-row">
              <mat-form-field appearance="outline" class="retention-select">
                <mat-label>Retention Period</mat-label>
                <mat-select [(ngModel)]="retentionMonths">
                  <mat-option *ngFor="let option of retentionOptions" [value]="option.value">
                    {{ option.label }}
                  </mat-option>
                </mat-select>
                <mat-hint>Logs older than this period will be deleted during cleanup</mat-hint>
              </mat-form-field>
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-raised-button
                  color="primary"
                  (click)="saveSetting()"
                  [disabled]="isSaving || isLoading">
            <mat-icon>save</mat-icon>
            {{ isSaving ? 'Saving...' : 'Save Setting' }}
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Manual Cleanup Card -->
      <mat-card class="cleanup-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>cleaning_services</mat-icon>
            Manual Cleanup
          </mat-card-title>
          <mat-card-subtitle>
            Run log cleanup immediately to remove old log folders
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="cleanup-info">
            <mat-icon class="info-icon">info</mat-icon>
            <p>
              Clicking "Run Cleanup" will delete all log folders older than
              <strong>{{ retentionMonths }} month(s)</strong>.
              This action cannot be undone.
            </p>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-raised-button
                  color="warn"
                  (click)="runCleanup()"
                  [disabled]="isRunningCleanup || isLoading">
            <mat-icon>{{ isRunningCleanup ? 'hourglass_empty' : 'delete_sweep' }}</mat-icon>
            {{ isRunningCleanup ? 'Running Cleanup...' : 'Run Cleanup' }}
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Log Folders Card -->
      <mat-card class="folders-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>folder</mat-icon>
            Log Folders
          </mat-card-title>
          <mat-card-subtitle>
            Current log folders in the system ({{ folders.length }} folders)
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="isLoadingFolders" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading folders...</p>
          </div>

          <div *ngIf="!isLoadingFolders && folders.length === 0" class="empty-state">
            <mat-icon>folder_off</mat-icon>
            <p>No log folders found</p>
          </div>

          <div *ngIf="!isLoadingFolders && folders.length > 0" class="folders-list">
            <div *ngFor="let folder of folders" class="folder-item">
              <mat-icon>folder</mat-icon>
              <span class="folder-name">{{ folder }}</span>
              <span class="folder-status" [class.old]="isOldFolder(folder)" [class.current]="!isOldFolder(folder)">
                {{ isOldFolder(folder) ? 'Will be deleted' : 'Will be kept' }}
              </span>
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button
                  (click)="refreshFolders()"
                  [disabled]="isLoadingFolders">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .log-cleanup-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .page-subtitle {
      margin: 8px 0 0 0;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }

    .settings-card,
    .cleanup-card,
    .folders-card {
      margin-bottom: 24px;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-card-title mat-icon {
      color: #ff6600;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: rgba(0, 0, 0, 0.6);
    }

    .loading-container p {
      margin-top: 16px;
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .setting-row {
      padding: 8px 0;
    }

    .retention-select {
      width: 250px;
    }

    .cleanup-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background-color: #fff3e0;
      border-radius: 8px;
      border-left: 4px solid #ff6600;
    }

    .cleanup-info .info-icon {
      color: #ff6600;
      flex-shrink: 0;
    }

    .cleanup-info p {
      margin: 0;
      color: rgba(0, 0, 0, 0.87);
      line-height: 1.5;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: rgba(0, 0, 0, 0.4);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .folders-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }

    .folder-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
      transition: background-color 0.2s;
    }

    .folder-item:hover {
      background-color: #eeeeee;
    }

    .folder-item mat-icon {
      color: rgba(0, 0, 0, 0.54);
    }

    .folder-name {
      flex: 1;
      font-family: monospace;
      font-size: 14px;
    }

    .folder-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    .folder-status.old {
      background-color: #ffebee;
      color: #c62828;
    }

    .folder-status.current {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    mat-card-actions {
      padding: 16px !important;
      gap: 8px;
    }

    mat-card-actions button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    mat-divider {
      margin: 0 -16px;
    }
  `]
})
export class LogCleanupComponent implements OnInit, OnDestroy {
  retentionMonths = 1;
  folders: string[] = [];

  isLoading = false;
  isSaving = false;
  isRunningCleanup = false;
  isLoadingFolders = false;

  retentionOptions = [
    { value: 1, label: '1 Month' },
    { value: 2, label: '2 Months' },
    { value: 3, label: '3 Months' },
    { value: 4, label: '4 Months' },
    { value: 5, label: '5 Months' },
    { value: 6, label: '6 Months' },
    { value: 7, label: '7 Months' },
    { value: 8, label: '8 Months' },
    { value: 9, label: '9 Months' },
    { value: 10, label: '10 Months' },
    { value: 11, label: '11 Months' },
    { value: 12, label: '12 Months' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private logCleanupService: LogCleanupService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSetting();
    this.loadFolders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSetting(): void {
    this.isLoading = true;
    this.logCleanupService
      .getSetting()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (setting) => {
          this.retentionMonths = setting.value;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading setting:', err);
          this.snackBar.open('Failed to load retention setting', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  loadFolders(): void {
    this.isLoadingFolders = true;
    this.logCleanupService
      .listFolders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.folders = result.folders || [];
          this.isLoadingFolders = false;
        },
        error: (err) => {
          console.error('Error loading folders:', err);
          this.snackBar.open('Failed to load log folders', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoadingFolders = false;
        }
      });
  }

  saveSetting(): void {
    this.isSaving = true;
    this.logCleanupService
      .updateSetting(this.retentionMonths)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.snackBar.open(result.message || 'Setting saved successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Error saving setting:', err);
          this.snackBar.open(err.error?.message || 'Failed to save setting', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isSaving = false;
        }
      });
  }

  runCleanup(): void {
    this.isRunningCleanup = true;
    this.logCleanupService
      .runCleanup()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.snackBar.open(result.message || 'Cleanup completed successfully', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.isRunningCleanup = false;
          // Refresh folders list after cleanup
          this.loadFolders();
        },
        error: (err) => {
          console.error('Error running cleanup:', err);
          this.snackBar.open(err.error?.message || 'Cleanup failed', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isRunningCleanup = false;
        }
      });
  }

  refreshFolders(): void {
    this.loadFolders();
  }

  /**
   * Check if a folder is older than the retention period
   * Folder format expected: yyyy-MM
   */
  isOldFolder(folderName: string): boolean {
    const match = folderName.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return false;
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const folderDate = new Date(year, month - 1, 1);

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - this.retentionMonths);
    cutoffDate.setDate(1);
    cutoffDate.setHours(0, 0, 0, 0);

    return folderDate < cutoffDate;
  }
}
