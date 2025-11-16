import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { MissionsService } from '../../services/missions.service';
import { WorkflowService } from '../../services/workflow.service';
import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import { WorkflowDisplayData } from '../../models/workflow.models';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';
import { JobData } from '../../models/missions.models';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-mission-control',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './mission-control.component.html',
  styleUrl: './mission-control.component.scss'
})
export class MissionControlComponent implements OnInit, OnDestroy {
  // Data
  public workflows: WorkflowDisplayData[] = [];
  public customMissions: SavedCustomMissionsDisplayData[] = [];
  public activeJobs: Map<string, JobData> = new Map();

  // Loading states
  public isLoadingWorkflows = false;
  public isLoadingCustomMissions = false;
  public triggeringMissions: Set<number> = new Set();

  // Cleanup
  private destroy$ = new Subject<void>();
  private pollingSubscriptions: Map<string, any> = new Map();

  constructor(
    private missionsService: MissionsService,
    private workflowService: WorkflowService,
    private customMissionsService: SavedCustomMissionsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadCustomMissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Stop all polling
    this.pollingSubscriptions.forEach(sub => sub.unsubscribe());
    this.pollingSubscriptions.clear();
  }

  /**
   * Load workflows from workflow service
   */
  loadWorkflows(): void {
    this.isLoadingWorkflows = true;
    this.workflowService.getWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflows) => {
          this.workflows = workflows;
          this.isLoadingWorkflows = false;
        },
        error: (error) => {
          console.error('Error loading workflows:', error);
          this.isLoadingWorkflows = false;
          this.snackBar.open('Failed to load workflows', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Load custom missions
   */
  loadCustomMissions(): void {
    this.isLoadingCustomMissions = true;
    this.customMissionsService.getAllSavedCustomMissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (missions) => {
          this.customMissions = missions;
          this.isLoadingCustomMissions = false;
        },
        error: (error) => {
          console.error('Error loading custom missions:', error);
          this.isLoadingCustomMissions = false;
          this.snackBar.open('Failed to load custom missions', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Trigger sync workflow mission
   */
  triggerWorkflow(workflow: WorkflowDisplayData): void {
    const id = workflow.id;
    this.triggeringMissions.add(id);

    const request = {
      orgId: 'UNIVERSAL',
      requestId: this.generateRequestId(),
      missionCode: this.generateMissionCode(),
      missionType: 'RACK_MOVE',
      viewBoardType: '',
      robotModels: ['KMP600I'],
      robotIds: ['14'],
      robotType: 'LIFT',
      priority: 1,
      containerModelCode: '',
      containerCode: '',
      templateCode: workflow.code,
      lockRobotAfterFinish: false,
      unlockRobotId: '',
      unlockMissionCode: '',
      idleNode: ''
    };

    this.missionsService.submitMission(request).subscribe({
      next: (response) => {
        this.triggeringMissions.delete(id);
        if (response.success) {
          this.snackBar.open(`Workflow "${workflow.name}" triggered successfully!`, 'Close', { duration: 3000 });
          this.startJobPolling(request.missionCode);
        } else {
          this.snackBar.open(`Failed to trigger workflow: ${response.message}`, 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.triggeringMissions.delete(id);
        this.snackBar.open('Failed to trigger workflow', 'Close', { duration: 5000 });
        console.error('Error triggering workflow:', error);
      }
    });
  }

  /**
   * Trigger custom mission
   */
  triggerCustomMission(mission: SavedCustomMissionsDisplayData): void {
    const id = mission.id;
    this.triggeringMissions.add(id);

    // You would need to get the full mission data with missionData array
    // For now, using the trigger endpoint from the service
    this.customMissionsService.triggerSavedCustomMission(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.triggeringMissions.delete(id);
          this.snackBar.open(`Custom mission "${mission.missionName}" triggered successfully!`, 'Close', { duration: 3000 });
          // If response contains missionCode, start polling
          if (response && (response as any).missionCode) {
            this.startJobPolling((response as any).missionCode);
          }
        },
        error: (error) => {
          this.triggeringMissions.delete(id);
          this.snackBar.open('Failed to trigger custom mission', 'Close', { duration: 5000 });
          console.error('Error triggering custom mission:', error);
        }
      });
  }

  /**
   * Start polling for job status
   */
  startJobPolling(missionCode: string): void {
    // Don't start if already polling
    if (this.pollingSubscriptions.has(missionCode)) {
      return;
    }

    // Poll every 2 seconds
    const subscription = interval(2000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.missionsService.queryJobs({
          missionCodes: [missionCode],
          limit: 1
        }).subscribe({
          next: (response) => {
            if (response.success && response.data && response.data.length > 0) {
              const jobData = response.data[0];
              this.activeJobs.set(missionCode, jobData);

              // Stop polling if job is completed, failed, or cancelled
              if (jobData.status?.toUpperCase().includes('COMPLETED') ||
                  jobData.status?.toUpperCase().includes('FAILED') ||
                  jobData.status?.toUpperCase().includes('CANCELLED')) {
                this.stopJobPolling(missionCode);
              }
            }
          },
          error: (error) => {
            console.error('Error polling job status:', error);
          }
        });
      });

    this.pollingSubscriptions.set(missionCode, subscription);
  }

  /**
   * Stop job polling
   */
  stopJobPolling(missionCode: string): void {
    const subscription = this.pollingSubscriptions.get(missionCode);
    if (subscription) {
      subscription.unsubscribe();
      this.pollingSubscriptions.delete(missionCode);
    }
  }

  /**
   * Clear job from active jobs
   */
  clearJob(missionCode: string): void {
    this.activeJobs.delete(missionCode);
    this.stopJobPolling(missionCode);
  }

  /**
   * Check if workflow is being triggered
   */
  isTriggering(id: number): boolean {
    return this.triggeringMissions.has(id);
  }

  /**
   * Get job status color
   */
  getStatusColor(status: string): string {
    const statusUpper = status?.toUpperCase();
    if (statusUpper?.includes('EXECUTING') || statusUpper?.includes('PROGRESS')) {
      return 'primary';
    }
    if (statusUpper?.includes('COMPLETED') || statusUpper?.includes('SUCCESS')) {
      return 'accent';
    }
    if (statusUpper?.includes('FAILED') || statusUpper?.includes('ERROR')) {
      return 'warn';
    }
    return '';
  }

  /**
   * Get active jobs as array
   */
  getActiveJobsArray(): Array<{ missionCode: string; jobData: JobData }> {
    return Array.from(this.activeJobs.entries()).map(([missionCode, jobData]) => ({
      missionCode,
      jobData
    }));
  }

  /**
   * Refresh all data
   */
  refresh(): void {
    this.loadWorkflows();
    this.loadCustomMissions();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0') +
      now.getMilliseconds().toString().padStart(3, '0');
    return `request${timestamp}`;
  }

  /**
   * Generate unique mission code
   */
  private generateMissionCode(): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0') +
      now.getMilliseconds().toString().padStart(3, '0');
    return `mission${timestamp}`;
  }
}
