import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// Services & Models
import { IoControllerService } from '../../services/io-controller.service';
import {
  IoControllerDeviceDto,
  IoChannelDto,
  IoDeviceFullStatusDto,
  IoControllerDeviceDisplayData,
  IoChannelDisplayData,
  transformDeviceForDisplay,
  transformChannelsForDisplay,
  getDigitalInputs,
  getDigitalOutputs,
  IoChannelType
} from '../../models/io-controller.models';

// Dialog Component
import { IoDeviceDialogComponent } from './io-device-dialog/io-device-dialog.component';

@Component({
  selector: 'app-io-controllers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule,
    MatBadgeModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    IoDeviceDialogComponent
  ],
  templateUrl: './io-controllers.component.html',
  styleUrl: './io-controllers.component.scss'
})
export class IoControllersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Devices
  devices = signal<IoControllerDeviceDisplayData[]>([]);
  isLoading = signal<boolean>(false);
  selectedDeviceId = signal<number | null>(null);
  selectedDeviceStatus = signal<IoDeviceFullStatusDto | null>(null);
  selectedChannels = signal<IoChannelDisplayData[]>([]);

  // Auto-refresh
  autoRefresh = signal<boolean>(true);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Modbus table columns
  modbusColumns: string[] = ['location', 'type', 'value', 'description', 'mode'];

  // Computed
  digitalInputs = computed(() => getDigitalInputs(this.selectedChannels()));
  digitalOutputs = computed(() => getDigitalOutputs(this.selectedChannels()));

  constructor(
    public ioService: IoControllerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDevices();
    this.setupSignalR();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
    this.ioService.stopSignalRConnection();
  }

  // #region Data Loading

  loadDevices(): void {
    this.isLoading.set(true);
    this.ioService.getDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (devices) => {
          this.devices.set(devices.map(transformDeviceForDisplay));
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading devices:', err);
          this.showError('Failed to load devices');
          this.isLoading.set(false);
        }
      });
  }

  loadDeviceStatus(deviceId: number): void {
    this.ioService.getDeviceStatus(deviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.selectedDeviceStatus.set(status);
          this.selectedChannels.set(transformChannelsForDisplay(status.channels));
        },
        error: (err) => {
          console.error('Error loading device status:', err);
        }
      });
  }

  // #endregion

  // #region SignalR

  private async setupSignalR(): Promise<void> {
    try {
      await this.ioService.startSignalRConnection();
      await this.ioService.subscribeToAll();

      // Listen for channel changes
      this.ioService.channelChange$
        .pipe(takeUntil(this.destroy$))
        .subscribe(change => {
          if (this.selectedDeviceId() === change.deviceId) {
            // Update local state
            const channels = this.selectedChannels();
            const idx = channels.findIndex(c =>
              c.channelNumber === change.channelNumber &&
              c.channelType === change.channelType
            );
            if (idx >= 0) {
              const updated = [...channels];
              updated[idx] = {
                ...updated[idx],
                currentState: change.currentState,
                stateText: change.currentState ? 'ON' : 'OFF',
                stateClass: change.currentState ? 'state-on' : 'state-off',
                lastStateChangeUtc: change.lastStateChangeUtc
              };
              this.selectedChannels.set(updated);
            }
          }
        });

      // Listen for connection status changes
      this.ioService.connectionStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe(status => {
          const devices = this.devices();
          const idx = devices.findIndex(d => d.id === status.deviceId);
          if (idx >= 0) {
            const updated = [...devices];
            updated[idx] = {
              ...updated[idx],
              lastConnectionSuccess: status.isConnected,
              lastErrorMessage: status.errorMessage,
              connectionStatusClass: status.isConnected ? 'status-connected' : 'status-disconnected',
              connectionStatusText: status.isConnected ? 'Connected' : 'Disconnected'
            };
            this.devices.set(updated);
          }
        });

    } catch (err) {
      console.error('Failed to setup SignalR:', err);
    }
  }

  // #endregion

  // #region Auto Refresh

  toggleAutoRefresh(): void {
    this.autoRefresh.set(!this.autoRefresh());
    if (this.autoRefresh()) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    if (this.refreshInterval) return;
    this.refreshInterval = setInterval(() => {
      if (this.selectedDeviceId()) {
        this.loadDeviceStatus(this.selectedDeviceId()!);
      }
    }, 2000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // #endregion

  // #region Device Actions

  selectDevice(device: IoControllerDeviceDisplayData): void {
    this.selectedDeviceId.set(device.id);
    this.loadDeviceStatus(device.id);
  }

  openAddDeviceDialog(): void {
    const dialogRef = this.dialog.open(IoDeviceDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDevices();
        this.showSuccess('Device created successfully');
      }
    });
  }

  openEditDeviceDialog(device: IoControllerDeviceDisplayData, event: Event): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(IoDeviceDialogComponent, {
      width: '600px',
      data: { mode: 'edit', device }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDevices();
        this.showSuccess('Device updated successfully');
      }
    });
  }

  deleteDevice(device: IoControllerDeviceDisplayData, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${device.deviceName}"?`)) {
      this.ioService.deleteDevice(device.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadDevices();
            if (this.selectedDeviceId() === device.id) {
              this.selectedDeviceId.set(null);
              this.selectedDeviceStatus.set(null);
              this.selectedChannels.set([]);
            }
            this.showSuccess('Device deleted successfully');
          },
          error: (err) => {
            console.error('Error deleting device:', err);
            this.showError('Failed to delete device');
          }
        });
    }
  }

  testConnection(device: IoControllerDeviceDisplayData, event: Event): void {
    event.stopPropagation();
    this.ioService.testConnection(device.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.isConnected) {
            this.showSuccess(`Connection successful (${result.responseTimeMs}ms)`);
          } else {
            this.showError(`Connection failed: ${result.errorMessage}`);
          }
          this.loadDevices();
        },
        error: (err) => {
          console.error('Error testing connection:', err);
          this.showError('Connection test failed');
        }
      });
  }

  // #endregion

  // #region Channel Actions

  toggleDO(channel: IoChannelDisplayData): void {
    if (!this.selectedDeviceId()) return;

    const newValue = !channel.currentState;
    this.ioService.setDigitalOutput(this.selectedDeviceId()!, channel.channelNumber, { value: newValue })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            // Update local state immediately
            const channels = this.selectedChannels();
            const idx = channels.findIndex(c => c.id === channel.id);
            if (idx >= 0) {
              const updated = [...channels];
              updated[idx] = {
                ...updated[idx],
                currentState: newValue,
                stateText: newValue ? 'ON' : 'OFF',
                stateClass: newValue ? 'state-on' : 'state-off'
              };
              this.selectedChannels.set(updated);
            }
          } else {
            this.showError(`Failed to set DO: ${result.errorMessage}`);
          }
        },
        error: (err) => {
          console.error('Error setting DO:', err);
          this.showError('Failed to set digital output');
        }
      });
  }

  toggleFsv(channel: IoChannelDisplayData, event: MatSlideToggleChange): void {
    if (!this.selectedDeviceId()) return;

    const newEnabled = event.checked;
    this.ioService.setFsv(this.selectedDeviceId()!, channel.channelNumber, {
      enabled: newEnabled,
      value: channel.failSafeValue ?? false
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            const channels = this.selectedChannels();
            const idx = channels.findIndex(c => c.id === channel.id);
            if (idx >= 0) {
              const updated = [...channels];
              updated[idx] = { ...updated[idx], fsvEnabled: newEnabled };
              this.selectedChannels.set(updated);
            }
            this.showSuccess(`FSV ${newEnabled ? 'enabled' : 'disabled'}`);
          } else {
            this.showError(`Failed to set FSV: ${result.errorMessage}`);
          }
        },
        error: (err) => {
          console.error('Error setting FSV:', err);
          this.showError('Failed to set FSV');
        }
      });
  }

  // #endregion

  // #region Helpers

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  // #endregion
}
