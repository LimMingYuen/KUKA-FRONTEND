import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { IoControllerService } from '../../../services/io-controller.service';
import { IoControllerDeviceDto, CreateIoDeviceRequest, UpdateIoDeviceRequest } from '../../../models/io-controller.models';

export interface IoDeviceDialogData {
  mode: 'create' | 'edit' | 'view';
  device?: IoControllerDeviceDto;
}

@Component({
  selector: 'app-io-device-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ dialogTitle }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Device Name</mat-label>
          <input matInput formControlName="deviceName" placeholder="e.g., Line 1 IO Module" [readonly]="isViewMode">
          @if (form.get('deviceName')?.hasError('required')) {
            <mat-error>Device name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>IP Address</mat-label>
          <input matInput formControlName="ipAddress" placeholder="e.g., 192.168.1.100" [readonly]="isViewMode">
          @if (form.get('ipAddress')?.hasError('required')) {
            <mat-error>IP address is required</mat-error>
          }
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Port</mat-label>
            <input matInput type="number" formControlName="port" placeholder="502" [readonly]="isViewMode">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Unit ID</mat-label>
            <input matInput type="number" formControlName="unitId" placeholder="1" [readonly]="isViewMode">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="2" placeholder="Optional notes about this device" [readonly]="isViewMode"></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Polling Interval (ms)</mat-label>
            <input matInput type="number" formControlName="pollingIntervalMs" placeholder="1000" [readonly]="isViewMode">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Timeout (ms)</mat-label>
            <input matInput type="number" formControlName="connectionTimeoutMs" placeholder="3000" [readonly]="isViewMode">
          </mat-form-field>
        </div>

        <mat-slide-toggle formControlName="isActive" color="primary" [disabled]="isViewMode">
          Active (Enable Polling)
        </mat-slide-toggle>

        @if (isViewMode && data.device) {
          <div class="view-info">
            <div class="info-row">
              <span class="label">Created:</span>
              <span class="value">{{ data.device.createdUtc | date:'medium' }} by {{ data.device.createdBy || 'Unknown' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Last Updated:</span>
              <span class="value">{{ data.device.updatedUtc | date:'medium' }} by {{ data.device.updatedBy || 'Unknown' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Last Poll:</span>
              <span class="value">{{ data.device.lastPollUtc ? (data.device.lastPollUtc | date:'medium') : 'Never' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Connection Status:</span>
              <span class="value" [class.connected]="data.device.lastConnectionSuccess" [class.disconnected]="data.device.lastConnectionSuccess === false">
                {{ data.device.lastConnectionSuccess === true ? 'Connected' : data.device.lastConnectionSuccess === false ? 'Disconnected' : 'Unknown' }}
              </span>
            </div>
            @if (data.device.lastErrorMessage) {
              <div class="info-row error">
                <span class="label">Last Error:</span>
                <span class="value">{{ data.device.lastErrorMessage }}</span>
              </div>
            }
          </div>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ isViewMode ? 'Close' : 'Cancel' }}</button>
      @if (!isViewMode) {
        <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || isSaving">
          @if (isSaving) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            {{ data.mode === 'create' ? 'Create' : 'Save' }}
          }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    h2[mat-dialog-title] {
      margin-bottom: 16px;
      font-size: 1.5rem;
    }

    mat-dialog-content {
      min-width: 500px;
      max-width: 600px;
      padding: 16px 24px 0 24px !important;
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-bottom: 8px;
    }

    .form-row {
      display: flex;
      gap: 16px;

      mat-form-field {
        flex: 1;
      }
    }

    mat-slide-toggle {
      margin-top: 8px;
      margin-bottom: 16px;
    }

    .view-info {
      margin-top: 16px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;

      .info-row {
        display: flex;
        margin-bottom: 8px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          font-weight: 500;
          min-width: 140px;
          color: #666;
        }

        .value {
          flex: 1;

          &.connected {
            color: #4caf50;
            font-weight: 500;
          }

          &.disconnected {
            color: #f44336;
            font-weight: 500;
          }
        }

        &.error .value {
          color: #f44336;
          font-size: 0.85em;
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 24px !important;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  `]
})
export class IoDeviceDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  form: FormGroup;
  isSaving = false;

  get isViewMode(): boolean {
    return this.data.mode === 'view';
  }

  get dialogTitle(): string {
    switch (this.data.mode) {
      case 'create': return 'Add New Device';
      case 'edit': return 'Edit Device';
      case 'view': return 'Device Details';
      default: return 'Device';
    }
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<IoDeviceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IoDeviceDialogData,
    private ioService: IoControllerService
  ) {
    this.form = this.fb.group({
      deviceName: [data.device?.deviceName || '', Validators.required],
      ipAddress: [data.device?.ipAddress || '', Validators.required],
      port: [data.device?.port || 502],
      unitId: [data.device?.unitId || 1],
      description: [data.device?.description || ''],
      pollingIntervalMs: [data.device?.pollingIntervalMs || 1000],
      connectionTimeoutMs: [data.device?.connectionTimeoutMs || 3000],
      isActive: [data.device?.isActive ?? true]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  save(): void {
    if (this.form.invalid || this.isSaving) return;

    this.isSaving = true;

    if (this.data.mode === 'create') {
      const request: CreateIoDeviceRequest = {
        deviceName: this.form.value.deviceName,
        ipAddress: this.form.value.ipAddress,
        port: this.form.value.port,
        unitId: this.form.value.unitId,
        description: this.form.value.description || undefined,
        pollingIntervalMs: this.form.value.pollingIntervalMs,
        connectionTimeoutMs: this.form.value.connectionTimeoutMs,
        isActive: this.form.value.isActive
      };

      this.ioService.createDevice(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.dialogRef.close(true);
          },
          error: (err) => {
            console.error('Error creating device:', err);
            this.isSaving = false;
            // Error handling could be improved with a snackbar
          }
        });
    } else {
      const request: UpdateIoDeviceRequest = {
        deviceName: this.form.value.deviceName,
        ipAddress: this.form.value.ipAddress,
        port: this.form.value.port,
        unitId: this.form.value.unitId,
        description: this.form.value.description || undefined,
        pollingIntervalMs: this.form.value.pollingIntervalMs,
        connectionTimeoutMs: this.form.value.connectionTimeoutMs,
        isActive: this.form.value.isActive
      };

      this.ioService.updateDevice(this.data.device!.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.dialogRef.close(true);
          },
          error: (err) => {
            console.error('Error updating device:', err);
            this.isSaving = false;
          }
        });
    }
  }
}
