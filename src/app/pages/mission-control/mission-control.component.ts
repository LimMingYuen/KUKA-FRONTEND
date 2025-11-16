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
import { MatDividerModule } from '@angular/material/divider';

import { MissionsService } from '../../services/missions.service';
import { WorkflowService } from '../../services/workflow.service';
import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import { MissionPollingService, MissionJob } from '../../services/mission-polling.service';
import { WorkflowDisplayData } from '../../models/workflow.models';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';
import { JobData, RobotData, MissionsUtils } from '../../models/missions.models';
import { Subject, takeUntil } from 'rxjs';

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
    MatDialogModule,
    MatDividerModule
  ],
  templateUrl: './mission-control.component.html',
  styleUrl: './mission-control.component.scss'
})
export class MissionControlComponent implements OnInit, OnDestroy {
  // Data
  public workflows: WorkflowDisplayData[] = [];
  public customMissions: SavedCustomMissionsDisplayData[] = [];

  // Store job execution state for each workflow/mission
  public workflowJobs: Map<number, {
    missionCode: string;
    jobData?: JobData;
    robotData?: RobotData;
  }> = new Map();

  public customMissionJobs: Map<number, {
    missionCode: string;
    jobData?: JobData;
    robotData?: RobotData;
  }> = new Map();

  // Loading states
  public isLoadingWorkflows = false;
  public isLoadingCustomMissions = false;
  public triggeringMissions: Set<number> = new Set();

  // Cleanup
  private destroy$ = new Subject<void>();

  // Expose MissionsUtils to template
  public readonly MissionsUtils = MissionsUtils;

  constructor(
    private missionsService: MissionsService,
    private workflowService: WorkflowService,
    private customMissionsService: SavedCustomMissionsService,
    private missionPollingService: MissionPollingService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadCustomMissions();

    // Subscribe to polling service updates
    this.missionPollingService.getActiveMissions$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(activeMissions => {
        // Update local job maps from polling service
        activeMissions.forEach((mission) => {
          if (mission.type === 'workflow') {
            this.workflowJobs.set(mission.id, {
              missionCode: mission.missionCode,
              jobData: mission.jobData,
              robotData: mission.robotData
            });
          } else {
            this.customMissionJobs.set(mission.id, {
              missionCode: mission.missionCode,
              jobData: mission.jobData,
              robotData: mission.robotData
            });
          }
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Note: We don't stop polling here - it continues in the background
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
      priority: 50, // Priority range: 0-100 (50 = normal)
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

          // Start tracking with polling service (persists across navigation)
          this.missionPollingService.startTracking(id, request.missionCode, 'workflow');
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
            const missionCode = (response as any).missionCode;

            // Start tracking with polling service (persists across navigation)
            this.missionPollingService.startTracking(id, missionCode, 'custom');
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
   * Cancel a mission
   */
  cancelMission(id: number, type: 'workflow' | 'custom'): void {
    const jobsMap = type === 'workflow' ? this.workflowJobs : this.customMissionJobs;
    const job = jobsMap.get(id);

    if (!job || !job.missionCode) {
      this.snackBar.open('No active mission to cancel', 'Close', { duration: 3000 });
      return;
    }

    // TODO: Show dialog to select cancel mode
    // For now, using FORCE mode by default
    const request = {
      requestId: this.generateRequestId(),
      missionCode: job.missionCode,
      containerCode: '',
      position: '',
      cancelMode: 'FORCE' as 'FORCE' | 'NORMAL' | 'REDIRECT_START',
      reason: 'Cancelled by user'
    };

    this.missionsService.cancelMission(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Mission cancelled successfully', 'Close', { duration: 3000 });
          // Stop tracking this mission
          this.missionPollingService.stopTracking(id);
        } else {
          this.snackBar.open(`Failed to cancel mission: ${response.message}`, 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        this.snackBar.open('Failed to cancel mission', 'Close', { duration: 5000 });
        console.error('Error cancelling mission:', error);
      }
    });
  }

  /**
   * Check if workflow is being triggered
   */
  isTriggering(id: number): boolean {
    return this.triggeringMissions.has(id);
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
