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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MissionsService } from '../../services/missions.service';
import { WorkflowService } from '../../services/workflow.service';
import { MissionHistoryService } from '../../services/mission-history.service';
import { WorkflowNodeCodesService } from '../../services/workflow-node-codes.service';
import { MapZonesService } from '../../services/map-zones.service';
import { QrCodesService } from '../../services/qr-codes.service';
import { WorkflowDisplayData } from '../../models/workflow.models';
import { JobData, RobotData, MissionsUtils } from '../../models/missions.models';
import { MissionHistoryRequest, UpdateMissionHistoryRequest } from '../../models/mission-history.models';
import { WorkflowZoneMapping } from '../../models/workflow-node-codes.models';
import { MapZoneWithNodesDto } from '../../models/map-zone.models';
import { QrCodeWithUuidDto } from '../../models/qr-code.models';
import { Subject, takeUntil, interval, forkJoin } from 'rxjs';
import { CancelMissionDialogComponent, CancelMissionDialogData, CancelMissionDialogResult } from '../../shared/dialogs/cancel-mission-dialog/cancel-mission-dialog.component';
import { SelectWorkflowsDialogComponent, SelectWorkflowsDialogData, SelectWorkflowsDialogResult } from '../../shared/dialogs/select-workflows-dialog/select-workflows-dialog.component';

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
    MatDividerModule,
    MatExpansionModule,
    MatListModule,
    MatMenuModule,
    MatProgressBarModule
  ],
  templateUrl: './mission-control.component.html',
  styleUrl: './mission-control.component.scss'
})
export class MissionControlComponent implements OnInit, OnDestroy {
  // Data
  public workflows: WorkflowDisplayData[] = [];
  public zoneMappings: WorkflowZoneMapping[] = [];

  // Grouped workflows by zone
  public workflowsByZone: Map<string, WorkflowDisplayData[]> = new Map();
  public filteredWorkflowsByZone: Map<string, WorkflowDisplayData[]> = new Map();
  public selectedWorkflowIds: Set<number> = new Set();
  public expandedZones: Set<string> = new Set();

  // Store job execution state for each workflow
  public workflowJobs: Map<number, {
    missionCode: string;
    requestId?: string;
    workflowName?: string;
    workflowId?: number;
    savedMissionId?: number;
    jobData?: JobData;
    robotData?: RobotData;
  }> = new Map();

  // Loading states
  public isLoadingWorkflows = false;
  public isLoadingZoneMappings = false;
  public triggeringMissions: Set<number> = new Set();
  public cancellingMissions: Set<number> = new Set();

  // Cleanup
  private destroy$ = new Subject<void>();
  private pollingSubscriptions: Map<string, any> = new Map();

  // Error tracking for polling
  private jobQueryErrorCount: Map<string, number> = new Map();
  private robotQueryErrorCount: Map<string, number> = new Map();
  private readonly MAX_CONSECUTIVE_ERRORS = 5;

  // Expose MissionsUtils to template
  public readonly MissionsUtils = MissionsUtils;

  constructor(
    private missionsService: MissionsService,
    private workflowService: WorkflowService,
    private missionHistoryService: MissionHistoryService,
    private workflowNodeCodesService: WorkflowNodeCodesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorkflowsAndZones();
  }

