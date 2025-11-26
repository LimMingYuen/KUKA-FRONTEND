import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';

import { AutoSyncService } from '../../services/auto-sync.service';
import {
  AutoSyncSettings,
  AutoSyncSettingsUpdate,
  SyncResult,
  SYNC_INTERVAL_OPTIONS
} from '../../models/auto-sync.models';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule
  ],
  template: `
    <div class="system-settings-container">
      <div class="page-header">
        <h1>System Settings</h1>
      </div>

      <mat-card class="settings-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>sync</mat-icon>
            Auto-Sync Configuration
          </mat-card-title>
          <mat-card-subtitle>
            Configure automatic synchronization of external API data
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading settings...</p>
          </div>

          <div *ngIf="!isLoading && settings" class="settings-form">
            <!-- Master Toggle -->
            <div class="setting-row master-toggle">
              <mat-slide-toggle
                [(ngModel)]="settings.enabled"
                color="primary">
                <span class="toggle-label">Enable Auto-Sync</span>
              </mat-slide-toggle>
              <span class="setting-hint">
                When enabled, data will be synchronized automatically at the configured interval
              </span>
            </div>

            <mat-divider></mat-divider>

            <!-- Interval Selection -->
            <div class="setting-row">
              <mat-form-field appearance="outline" class="interval-select">
                <mat-label>Sync Interval</mat-label>
                <mat-select [(ngModel)]="settings.intervalMinutes" [disabled]="!settings.enabled">
                  <mat-option *ngFor="let option of intervalOptions" [value]="option.value">
                    {{ option.label }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-divider></mat-divider>

            <!-- API Toggles -->
            <div class="setting-row apis-section">
              <h3>APIs to Sync</h3>
              <p class="setting-hint">Select which APIs should be synchronized</p>

              <div class="api-toggles">
                <mat-checkbox
                  [(ngModel)]="settings.syncWorkflows"
                  [disabled]="!settings.enabled"
                  color="primary">
                  <mat-icon>account_tree</mat-icon>
                  Workflows
                </mat-checkbox>

                <mat-checkbox
                  [(ngModel)]="settings.syncQrCodes"
                  [disabled]="!settings.enabled"
                  color="primary">
                  <mat-icon>qr_code</mat-icon>
                  QR Codes
                </mat-checkbox>

                <mat-checkbox
                  [(ngModel)]="settings.syncMapZones"
                  [disabled]="!settings.enabled"
                  color="primary">
                  <mat-icon>map</mat-icon>
                  Map Zones
                </mat-checkbox>

                <mat-checkbox
                  [(ngModel)]="settings.syncMobileRobots"
                  [disabled]="!settings.enabled"
                  color="primary">
                  <mat-icon>smart_toy</mat-icon>
                  Mobile Robots
                </mat-checkbox>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Status Information -->
            <div class="setting-row status-section">
              <h3>Sync Status</h3>
              <div class="status-info">
                <div class="status-item">
                  <span class="status-label">Last Sync:</span>
                  <span class="status-value">
                    {{ settings.lastRun ? (settings.lastRun | date:'medium') : 'Never' }}
                  </span>
                </div>
                <div class="status-item" *ngIf="settings.enabled && settings.nextRun">
                  <span class="status-label">Next Sync:</span>
                  <span class="status-value">{{ settings.nextRun | date:'medium' }}</span>
                </div>
              </div>
            </div>

            <!-- Last Sync Results -->
            <div class="setting-row results-section" *ngIf="lastSyncResults.length > 0">
              <h3>Last Sync Results</h3>
              <div class="sync-results">
                <div *ngFor="let result of lastSyncResults"
                     class="result-chip"
                     [class.success]="result.success"
                     [class.error]="!result.success">
                  <mat-icon>{{ result.success ? 'check_circle' : 'error' }}</mat-icon>
                  <span class="api-name">{{ result.apiName }}</span>
                  <span class="result-detail" *ngIf="result.success">
                    {{ result.total }} total ({{ result.inserted }} new, {{ result.updated }} updated)
                  </span>
                  <span class="result-detail" *ngIf="!result.success">
                    {{ result.errorMessage }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button
                  (click)="runSyncNow()"
                  [disabled]="isSyncing || isLoading"
                  color="accent">
            <mat-icon>sync</mat-icon>
            {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
          </button>
          <button mat-raised-button
                  color="primary"
                  (click)="saveSettings()"
                  [disabled]="isSaving || isLoading">
            <mat-icon>save</mat-icon>
            {{ isSaving ? 'Saving...' : 'Save Settings' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .system-settings-container {
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

    .settings-card {
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
      gap: 24px;
    }

    .setting-row {
      padding: 16px 0;
    }

    .master-toggle {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .toggle-label {
      font-size: 16px;
      font-weight: 500;
    }

    .setting-hint {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .interval-select {
      width: 200px;
    }

    .apis-section h3,
    .status-section h3,
    .results-section h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }

    .api-toggles {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 16px;
    }

    .api-toggles mat-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .api-toggles mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: rgba(0, 0, 0, 0.54);
    }

    .status-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .status-item {
      display: flex;
      gap: 8px;
    }

    .status-label {
      font-weight: 500;
      color: rgba(0, 0, 0, 0.6);
      min-width: 100px;
    }

    .status-value {
      color: rgba(0, 0, 0, 0.87);
    }

    .sync-results {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    .result-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
    }

    .result-chip.success {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .result-chip.error {
      background-color: #ffebee;
      color: #c62828;
    }

    .result-chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .result-chip .api-name {
      font-weight: 500;
      min-width: 100px;
    }

    .result-chip .result-detail {
      color: inherit;
      opacity: 0.8;
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

    @media (max-width: 600px) {
      .api-toggles {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SystemSettingsComponent implements OnInit, OnDestroy {
  settings: AutoSyncSettings | null = null;
  lastSyncResults: SyncResult[] = [];
  intervalOptions = SYNC_INTERVAL_OPTIONS;

  isLoading = false;
  isSaving = false;
  isSyncing = false;

  private destroy$ = new Subject<void>();

  constructor(
    private autoSyncService: AutoSyncService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.autoSyncService
      .getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.settings = settings;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading settings:', err);
          this.snackBar.open(err.message || 'Failed to load settings', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  saveSettings(): void {
    if (!this.settings) return;

    this.isSaving = true;

    const update: AutoSyncSettingsUpdate = {
      enabled: this.settings.enabled,
      intervalMinutes: this.settings.intervalMinutes,
      syncWorkflows: this.settings.syncWorkflows,
      syncQrCodes: this.settings.syncQrCodes,
      syncMapZones: this.settings.syncMapZones,
      syncMobileRobots: this.settings.syncMobileRobots
    };

    this.autoSyncService
      .updateSettings(update)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.settings = settings;
          this.snackBar.open('Settings saved successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Error saving settings:', err);
          this.snackBar.open(err.message || 'Failed to save settings', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isSaving = false;
        }
      });
  }

  runSyncNow(): void {
    this.isSyncing = true;
    this.lastSyncResults = [];

    this.autoSyncService
      .runNow()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.lastSyncResults = result.results;

          const successCount = result.successfulApis;
          const totalCount = result.totalApis;

          this.snackBar.open(
            `Sync completed: ${successCount}/${totalCount} APIs successful`,
            'Close',
            {
              duration: 5000,
              panelClass: successCount === totalCount ? ['success-snackbar'] : ['warning-snackbar']
            }
          );

          // Reload settings to get updated lastRun time
          this.loadSettings();
          this.isSyncing = false;
        },
        error: (err) => {
          console.error('Error running sync:', err);
          this.snackBar.open(err.message || 'Sync failed', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isSyncing = false;
        }
      });
  }
}
