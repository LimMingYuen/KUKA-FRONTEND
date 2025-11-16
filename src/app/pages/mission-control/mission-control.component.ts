import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';

import { MissionsService } from '../../services/missions.service';
import { MissionSubmitDialogComponent } from '../../shared/dialogs/mission-submit/mission-submit-dialog.component';
import {
  JobQueryRequest,
  JobData,
  RobotQueryRequest,
  RobotData,
  MissionPriority,
  MissionsUtils
} from '../../models/missions.models';

@Component({
  selector: 'app-mission-control',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './mission-control.component.html',
  styleUrl: './mission-control.component.scss'
})
export class MissionControlComponent implements OnInit {
  // Forms
  public cancelMissionForm: FormGroup;
  public queryJobsForm: FormGroup;
  public queryRobotsForm: FormGroup;

  // Data
  public jobResults: JobData[] = [];
  public robotResults: RobotData[] = [];

  // Table columns
  public jobColumns: string[] = ['missionCode', 'status', 'robotId', 'progress', 'currentLocation', 'updatedAt'];
  public robotColumns: string[] = ['robotId', 'robotName', 'status', 'batteryLevel', 'currentLocation', 'currentMission'];

  // Loading states
  public isCancelling = false;
  public isQueryingJobs = false;
  public isQueryingRobots = false;

  constructor(
    private fb: FormBuilder,
    public missionsService: MissionsService,
    private dialog: MatDialog
  ) {
    // Cancel Mission Form
    this.cancelMissionForm = this.fb.group({
      missionCode: ['', Validators.required],
      reason: ['']
    });

    // Query Jobs Form
    this.queryJobsForm = this.fb.group({
      missionCodes: [''],
      queueItemIds: [''],
      robotId: [''],
      status: [''],
      limit: [10, [Validators.min(1), Validators.max(100)]]
    });

    // Query Robots Form
    this.queryRobotsForm = this.fb.group({
      robotId: [''],
      robotType: [''],
      mapCode: [''],
      floorNumber: [''],
      includeCurrentMission: [true]
    });
  }

  ngOnInit(): void {}

  /**
   * Open mission submit dialog
   */
  openSubmitMissionDialog(): void {
    const dialogRef = this.dialog.open(MissionSubmitDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Mission submitted:', result);
        // Optionally refresh job query
        this.onQueryJobs();
      }
    });
  }

  /**
   * Cancel a mission
   */
  onCancelMission(): void {
    if (this.cancelMissionForm.invalid) {
      this.cancelMissionForm.markAllAsTouched();
      return;
    }

    const formValue = this.cancelMissionForm.value;
    this.isCancelling = true;

    this.missionsService.cancelMission({
      missionCode: formValue.missionCode,
      reason: formValue.reason || undefined
    }).subscribe({
      next: (response) => {
        this.isCancelling = false;
        this.cancelMissionForm.reset();
        console.log('Mission cancelled:', response);
      },
      error: () => {
        this.isCancelling = false;
      }
    });
  }

  /**
   * Query jobs
   */
  onQueryJobs(): void {
    if (this.queryJobsForm.invalid) {
      this.queryJobsForm.markAllAsTouched();
      return;
    }

    const formValue = this.queryJobsForm.value;

    // Parse comma-separated values
    const missionCodes = formValue.missionCodes
      ? formValue.missionCodes.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : undefined;

    const queueItemIds = formValue.queueItemIds
      ? formValue.queueItemIds.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n))
      : undefined;

    const request: JobQueryRequest = {
      missionCodes,
      queueItemIds,
      robotId: formValue.robotId || undefined,
      status: formValue.status || undefined,
      limit: formValue.limit
    };

    this.isQueryingJobs = true;

    this.missionsService.queryJobs(request).subscribe({
      next: (response) => {
        this.isQueryingJobs = false;
        if (response.success && response.data) {
          this.jobResults = response.data;
        } else {
          this.jobResults = [];
        }
      },
      error: () => {
        this.isQueryingJobs = false;
        this.jobResults = [];
      }
    });
  }

  /**
   * Query robots
   */
  onQueryRobots(): void {
    if (this.queryRobotsForm.invalid) {
      this.queryRobotsForm.markAllAsTouched();
      return;
    }

    const formValue = this.queryRobotsForm.value;

    const request: RobotQueryRequest = {
      robotId: formValue.robotId || undefined,
      robotType: formValue.robotType || undefined,
      mapCode: formValue.mapCode || undefined,
      floorNumber: formValue.floorNumber || undefined,
      includeCurrentMission: formValue.includeCurrentMission
    };

    this.isQueryingRobots = true;

    this.missionsService.queryRobots(request).subscribe({
      next: (response) => {
        this.isQueryingRobots = false;
        if (response.success && response.data) {
          this.robotResults = response.data;
        } else {
          this.robotResults = [];
        }
      },
      error: () => {
        this.isQueryingRobots = false;
        this.robotResults = [];
      }
    });
  }

  /**
   * Clear job results
   */
  clearJobResults(): void {
    this.jobResults = [];
    this.queryJobsForm.reset({ limit: 10, includeCurrentMission: true });
  }

  /**
   * Clear robot results
   */
  clearRobotResults(): void {
    this.robotResults = [];
    this.queryRobotsForm.reset({ includeCurrentMission: true });
  }

  /**
   * Get status color for chips
   */
  getStatusColor(status: string): string {
    return MissionsUtils.getStatusColor(status);
  }

  /**
   * Format date/time
   */
  formatDateTime(dateString: string | undefined): string {
    return MissionsUtils.formatDateTime(dateString);
  }

  /**
   * Get battery level color
   */
  getBatteryColor(level: number | undefined): string {
    if (!level) return '';
    if (level >= 70) return 'accent';
    if (level >= 30) return 'primary';
    return 'warn';
  }
}