  /**
   * Load workflows and zone mappings together, then group by zone
   */
  loadWorkflowsAndZones(): void {
    this.isLoadingWorkflows = true;
    this.isLoadingZoneMappings = true;

    forkJoin({
      workflows: this.workflowService.getWorkflows(),
      zoneMappings: this.workflowNodeCodesService.getZoneMappings()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.workflows = result.workflows;
          this.zoneMappings = result.zoneMappings;
          this.groupWorkflowsByZone();
          this.isLoadingWorkflows = false;
          this.isLoadingZoneMappings = false;
        },
        error: (error) => {
          console.error('Error loading workflows and zones:', error);
          this.isLoadingWorkflows = false;
          this.isLoadingZoneMappings = false;
          this.snackBar.open('Failed to load workflows', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Group workflows by zone name using zone mappings
   */
  groupWorkflowsByZone(): void {
    // Create a map from externalWorkflowId to zoneName
    const zoneMap = new Map<number, string>();
    this.zoneMappings.forEach(mapping => {
      zoneMap.set(mapping.externalWorkflowId, mapping.zoneName);
    });

    // Group workflows by zone
    const grouped = new Map<string, WorkflowDisplayData[]>();

    this.workflows.forEach(workflow => {
      // Get zone name from mapping (using workflow's external code/id)
      // The workflow.id corresponds to the internal database ID
      // We need to find the zone mapping by matching externalWorkflowId
      const zoneName = this.findZoneForWorkflow(workflow, zoneMap) || 'Uncategorized';

      if (!grouped.has(zoneName)) {
        grouped.set(zoneName, []);
        // Expand all zones by default
        this.expandedZones.add(zoneName);
      }
      grouped.get(zoneName)!.push(workflow);
    });

    // Sort zones alphabetically, but keep "Uncategorized" at the end
    const sortedGrouped = new Map<string, WorkflowDisplayData[]>();
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      sortedGrouped.set(key, grouped.get(key)!);
    });

    this.workflowsByZone = sortedGrouped;

    // Apply filter if any workflows are selected, otherwise show all
    this.applyWorkflowFilter();
  }

  /**
   * Apply workflow filter based on selected IDs
   */
  applyWorkflowFilter(): void {
    if (this.selectedWorkflowIds.size === 0) {
      // No filter - show all workflows
      this.filteredWorkflowsByZone = new Map(this.workflowsByZone);
    } else {
      // Filter to show only selected workflows
      const filtered = new Map<string, WorkflowDisplayData[]>();

      this.workflowsByZone.forEach((workflows, zoneName) => {
        const selectedWorkflows = workflows.filter(w => this.selectedWorkflowIds.has(w.id));
        if (selectedWorkflows.length > 0) {
          filtered.set(zoneName, selectedWorkflows);
        }
      });

      this.filteredWorkflowsByZone = filtered;
    }
  }

  /**
   * Open workflow selection dialog
   */
  openSelectWorkflowsDialog(): void {
    const dialogRef = this.dialog.open(SelectWorkflowsDialogComponent, {
      width: '600px',
      maxHeight: '80vh',
      data: {
        workflowsByZone: this.workflowsByZone,
        selectedIds: this.selectedWorkflowIds
      } as SelectWorkflowsDialogData
    });

    dialogRef.afterClosed().subscribe((result: SelectWorkflowsDialogResult | undefined) => {
      if (result) {
        this.selectedWorkflowIds = result.selectedIds;
        this.applyWorkflowFilter();
      }
    });
  }

  /**
   * Get selected workflow count text
   */
  getSelectedWorkflowText(): string {
    if (this.selectedWorkflowIds.size === 0) {
      return 'All';
    }
    return `${this.selectedWorkflowIds.size}`;
  }

  /**
   * Clear workflow filter
   */
  clearWorkflowFilter(): void {
    this.selectedWorkflowIds.clear();
    this.applyWorkflowFilter();
  }

  /**
   * Find zone name for a workflow by matching with zone mappings
   */
  private findZoneForWorkflow(workflow: WorkflowDisplayData, zoneMap: Map<number, string>): string | null {
    // First try to match by checking if any zone mapping has matching workflow code
    for (const mapping of this.zoneMappings) {
      if (mapping.workflowCode === workflow.code) {
        return mapping.zoneName;
      }
    }

    // If no match by code, return null (will go to Uncategorized)
    return null;
  }

  /**
   * Toggle zone expansion
   */
  toggleZone(zoneName: string): void {
    if (this.expandedZones.has(zoneName)) {
      this.expandedZones.delete(zoneName);
    } else {
      this.expandedZones.add(zoneName);
    }
  }

  /**
   * Check if zone is expanded
   */
  isZoneExpanded(zoneName: string): boolean {
    return this.expandedZones.has(zoneName);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Stop all polling
    this.pollingSubscriptions.forEach(sub => sub.unsubscribe());
    this.pollingSubscriptions.clear();
    // Clear error counters
    this.jobQueryErrorCount.clear();
    this.robotQueryErrorCount.clear();
  }


  /**
   * Extract last number after the final dash from a node code
   * E.g., "Sim1-1-12" -> "12", "Sim1-1-1756095423769" -> "1756095423769"
   */
  private extractLastNodeNumber(nodeCode: string): string {
    const lastDashIndex = nodeCode.lastIndexOf('-');
    if (lastDashIndex >= 0 && lastDashIndex < nodeCode.length - 1) {
      return nodeCode.substring(lastDashIndex + 1);
    }
    return nodeCode;
  }

  /**
   * Parse zone nodes from JSON array or comma-separated string
   */
  private parseZoneNodes(nodesStr: string): string[] {
    if (!nodesStr) return [];

    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(nodesStr);
      // Ensure it's actually an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // If parsed but not an array, return empty
      return [];
    } catch {
      // If not JSON, try comma-separated
      return nodesStr.split(',').map(n => n.trim()).filter(n => n);
    }
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
      robotModels: [], // Empty - let AMR system assign based on template
      robotIds: [], // Empty - let AMR system assign based on template
      robotType: 'LIFT',
      priority: 1, // Priority: 1-4 (1 = highest priority)
      containerModelCode: '',
      containerCode: '',
      templateCode: workflow.code, // WorkflowCode from WorkflowDiagrams table
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

          // Initialize job tracking for this workflow
          this.workflowJobs.set(id, {
            missionCode: request.missionCode,
            requestId: request.requestId,
            workflowName: workflow.name,
            workflowId: workflow.id
          });

          // Start polling job status
          this.startJobPolling(id, request.missionCode, 'workflow');
        } else {
          // Handle API error response (success: false)
          const errorMsg = response.message || 'Unknown error occurred';
          const errorCode = response.code ? `[${response.code}]` : '';
          this.snackBar.open(`Failed to trigger workflow ${errorCode}: ${errorMsg}`, 'Close', { duration: 8000 });
          console.error('Workflow trigger failed:', response);
        }
      },
      error: (error) => {
        this.triggeringMissions.delete(id);
        // Handle HTTP/network errors
        const errorMsg = this.extractErrorMessage(error);
        this.snackBar.open(`Error triggering workflow: ${errorMsg}`, 'Close', { duration: 8000 });
        console.error('Error triggering workflow:', error);
      }
    });
  }


  /**
   * Start polling for job and robot status
   * @param id - Workflow ID
   * @param missionCode - Mission code to query
   */
  startJobPolling(id: number, missionCode: string): void {
    // Don't start if already polling
    if (this.pollingSubscriptions.has(missionCode)) {
      return;
    }

    // Poll every 3 seconds (as per API recommendation)
    const subscription = interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Query job status
        this.missionsService.queryJobs({
          jobCode: missionCode,
          limit: 10
        }).subscribe({
          next: (response) => {
            if (response.success && response.data && response.data.length > 0) {
              // Reset error counter on success
              this.jobQueryErrorCount.set(missionCode, 0);

              const jobData = response.data[0];

              // Update workflow job map
              const currentJob = this.workflowJobs.get(id);
              if (currentJob) {
                currentJob.jobData = jobData;
              }

              // Query robot status if robotId is available
              if (jobData.robotId) {
                this.queryRobotStatus(id, jobData.robotId);
              }

              // Stop polling if job is in terminal state
              if (MissionsUtils.isJobTerminal(jobData.status)) {
                // Create mission history record with completion data
                this.createMissionHistoryOnCompletion(id, missionCode, jobData);
                this.stopJobPolling(missionCode);
              }
            } else if (!response.success) {
              // Handle API error response (success: false)
              console.warn(`Job query failed for ${missionCode}:`, response.message || response.code);
              this.handleJobQueryError(missionCode, response.message || 'Job query failed');
            }
          },
          error: (error) => {
            console.error('Error polling job status:', error);
            const errorMsg = this.extractErrorMessage(error);
            this.handleJobQueryError(missionCode, errorMsg);
          }
        });
      });

    this.pollingSubscriptions.set(missionCode, subscription);
  }

  /**
   * Query robot status
   * @param id - Workflow ID
   * @param robotId - Robot ID to query
   */
  private queryRobotStatus(id: number, robotId: string): void {
    this.missionsService.queryRobots({
      robotId: robotId
    }).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          // Reset error counter on success
          this.robotQueryErrorCount.set(robotId, 0);

          const robotData = response.data[0];

          // Update workflow job map
          const currentJob = this.workflowJobs.get(id);
          if (currentJob) {
            currentJob.robotData = robotData;
          }
        } else if (!response.success) {
          // Handle API error response (success: false)
          console.warn(`Robot query failed for ${robotId}:`, response.message || response.code);
          this.handleRobotQueryError(robotId, response.message || 'Robot query failed');
        }
      },
      error: (error) => {
        console.error('Error querying robot status:', error);
        const errorMsg = this.extractErrorMessage(error);
        this.handleRobotQueryError(robotId, errorMsg);
      }
    });
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
    // Clean up error counters
    this.jobQueryErrorCount.delete(missionCode);
  }

  /**
   * Create mission history record when mission completes
   */
  private createMissionHistoryOnCompletion(
    id: number,
    missionCode: string,
    jobData: JobData
  ): void {
    // Get job metadata from tracking map
    const jobInfo = this.workflowJobs.get(id);

    if (!jobInfo) {
      console.error(`No job info found for workflow ID ${id}`);
      return;
    }

    // Only create history for completed missions (not failed/cancelled without execution)
    const finalStatus = MissionsUtils.getJobStatusText(jobData.status);

    const historyRequest: MissionHistoryRequest = {
      missionCode: missionCode,
      requestId: jobInfo.requestId || `request_${missionCode}`,
      workflowName: jobInfo.workflowName || 'Unknown',
      status: finalStatus,
      workflowId: jobInfo.workflowId,
      savedMissionId: jobInfo.savedMissionId,
      assignedRobotId: jobData.robotId,
      completedDate: new Date().toISOString(),
      // Use job creation time or current time as submitted time
      submittedToAmrDate: jobData.createTime || new Date().toISOString(),
      // For completed jobs, estimate processed date from job data
      processedDate: this.estimateProcessedDate(jobData)
    };

    this.missionHistoryService.addMissionHistory(historyRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log(`✓ Mission history created: ${missionCode} - ${finalStatus}`);
        },
        error: (error) => {
          console.error(`✗ Failed to create mission history for ${missionCode}:`, error);
        }
      });
  }

  /**
   * Estimate when the job started processing (for duration calculation)
   */
  private estimateProcessedDate(jobData: JobData): string | undefined {
    // If job has createTime and spendTime, calculate when it started
    if (jobData.createTime && jobData.spendTime) {
      const createDate = new Date(jobData.createTime);
      const completedDate = new Date();
      const processedDate = new Date(completedDate.getTime() - (jobData.spendTime * 1000));
      return processedDate.toISOString();
    }

    // Otherwise use createTime as a fallback
    return jobData.createTime || undefined;
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
    this.loadWorkflowsAndZones();
  }

  /**
   * Check if workflow has active job
   */
  hasActiveJob(id: number): boolean {
    return this.workflowJobs.has(id);
  }

  /**
   * Get active job count for badge
   */
  getActiveJobCount(): number {
    return this.workflowJobs.size;
  }

  /**
   * Refresh single workflow job status
   */
  refreshWorkflowStatus(workflow: WorkflowDisplayData): void {
    const job = this.workflowJobs.get(workflow.id);
    if (job && job.missionCode) {
      this.snackBar.open('Refreshing job status...', '', { duration: 1000 });
      // Polling will automatically update the status
    } else {
      this.snackBar.open('No active job for this workflow', 'Close', { duration: 2000 });
    }
  }

  /**
   * View workflow details (placeholder for future implementation)
   */
  viewWorkflowDetails(workflow: WorkflowDisplayData): void {
    this.snackBar.open(`View details for: ${workflow.name}`, 'Close', { duration: 2000 });
    // TODO: Open dialog or navigate to details page
  }

  /**
   * Cancel mission - opens dialog to select cancel mode
   */
  cancelMission(id: number, event?: Event): void {
    // Prevent event propagation if called from button
    if (event) {
      event.stopPropagation();
    }

    const job = this.workflowJobs.get(id);

    if (!job || !job.missionCode) {
      this.snackBar.open('No active mission to cancel', 'Close', { duration: 2000 });
      return;
    }

    // Check if job is already in terminal state
    if (job.jobData && this.MissionsUtils.isJobTerminal(job.jobData.status)) {
      this.snackBar.open('Mission has already completed', 'Close', { duration: 2000 });
      return;
    }

    // Get mission name based on type
    const missionName = job.workflowName || 'Unknown Mission';

    // Open cancel confirmation dialog
    const dialogRef = this.dialog.open(CancelMissionDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        missionName: missionName,
        missionCode: job.missionCode
      } as CancelMissionDialogData
    });

    dialogRef.afterClosed().subscribe((result: CancelMissionDialogResult | undefined) => {
      if (!result) {
        // User cancelled the dialog
        return;
      }

      // Proceed with cancellation
      this.cancellingMissions.add(id);

      // Call cancel API with selected mode
      this.missionsService.cancelMission({
        requestId: job.requestId || this.generateRequestId(),
        missionCode: job.missionCode,
        containerCode: '',
        position: '',
        cancelMode: result.cancelMode,
        reason: result.reason || ''
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.cancellingMissions.delete(id);
            if (response.success) {
              // Stop polling for this mission
              this.stopJobPolling(job.missionCode);
              // Remove from tracking
              jobsMap.delete(id);
              this.snackBar.open(`Mission cancelled successfully (${result.cancelMode})`, 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            this.cancellingMissions.delete(id);
            console.error('Error cancelling mission:', error);
          }
        });
    });
  }

  /**
   * Check if mission is being cancelled
   */
  isCancelling(id: number): boolean {
    return this.cancellingMissions.has(id);
  }

  /**
   * Extract error message from HTTP error response
   */
  private extractErrorMessage(error: any): string {
    // Handle external AMR API error format (500 error with message field)
    if (error.error?.message) {
      return error.error.message;
    }

    // Handle standard error object
    if (error.message) {
      return error.message;
    }

    // Handle HTTP status errors
    if (error.status) {
      switch (error.status) {
        case 0:
          return 'Unable to connect to server';
        case 404:
          return 'Resource not found';
        case 500:
          return 'Internal server error';
        case 503:
          return 'Service unavailable';
        default:
          return `HTTP ${error.status} error`;
      }
    }

    return 'Unknown error occurred';
  }

  /**
   * Handle job query errors with retry limit
   */
  private handleJobQueryError(missionCode: string, errorMsg: string): void {
    const currentCount = (this.jobQueryErrorCount.get(missionCode) || 0) + 1;
    this.jobQueryErrorCount.set(missionCode, currentCount);

    if (currentCount >= this.MAX_CONSECUTIVE_ERRORS) {
      // Stop polling after max consecutive errors
      this.stopJobPolling(missionCode);
      this.jobQueryErrorCount.delete(missionCode);

      this.snackBar.open(
        `Job status polling stopped after ${this.MAX_CONSECUTIVE_ERRORS} errors: ${errorMsg}`,
        'Close',
        { duration: 8000 }
      );
      console.error(`Job query stopped for ${missionCode} after ${this.MAX_CONSECUTIVE_ERRORS} errors`);
    } else if (currentCount === 3) {
      // Warn user after 3 errors (but continue polling)
      this.snackBar.open(
        `Job status query issues detected: ${errorMsg}`,
        'Close',
        { duration: 5000 }
      );
    }
  }

  /**
   * Handle robot query errors with retry limit
   */
  private handleRobotQueryError(robotId: string, errorMsg: string): void {
    const currentCount = (this.robotQueryErrorCount.get(robotId) || 0) + 1;
    this.robotQueryErrorCount.set(robotId, currentCount);

    // Only notify user after 5 consecutive errors (robot data is less critical)
    if (currentCount === this.MAX_CONSECUTIVE_ERRORS) {
      this.snackBar.open(
        `Robot status unavailable for ${robotId}: ${errorMsg}`,
        'Close',
        { duration: 5000 }
      );
    }

    // Don't stop polling robot status - job status is more important
    // Robot data will just remain unavailable in the UI
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
