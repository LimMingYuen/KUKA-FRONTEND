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
import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import { WorkflowService } from '../../services/workflow.service';
import { MissionHistoryService } from '../../services/mission-history.service';
import { WorkflowNodeCodesService } from '../../services/workflow-node-codes.service';
import { MissionQueueService } from '../../services/mission-queue.service';
import { AuthService } from '../../services/auth.service';
import { AddToQueueRequest, MissionQueueDisplayData } from '../../models/mission-queue.models';
import { SavedCustomMissionDto } from '../../models/saved-custom-missions.models';
import { WorkflowDisplayData } from '../../models/workflow.models';
import { JobData, RobotData, MissionsUtils } from '../../models/missions.models';
import { MissionHistoryRequest } from '../../models/mission-history.models';
import { WorkflowZoneMapping } from '../../models/workflow-node-codes.models';
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
  public savedTemplates: SavedCustomMissionDto[] = [];
  public workflows: WorkflowDisplayData[] = [];
  public zoneMappings: WorkflowZoneMapping[] = [];

  // Grouped templates by zone (using templateCode zone mapping)
  public templatesByZone: Map<string, SavedCustomMissionDto[]> = new Map();
  public filteredTemplatesByZone: Map<string, SavedCustomMissionDto[]> = new Map();
  public selectedTemplateIds: Set<number> = new Set();
  public expandedZones: Set<string> = new Set();

  // Store job execution state for each workflow (dual tracking: queue + job)
  public workflowJobs: Map<number, {
    missionCode: string;
    requestId?: string;
    workflowName?: string;
    workflowId?: number;
    savedMissionId?: number;
    queueId?: number;              // Queue record ID for tracking
    queueStatus?: string;          // Queue status (Queued/Processing/Assigned/etc)
    queuePosition?: number;        // Position in queue
    assignedRobotId?: string;      // Robot assigned by queue processor
    jobData?: JobData;             // Real-time job status from external AMR
    robotData?: RobotData;         // Real-time robot position/status
    error?: string;                // Error message from API failures
  }> = new Map();

  // Loading states
  public isLoadingTemplates = false;
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
    private savedCustomMissionsService: SavedCustomMissionsService,
    private workflowService: WorkflowService,
    private missionHistoryService: MissionHistoryService,
    private workflowNodeCodesService: WorkflowNodeCodesService,
    private missionQueueService: MissionQueueService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorkflowsAndZones();
    this.restoreActiveJobs();
  }

  /**
   * Restore active jobs from MissionQueue on page load
   * This allows users to navigate away and come back without losing tracking
   */
  restoreActiveJobs(): void {
    this.missionQueueService.getAllQueueItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (queueItems: MissionQueueDisplayData[]) => {
          // Filter for active (non-terminal) queue items
          const activeItems = queueItems.filter((item: MissionQueueDisplayData) =>
            item.statusCode === 0 || // Queued
            item.statusCode === 1 || // Processing
            item.statusCode === 2    // Assigned
          );

          console.log(`Restoring ${activeItems.length} active job(s) from queue`);

          // Restore tracking for each active item that has a savedMissionId
          activeItems.forEach((item: MissionQueueDisplayData) => {
            if (item.savedMissionId) {
              // Restore to workflowJobs map
              this.workflowJobs.set(item.savedMissionId, {
                missionCode: item.missionCode,
                requestId: item.requestId,
                workflowName: item.missionName,
                savedMissionId: item.savedMissionId,
                queueId: item.id,
                queueStatus: item.status,
                queuePosition: item.queuePosition,
                assignedRobotId: item.assignedRobotId || undefined
              });

              // Start queue polling
              this.startQueuePolling(item.savedMissionId, item.id);

              // If already Assigned, also start job polling
              if (item.statusCode === 2) {
                console.log(`Restoring job polling for Assigned mission: ${item.missionCode}`);
                this.startJobPolling(item.savedMissionId, item.missionCode);
              }
            }
          });
        },
        error: (error: any) => {
          console.error('Error restoring active jobs from queue:', error);
        }
      });
  }

  /**
   * Load ALL saved templates (both sync workflow and custom mission templates)
   */
  loadWorkflowsAndZones(): void {
    this.isLoadingTemplates = true;
    this.isLoadingZoneMappings = true;

    forkJoin({
      templates: this.savedCustomMissionsService.getAllSavedMissions(),
      workflows: this.workflowService.getWorkflows(),
      zoneMappings: this.workflowNodeCodesService.getZoneMappings()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Get allowed templates from auth (SuperAdmin sees all)
          const allowedTemplateIds = new Set(this.authService.getAllowedTemplates());
          const isSuperAdmin = this.authService.isSuperAdmin();

          // Filter templates based on permissions (SuperAdmin sees all)
          const filteredTemplates = result.templates.filter(t =>
            isSuperAdmin || allowedTemplateIds.has(t.id)
          );

          // Convert display data back to DTO format for internal use
          this.savedTemplates = filteredTemplates.map(displayData => ({
            id: displayData.id,
            missionName: displayData.missionName,
            description: displayData.description === '-' ? null : displayData.description,
            missionType: displayData.missionType,
            robotType: displayData.robotType,
            priority: displayData.priority,
            robotModels: displayData.robotModels === '-' ? '' : displayData.robotModels,
            robotIds: displayData.robotIds === '-' ? '' : displayData.robotIds,
            containerModelCode: displayData.containerModelCode === '-' ? null : displayData.containerModelCode,
            containerCode: displayData.containerCode === '-' ? null : displayData.containerCode,
            idleNode: displayData.idleNode === '-' ? null : displayData.idleNode,
            orgId: displayData.orgId === '-' ? null : displayData.orgId,
            viewBoardType: displayData.viewBoardType === '-' ? null : displayData.viewBoardType,
            templateCode: displayData.templateCode === '-' ? null : displayData.templateCode,
            lockRobotAfterFinish: displayData.lockRobotAfterFinish,
            unlockRobotId: displayData.unlockRobotId === '-' ? null : displayData.unlockRobotId,
            unlockMissionCode: displayData.unlockMissionCode === '-' ? null : displayData.unlockMissionCode,
            missionStepsJson: displayData.missionStepsJson,
            createdBy: displayData.createdBy,
            createdUtc: displayData.createdUtc,
            updatedUtc: displayData.updatedUtc === '-' ? null : displayData.updatedUtc,
            scheduleSummary: {
              totalSchedules: displayData.activeSchedules,
              activeSchedules: displayData.activeSchedules,
              nextRunUtc: displayData.nextRunUtc === '-' ? null : displayData.nextRunUtc,
              lastStatus: displayData.lastStatus === '-' ? null : displayData.lastStatus,
              lastRunUtc: displayData.lastRunUtc === '-' ? null : displayData.lastRunUtc
            }
          }));
          this.workflows = result.workflows;
          this.zoneMappings = result.zoneMappings;
          this.groupTemplatesByZone();
          this.isLoadingTemplates = false;
          this.isLoadingZoneMappings = false;
        },
        error: (error) => {
          console.error('Error loading saved templates and zones:', error);
          this.isLoadingTemplates = false;
          this.isLoadingZoneMappings = false;
          this.snackBar.open('Failed to load saved templates', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Group saved templates by zone name using zone mappings
   */
  groupTemplatesByZone(): void {
    // Group templates by zone based on their templateCode
    const grouped = new Map<string, SavedCustomMissionDto[]>();

    this.savedTemplates.forEach(template => {
      // Find zone name by matching template's templateCode with zone mappings
      const zoneName = this.findZoneForTemplate(template) || 'Uncategorized';

      if (!grouped.has(zoneName)) {
        grouped.set(zoneName, []);
        // Expand all zones by default
        this.expandedZones.add(zoneName);
      }
      grouped.get(zoneName)!.push(template);
    });

    // Sort zones alphabetically, but keep "Uncategorized" at the end
    const sortedGrouped = new Map<string, SavedCustomMissionDto[]>();
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      sortedGrouped.set(key, grouped.get(key)!);
    });

    this.templatesByZone = sortedGrouped;

    // Apply filter if any templates are selected, otherwise show all
    this.applyTemplateFilter();
  }

  /**
   * Apply template filter based on selected IDs
   */
  applyTemplateFilter(): void {
    if (this.selectedTemplateIds.size === 0) {
      // No filter - show all templates
      this.filteredTemplatesByZone = new Map(this.templatesByZone);
    } else {
      // Filter to show only selected templates
      const filtered = new Map<string, SavedCustomMissionDto[]>();

      this.templatesByZone.forEach((templates, zoneName) => {
        const selectedTemplates = templates.filter(t => this.selectedTemplateIds.has(t.id));
        if (selectedTemplates.length > 0) {
          filtered.set(zoneName, selectedTemplates);
        }
      });

      this.filteredTemplatesByZone = filtered;
    }
  }

  /**
   * Open template selection dialog
   * TODO: Create a generic dialog for both workflows and templates
   */
  openSelectWorkflowsDialog(): void {
    this.snackBar.open('Template filtering coming soon!', 'Close', { duration: 2000 });
    // Temporarily disabled until we create a generic selection dialog
    // that works with both WorkflowDisplayData and SavedCustomMissionDto
  }

  /**
   * Get selected template count text
   */
  getSelectedWorkflowText(): string {
    if (this.selectedTemplateIds.size === 0) {
      return 'All';
    }
    return `${this.selectedTemplateIds.size}`;
  }

  /**
   * Clear template filter
   */
  clearWorkflowFilter(): void {
    this.selectedTemplateIds.clear();
    this.applyTemplateFilter();
  }

  /**
   * Find zone name for a saved template by matching templateCode with zone mappings
   */
  private findZoneForTemplate(template: SavedCustomMissionDto): string | null {
    // Try to match by templateCode with zone mapping workflow codes
    for (const mapping of this.zoneMappings) {
      if (mapping.workflowCode === template.templateCode) {
        return mapping.zoneName;
      }
    }

    // If no match, return null (will go to Uncategorized)
    return null;
  }

  /**
   * Get workflow name from workflow code
   */
  getWorkflowName(templateCode: string | null): string {
    if (!templateCode) {
      return 'No workflow selected';
    }

    const workflow = this.workflows.find(w => w.code === templateCode);
    return workflow ? workflow.name : templateCode;
  }

  /**
   * Check if template is a sync workflow (empty mission steps)
   */
  isSyncWorkflow(template: SavedCustomMissionDto): boolean {
    const stepsJson = template.missionStepsJson?.trim();
    return !stepsJson || stepsJson === '[]';
  }

  /**
   * Get mission steps count for custom missions
   */
  getMissionStepsCount(template: SavedCustomMissionDto): number {
    try {
      const steps = JSON.parse(template.missionStepsJson || '[]');
      return Array.isArray(steps) ? steps.length : 0;
    } catch {
      return 0;
    }
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
   * Trigger sync workflow mission from saved template - adds to queue for processing
   */
  triggerWorkflow(template: SavedCustomMissionDto): void {
    const id = template.id;
    this.triggeringMissions.add(id);

    // Parse robot models and IDs from comma-separated strings
    const robotModels = template.robotModels ?
      (typeof template.robotModels === 'string' ?
        template.robotModels.split(',').map(s => s.trim()).filter(s => s) :
        template.robotModels) : [];

    const robotIds = template.robotIds ?
      (typeof template.robotIds === 'string' ?
        template.robotIds.split(',').map(s => s.trim()).filter(s => s) :
        template.robotIds) : [];

    const missionCode = this.generateMissionCode();
    const requestId = this.generateRequestId();

    // Build the mission request JSON that will be stored in the queue
    const missionRequestJson = JSON.stringify({
      orgId: template.orgId || 'UNIVERSAL',
      requestId: requestId,
      missionCode: missionCode,
      missionType: template.missionType || 'RACK_MOVE',
      viewBoardType: template.viewBoardType || '',
      robotModels: robotModels,
      robotIds: robotIds,
      robotType: template.robotType || 'LIFT',
      priority: parseInt(template.priority) || 1,
      containerModelCode: template.containerModelCode || '',
      containerCode: template.containerCode || '',
      templateCode: template.templateCode || '',
      lockRobotAfterFinish: template.lockRobotAfterFinish || false,
      unlockRobotId: template.unlockRobotId || '',
      unlockMissionCode: template.unlockMissionCode || '',
      idleNode: template.idleNode || ''
    });

    // Create queue request
    const queueRequest: AddToQueueRequest = {
      missionCode: missionCode,
      requestId: requestId,
      savedMissionId: template.id,
      missionName: template.missionName,
      missionRequestJson: missionRequestJson,
      priority: parseInt(template.priority) || 1,
      robotTypeFilter: template.robotType || undefined,
      preferredRobotIds: robotIds.length > 0 ? robotIds.join(',') : undefined
    };

    // Add to queue instead of direct submission
    this.missionQueueService.addToQueue(queueRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (queueItem) => {
          this.triggeringMissions.delete(id);

          // Store queue info in workflowJobs map for tracking
          this.workflowJobs.set(id, {
            missionCode: missionCode,
            requestId: requestId,
            workflowName: template.missionName,
            savedMissionId: template.id,
            queueId: queueItem.id,
            queueStatus: queueItem.status, // Already a string from backend
            queuePosition: queueItem.queuePosition,
            assignedRobotId: queueItem.assignedRobotId || undefined
          });

          // Start polling queue status
          this.startQueuePolling(id, queueItem.id);

          this.snackBar.open(
            `"${template.missionName}" added to queue at position ${queueItem.queuePosition}`,
            'View Queue',
            { duration: 5000 }
          ).onAction().subscribe(() => {
            // Navigate to queue monitor when user clicks "View Queue"
            window.location.href = '/queue-monitor';
          });
        },
        error: (error) => {
          this.triggeringMissions.delete(id);
          console.error('Error adding to queue:', error);
          this.snackBar.open('Failed to add mission to queue', 'Close', { duration: 3000 });
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
              // Reset error counter and clear error on success
              this.jobQueryErrorCount.set(missionCode, 0);

              const jobData = response.data[0];

              // Update workflow job map
              const currentJob = this.workflowJobs.get(id);
              if (currentJob) {
                currentJob.jobData = jobData;
                currentJob.error = undefined; // Clear any previous error
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
   * Start polling for queue status (every 5 seconds)
   * @param templateId - Template ID for tracking
   * @param queueId - Queue record ID
   */
  startQueuePolling(templateId: number, queueId: number): void {
    const pollKey = `queue_${queueId}`;

    // Don't start if already polling
    if (this.pollingSubscriptions.has(pollKey)) {
      return;
    }

    // Poll every 5 seconds (same as Queue Monitor)
    const subscription = interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.missionQueueService.getById(queueId).subscribe({
          next: (queueItem) => {
            const job = this.workflowJobs.get(templateId);
            if (!job) return;

            // Update queue status
            job.queueStatus = queueItem.status; // Already a string from backend
            job.queuePosition = queueItem.queuePosition;
            job.assignedRobotId = queueItem.assignedRobotId || undefined;

            // If status changed to Assigned (statusCode = 2), start job polling
            if (queueItem.statusCode === 2 && !this.pollingSubscriptions.has(job.missionCode)) {
              console.log(`Queue status changed to Assigned, starting job polling for ${job.missionCode}`);
              this.startJobPolling(templateId, job.missionCode);
            }

            // If terminal state reached (statusCode 3/4/5), stop queue polling
            if (queueItem.statusCode === 3 || queueItem.statusCode === 4 || queueItem.statusCode === 5) {
              // Completed, Failed, or Cancelled
              console.log(`Queue reached terminal state: ${queueItem.status}`);
              this.stopQueuePolling(queueId);
            }
          },
          error: (error) => {
            console.error('Error polling queue status:', error);
          }
        });
      });

    this.pollingSubscriptions.set(pollKey, subscription);
  }

  /**
   * Stop queue polling
   */
  stopQueuePolling(queueId: number): void {
    const pollKey = `queue_${queueId}`;
    const subscription = this.pollingSubscriptions.get(pollKey);
    if (subscription) {
      subscription.unsubscribe();
      this.pollingSubscriptions.delete(pollKey);
    }
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
   * Check if workflow has active job (not in terminal state)
   */
  hasActiveJob(id: number): boolean {
    const job = this.workflowJobs.get(id);
    if (!job) return false;

    // Check if in terminal queue state
    const terminalQueueStates = ['Completed', 'Failed', 'Cancelled'];
    if (job.queueStatus && terminalQueueStates.includes(job.queueStatus)) {
      return false;
    }

    // Check if job is in terminal state
    if (job.jobData && this.MissionsUtils.isJobTerminal(job.jobData.status)) {
      return false;
    }

    return true;
  }

  /**
   * Get active job count for badge
   */
  getActiveJobCount(): number {
    return this.workflowJobs.size;
  }

  /**
   * Refresh single template job status
   */
  refreshWorkflowStatus(template: SavedCustomMissionDto): void {
    const job = this.workflowJobs.get(template.id);
    if (job && job.missionCode) {
      this.snackBar.open('Refreshing job status...', '', { duration: 1000 });
      // Polling will automatically update the status
    } else {
      this.snackBar.open('No active job for this template', 'Close', { duration: 2000 });
    }
  }

  /**
   * View template details (placeholder for future implementation)
   */
  viewWorkflowDetails(template: SavedCustomMissionDto): void {
    this.snackBar.open(`View details for: ${template.missionName}`, 'Close', { duration: 2000 });
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

      // Check if mission is in queue (has queueId)
      if (job.queueId) {
        // Mission is in queue - use queue cancel API
        // Backend will call external AMR cancel if status = Assigned
        this.missionQueueService.cancel(job.queueId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.cancellingMissions.delete(id);
              // Stop all polling
              this.stopQueuePolling(job.queueId!);
              this.stopJobPolling(job.missionCode);
              // Remove from tracking
              this.workflowJobs.delete(id);
              this.snackBar.open('Mission cancelled successfully', 'Close', { duration: 3000 });
            },
            error: (error) => {
              this.cancellingMissions.delete(id);
              console.error('Error cancelling mission from queue:', error);
              this.snackBar.open('Failed to cancel mission', 'Close', { duration: 3000 });
            }
          });
      } else {
        // Mission was directly submitted (not in queue) - use direct cancel API
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
                this.workflowJobs.delete(id);
                this.snackBar.open(`Mission cancelled successfully (${result.cancelMode})`, 'Close', { duration: 3000 });
              }
            },
            error: (error) => {
              this.cancellingMissions.delete(id);
              console.error('Error cancelling mission:', error);
              this.snackBar.open('Failed to cancel mission', 'Close', { duration: 3000 });
            }
          });
      }
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

    // Find the job by missionCode and set error
    for (const [id, job] of this.workflowJobs.entries()) {
      if (job.missionCode === missionCode) {
        job.error = errorMsg;
        break;
      }
    }

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
