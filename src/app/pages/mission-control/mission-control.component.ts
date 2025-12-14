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
import { WorkflowNodeCodesService } from '../../services/workflow-node-codes.service';
import { MissionQueueService } from '../../services/mission-queue.service';
import { MapZonesService } from '../../services/map-zones.service';
import { TemplateCategoryService } from '../../services/template-category.service';
import { AuthService } from '../../services/auth.service';
import { MapZoneWithNodesDto } from '../../models/map-zone.models';
import { AddToQueueRequest, MissionQueueDisplayData } from '../../models/mission-queue.models';
import { SavedCustomMissionDto, SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';
import { TemplateCategoryDto } from '../../models/template-category.models';
import { WorkflowDisplayData } from '../../models/workflow.models';
import { JobData, RobotData, MissionsUtils, MissionStepData, OperationFeedbackRequest } from '../../models/missions.models';
import { Subject, takeUntil, interval, forkJoin, of, switchMap, catchError } from 'rxjs';
import { CancelMissionDialogComponent, CancelMissionDialogData, CancelMissionDialogResult } from '../../shared/dialogs/cancel-mission-dialog/cancel-mission-dialog.component';
import { SelectTemplatesDialogComponent, SelectTemplatesDialogData, SelectTemplatesDialogResult } from '../../shared/dialogs/select-templates-dialog/select-templates-dialog.component';
import { AdminAuthorizationDialogComponent, AdminAuthorizationDialogData, AdminAuthorizationDialogResult } from '../../shared/dialogs/admin-authorization-dialog/admin-authorization-dialog.component';
import { CategoryManagementDialogComponent } from '../../shared/dialogs/category-management-dialog/category-management-dialog.component';
import { MoveToCategoryDialogComponent, MoveToCategoryDialogData, MoveToCategoryDialogResult } from '../../shared/dialogs/move-to-category-dialog/move-to-category-dialog.component';
import { AddTemplatesToCategoryDialogComponent, AddTemplatesToCategoryDialogData, AddTemplatesToCategoryDialogResult } from '../../shared/dialogs/add-templates-to-category-dialog/add-templates-to-category-dialog.component';

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
  public savedTemplates: SavedCustomMissionsDisplayData[] = [];
  public workflows: WorkflowDisplayData[] = [];
  public categories: TemplateCategoryDto[] = [];

  // MapZones data for manual waypoint position matching
  private mapZonesWithNodes: MapZoneWithNodesDto[] = [];

  // Grouped templates by category (using manual user assignment)
  public templatesByCategory: Map<string, SavedCustomMissionsDisplayData[]> = new Map();
  public filteredTemplatesByCategory: Map<string, SavedCustomMissionsDisplayData[]> = new Map();
  public selectedTemplateIds: Set<number> = new Set();
  public expandedCategories: Set<string> = new Set();

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
    missionSteps?: MissionStepData[];        // Parsed mission steps for manual tracking
    currentStepIndex?: number;                // Current step being executed
    isWaitingForManualConfirm?: boolean;      // True when at MANUAL waypoint
    currentManualStep?: MissionStepData;      // The current MANUAL step waiting for confirmation
    confirmedManualPositions?: Set<string>;   // Track confirmed manual positions
  }> = new Map();

  // Loading states
  public isLoadingTemplates = false;
  public isLoadingCategories = false;
  public triggeringMissions: Set<number> = new Set();
  public cancellingMissions: Set<number> = new Set();

  // Concurrency blocking: templateId -> reason
  public blockedTemplates: Map<number, string> = new Map();

  // Cleanup
  private destroy$ = new Subject<void>();
  private pollingSubscriptions: Map<string, any> = new Map();

  // Error tracking for polling
  private jobQueryErrorCount: Map<string, number> = new Map();
  private robotQueryErrorCount: Map<string, number> = new Map();
  private readonly MAX_CONSECUTIVE_ERRORS = 5;

  // Expose MissionsUtils to template
  public readonly MissionsUtils = MissionsUtils;

  /**
   * Check if current user is SuperAdmin (exposed for template)
   */
  public get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  constructor(
    private missionsService: MissionsService,
    private savedCustomMissionsService: SavedCustomMissionsService,
    private workflowService: WorkflowService,
    private workflowNodeCodesService: WorkflowNodeCodesService,
    private missionQueueService: MissionQueueService,
    private mapZonesService: MapZonesService,
    private templateCategoryService: TemplateCategoryService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTemplatesAndCategories();
    this.restoreActiveJobs();
    this.loadMapZonesForPositionMatching();
  }

  /**
   * Load MapZones with nodes for manual waypoint position matching
   */
  private loadMapZonesForPositionMatching(): void {
    this.mapZonesService.getMapZonesWithNodes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (zones) => {
          this.mapZonesWithNodes = zones;
        },
        error: (error) => {
        }
      });
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
                this.startJobPolling(item.savedMissionId, item.missionCode);
              }
            }
          });
        },
        error: (error: any) => {
        }
      });
  }

  /**
   * Load ALL saved templates and categories
   */
  loadTemplatesAndCategories(): void {
    this.isLoadingTemplates = true;
    this.isLoadingCategories = true;

    forkJoin({
      templates: this.savedCustomMissionsService.getAllSavedMissions(),
      workflows: this.workflowService.getWorkflows(),
      categories: this.templateCategoryService.getAll()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
        next: (result) => {
          // Get allowed templates from auth (SuperAdmin sees all)
          const allowedTemplateIds = new Set(this.authService.getAllowedTemplates());
          const isSuperAdmin = this.authService.isSuperAdmin();

          // Filter templates based on permissions (SuperAdmin sees all)
          this.savedTemplates = result.templates.filter(t =>
            isSuperAdmin || allowedTemplateIds.has(t.id)
          );
          this.workflows = result.workflows;
          this.categories = result.categories;
          this.groupTemplatesByCategory();
          this.isLoadingTemplates = false;
          this.isLoadingCategories = false;
        },
        error: (error) => {
          this.isLoadingTemplates = false;
          this.isLoadingCategories = false;
          this.snackBar.open('Failed to load saved templates', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Group saved templates by category name
   * Templates are sorted alphabetically within each category
   * Also includes empty categories (user-created categories with no templates yet)
   */
  groupTemplatesByCategory(): void {
    const grouped = new Map<string, SavedCustomMissionsDisplayData[]>();

    // First, add all user-created categories (even empty ones)
    this.categories.forEach(category => {
      grouped.set(category.name, []);
      this.expandedCategories.add(category.name);
    });

    // Always include "Uncategorized" for templates without a category
    grouped.set('Uncategorized', []);
    this.expandedCategories.add('Uncategorized');

    // Then add templates to their respective categories
    this.savedTemplates.forEach(template => {
      // Use categoryName from template or 'Uncategorized' if null
      const categoryName = template.categoryName || 'Uncategorized';

      if (!grouped.has(categoryName)) {
        // This shouldn't happen if categories are loaded correctly, but handle it
        grouped.set(categoryName, []);
        this.expandedCategories.add(categoryName);
      }
      grouped.get(categoryName)!.push(template);
    });

    // Sort templates alphabetically within each category
    grouped.forEach((templates, categoryName) => {
      templates.sort((a, b) => a.missionName.localeCompare(b.missionName));
    });

    // Sort categories alphabetically, but keep "Uncategorized" at the end
    const sortedGrouped = new Map<string, SavedCustomMissionsDisplayData[]>();
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      sortedGrouped.set(key, grouped.get(key)!);
    });

    this.templatesByCategory = sortedGrouped;

    // Apply filter if any templates are selected, otherwise show all
    this.applyTemplateFilter();
  }

  /**
   * Apply template filter based on selected IDs
   */
  applyTemplateFilter(): void {
    if (this.selectedTemplateIds.size === 0) {
      // No filter - show all templates
      this.filteredTemplatesByCategory = new Map(this.templatesByCategory);
    } else {
      // Filter to show only selected templates
      const filtered = new Map<string, SavedCustomMissionsDisplayData[]>();

      this.templatesByCategory.forEach((templates, categoryName) => {
        const selectedTemplates = templates.filter(t => this.selectedTemplateIds.has(t.id));
        if (selectedTemplates.length > 0) {
          filtered.set(categoryName, selectedTemplates);
        }
      });

      this.filteredTemplatesByCategory = filtered;
    }
  }

  /**
   * Open template selection dialog
   */
  openSelectWorkflowsDialog(): void {
    const dialogRef = this.dialog.open(SelectTemplatesDialogComponent, {
      width: '600px',
      maxHeight: '80vh',
      data: {
        templatesByZone: this.templatesByCategory,
        selectedIds: this.selectedTemplateIds
      } as SelectTemplatesDialogData
    });

    dialogRef.afterClosed().subscribe((result: SelectTemplatesDialogResult | undefined) => {
      if (result) {
        this.selectedTemplateIds = result.selectedIds;
        this.applyTemplateFilter();
      }
    });
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
  isSyncWorkflow(template: SavedCustomMissionsDisplayData): boolean {
    const stepsJson = template.missionStepsJson?.trim();
    return !stepsJson || stepsJson === '[]';
  }

  /**
   * Get mission steps count for custom missions
   */
  getMissionStepsCount(template: SavedCustomMissionsDisplayData): number {
    try {
      const steps = JSON.parse(template.missionStepsJson || '[]');
      return Array.isArray(steps) ? steps.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Toggle category expansion
   */
  toggleCategory(categoryName: string): void {
    if (this.expandedCategories.has(categoryName)) {
      this.expandedCategories.delete(categoryName);
    } else {
      this.expandedCategories.add(categoryName);
    }
  }

  /**
   * Check if category is expanded
   */
  isCategoryExpanded(categoryName: string): boolean {
    return this.expandedCategories.has(categoryName);
  }

  /**
   * Open category management dialog
   */
  openCategoryManagementDialog(): void {
    const dialogRef = this.dialog.open(CategoryManagementDialogComponent, {
      width: '600px',
      maxHeight: '80vh',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(() => {
      // Reload templates and categories after dialog closes
      this.loadTemplatesAndCategories();
    });
  }

  /**
   * Open move to category dialog for a template
   */
  openMoveToCategoryDialog(template: SavedCustomMissionsDisplayData): void {
    const dialogRef = this.dialog.open(MoveToCategoryDialogComponent, {
      width: '500px',
      maxHeight: '70vh',
      data: {
        template: template,
        categories: this.categories,
        currentCategoryId: template.categoryId
      } as MoveToCategoryDialogData
    });

    dialogRef.afterClosed().subscribe((result: MoveToCategoryDialogResult | undefined) => {
      if (result) {
        // Assign the template to the new category
        this.savedCustomMissionsService.assignCategory(template.id, result.categoryId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              const categoryName = result.categoryId
                ? this.categories.find(c => c.id === result.categoryId)?.name || 'Unknown'
                : 'Uncategorized';
              this.snackBar.open(
                `Moved "${template.missionName}" to ${categoryName}`,
                'Close',
                { duration: 3000 }
              );
              // Reload templates and categories
              this.loadTemplatesAndCategories();
            },
            error: (error) => {
              this.snackBar.open('Failed to move template', 'Close', { duration: 3000 });
            }
          });
      }
    });
  }

  /**
   * Open dialog to add templates to a category
   */
  openAddToCategoryDialog(categoryName: string): void {
    // Find the category ID (null for Uncategorized)
    const category = this.categories.find(c => c.name === categoryName);
    const categoryId = categoryName === 'Uncategorized' ? null : category?.id || null;

    const dialogRef = this.dialog.open(AddTemplatesToCategoryDialogComponent, {
      width: '550px',
      maxHeight: '80vh',
      data: {
        categoryName: categoryName,
        categoryId: categoryId,
        allTemplates: this.savedTemplates
      } as AddTemplatesToCategoryDialogData
    });

    dialogRef.afterClosed().subscribe((result: AddTemplatesToCategoryDialogResult | undefined) => {
      if (result && result.selectedTemplateIds.length > 0) {
        // Move all selected templates to the category
        const movePromises = result.selectedTemplateIds.map(templateId =>
          this.savedCustomMissionsService.assignCategory(templateId, categoryId).toPromise()
        );

        Promise.all(movePromises)
          .then(() => {
            this.snackBar.open(
              `Added ${result.selectedTemplateIds.length} template(s) to "${categoryName}"`,
              'Close',
              { duration: 3000 }
            );
            this.loadTemplatesAndCategories();
          })
          .catch(() => {
            this.snackBar.open('Failed to move some templates', 'Close', { duration: 3000 });
            this.loadTemplatesAndCategories();
          });
      }
    });
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
  triggerWorkflow(template: SavedCustomMissionsDisplayData): void {
    const id = template.id;

    // Check concurrency mode for "Wait" templates
    if (template.concurrencyMode === 'Wait') {
      this.triggeringMissions.add(id);
      this.missionQueueService.getActiveCount(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (count) => {
            if (count > 0) {
              this.triggeringMissions.delete(id);
              this.blockedTemplates.set(id, `${count} active mission(s) - waiting for completion`);
              this.snackBar.open(
                `Cannot trigger "${template.missionName}". ${count} active mission(s) must complete first.`,
                'Close',
                { duration: 5000 }
              );
              return;
            }
            // Clear any previous block and proceed
            this.blockedTemplates.delete(id);
            this.doTriggerWorkflow(template);
          },
          error: () => {
            // On error, try to trigger anyway (backend will validate)
            this.doTriggerWorkflow(template);
          }
        });
    } else {
      // Unlimited mode - proceed directly
      this.triggeringMissions.add(id);
      this.doTriggerWorkflow(template);
    }
  }

  /**
   * Internal method to actually trigger the workflow (after concurrency check)
   */
  private doTriggerWorkflow(template: SavedCustomMissionsDisplayData): void {
    const id = template.id;

    // Helper to convert '-' display placeholder to empty string
    const normalizeValue = (value: string): string => value === '-' ? '' : value;

    // Parse robot models and IDs from comma-separated strings (handle '-' placeholder)
    const robotModelsStr = normalizeValue(template.robotModels);
    const robotModels = robotModelsStr
      ? robotModelsStr.split(',').map(s => s.trim()).filter(s => s)
      : [];

    const robotIdsStr = normalizeValue(template.robotIds);
    const robotIds = robotIdsStr
      ? robotIdsStr.split(',').map(s => s.trim()).filter(s => s)
      : [];

    const missionCode = this.generateMissionCode();
    const requestId = this.generateRequestId();

    // Parse mission steps to include in request (for simulator to know about MANUAL waypoints)
    const missionSteps = this.parseMissionSteps(template);

    // Build the mission request JSON that will be stored in the queue
    const missionRequestJson = JSON.stringify({
      orgId: normalizeValue(template.orgId) || 'UNIVERSAL',
      requestId: requestId,
      missionCode: missionCode,
      missionType: template.missionType || 'RACK_MOVE',
      viewBoardType: normalizeValue(template.viewBoardType),
      robotModels: robotModels,
      robotIds: robotIds,
      robotType: template.robotType || 'LIFT',
      priority: this.convertToQueuePriority(template.priority),
      containerModelCode: normalizeValue(template.containerModelCode),
      containerCode: normalizeValue(template.containerCode),
      templateCode: normalizeValue(template.templateCode),
      lockRobotAfterFinish: template.lockRobotAfterFinish || false,
      unlockRobotId: normalizeValue(template.unlockRobotId),
      unlockMissionCode: normalizeValue(template.unlockMissionCode),
      idleNode: normalizeValue(template.idleNode),
      // Include mission steps so simulator knows about MANUAL waypoints
      missionData: missionSteps
    });

    // Create queue request
    const queueRequest: AddToQueueRequest = {
      missionCode: missionCode,
      requestId: requestId,
      savedMissionId: template.id,
      missionName: template.missionName,
      missionRequestJson: missionRequestJson,
      priority: this.convertToQueuePriority(template.priority),
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
          // missionSteps already parsed above for missionRequestJson
          this.workflowJobs.set(id, {
            missionCode: missionCode,
            requestId: requestId,
            workflowName: template.missionName,
            savedMissionId: template.id,
            queueId: queueItem.id,
            queueStatus: queueItem.status, // Already a string from backend
            queuePosition: queueItem.queuePosition,
            assignedRobotId: queueItem.assignedRobotId || undefined,
            missionSteps: missionSteps,
            currentStepIndex: 0,
            isWaitingForManualConfirm: false,
            confirmedManualPositions: new Set()
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

          // Check if it's a concurrency violation (HTTP 409 Conflict)
          if (error.status === 409) {
            const errorMsg = error.error?.msg || 'Active missions must complete first';
            this.blockedTemplates.set(id, errorMsg);
            this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
          } else {
            this.snackBar.open('Failed to add mission to queue', 'Close', { duration: 3000 });
          }
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
                // Mission history is created by backend QueueProcessorService with correct UTC timestamps
                // Do NOT create duplicate records from frontend (causes timezone issues)
                this.stopJobPolling(missionCode);
              }
            } else if (!response.success) {
              // Handle API error response (success: false)
              this.handleJobQueryError(missionCode, response.message || 'Job query failed');
            }
          },
          error: (error) => {
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
            // Check if robot is at a manual waypoint
            this.checkManualWaypointStatus(id);
          }
        } else if (!response.success) {
          // Handle API error response (success: false)
          this.handleRobotQueryError(robotId, response.message || 'Robot query failed');
        }
      },
      error: (error) => {
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
              this.startJobPolling(templateId, job.missionCode);
            }

            // If terminal state reached (statusCode 3/4/5), stop queue polling
            if (queueItem.statusCode === 3 || queueItem.statusCode === 4 || queueItem.statusCode === 5) {
              // Completed, Failed, or Cancelled
              this.stopQueuePolling(queueId);
              // Clear concurrency block for this template
              if (job.savedMissionId) {
                this.blockedTemplates.delete(job.savedMissionId);
              }
            }
          },
          error: (error) => {
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
   * Check if workflow is being triggered
   */
  isTriggering(id: number): boolean {
    return this.triggeringMissions.has(id);
  }

  /**
   * Check if template is blocked due to concurrency mode
   */
  isTemplateBlocked(id: number): boolean {
    return this.blockedTemplates.has(id);
  }

  /**
   * Get block reason for template
   */
  getBlockReason(id: number): string {
    return this.blockedTemplates.get(id) || '';
  }

  /**
   * Refresh all data
   */
  refresh(): void {
    this.loadTemplatesAndCategories();
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
  refreshWorkflowStatus(template: SavedCustomMissionsDisplayData): void {
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
  viewWorkflowDetails(template: SavedCustomMissionsDisplayData): void {
    this.snackBar.open(`View details for: ${template.missionName}`, 'Close', { duration: 2000 });
    // TODO: Open dialog or navigate to details page
  }

  /**
   * Cancel mission - opens dialog to select cancel mode
   * Requires admin authorization for non-SuperAdmin users
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

    // Check if user is SuperAdmin - proceed directly if true
    if (this.authService.isSuperAdmin()) {
      this.openCancelMissionDialog(id, job);
      return;
    }

    // Non-admin user - show admin authorization dialog first
    const authDialogRef = this.dialog.open(AdminAuthorizationDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: 'Admin Authorization Required',
        message: 'Cancelling a mission requires admin authorization. Please enter admin credentials to proceed.',
        actionLabel: 'Authorize & Cancel'
      } as AdminAuthorizationDialogData
    });

    authDialogRef.afterClosed().subscribe((authResult: AdminAuthorizationDialogResult | undefined) => {
      if (authResult?.authorized) {
        // Admin authorization successful - proceed with cancel dialog
        this.openCancelMissionDialog(id, job);
      }
      // If not authorized, do nothing (user cancelled or verification failed)
    });
  }

  /**
   * Opens the cancel mission dialog after authorization check
   */
  private openCancelMissionDialog(id: number, job: any): void {
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
        // Mission is in queue - use queue cancel API with selected cancel mode
        // Backend will call external AMR cancel if status = Assigned
        this.missionQueueService.cancel(job.queueId, result.cancelMode, result.reason)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.cancellingMissions.delete(id);
              // Stop all polling
              this.stopQueuePolling(job.queueId!);
              this.stopJobPolling(job.missionCode);
              // Clear concurrency block
              if (job.savedMissionId) {
                this.blockedTemplates.delete(job.savedMissionId);
              }
              // Remove from tracking
              this.workflowJobs.delete(id);
              this.snackBar.open(`Mission cancelled successfully (${result.cancelMode})`, 'Close', { duration: 3000 });
            },
            error: (error) => {
              this.cancellingMissions.delete(id);
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

  /**
   * Convert template priority (string or number) to queue priority number
   * Queue priority: 1=Critical (highest), 2=High, 3=Normal, 4=Low, 5=Lowest
   */
  private convertToQueuePriority(priority: string | number | null | undefined): number {
    if (priority == null) return 3; // Default to Normal

    // If it's already a number in valid range, use it directly
    const numPriority = typeof priority === 'number' ? priority : parseInt(priority);
    if (!isNaN(numPriority) && numPriority >= 1 && numPriority <= 5) {
      return numPriority;
    }

    // Convert string priority to queue priority
    const priorityStr = String(priority).toUpperCase();
    switch (priorityStr) {
      case 'CRITICAL':
        return 1;
      case 'HIGH':
        return 2;
      case 'MEDIUM':
      case 'NORMAL':
        return 3;
      case 'LOW':
        return 4;
      case 'LOWEST':
        return 5;
      default:
        return 3; // Default to Normal
    }
  }

  // =========================================================================
  // MANUAL WAYPOINT CONFIRMATION METHODS
  // =========================================================================

  /**
   * Parse mission steps from saved template
   */
  private parseMissionSteps(template: SavedCustomMissionsDisplayData): MissionStepData[] {
    try {
      return JSON.parse(template.missionStepsJson || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Check if robot is at a manual waypoint using frontend-based position matching
   * Compares robot's nodeCode with mission step positions
   */
  private checkManualWaypointStatus(id: number): void {
    const job = this.workflowJobs.get(id);
    if (!job || !job.robotData || !job.missionSteps) {
      return;
    }

    const robotNodeCode = job.robotData.nodeCode;
    if (!robotNodeCode) {
      return;
    }

    // Find MANUAL step that robot is currently at
    for (const step of job.missionSteps) {
      if (step.passStrategy?.toUpperCase() !== 'MANUAL') {
        continue;
      }

      // Skip already confirmed positions
      if (job.confirmedManualPositions?.has(step.position)) {
        continue;
      }

      // Check if robot is at this MANUAL step's position
      const stepType = this.determineStepType(step.position);

      const isAtPosition = this.isRobotAtPosition(robotNodeCode, step.position, stepType);

      if (isAtPosition) {
        job.isWaitingForManualConfirm = true;
        job.currentManualStep = step;
        return;
      }
    }

    // No matching MANUAL waypoint found
    job.isWaitingForManualConfirm = false;
    job.currentManualStep = undefined;
  }

  /**
   * Determine if position is NODE_AREA (zone) or NODE_POINT (specific node)
   */
  private determineStepType(position: string): 'NODE_AREA' | 'NODE_POINT' {
    // Check if position matches a known zone code
    const isZone = this.mapZonesWithNodes.some(
      z => z.zoneCode.toLowerCase() === position.toLowerCase()
    );
    return isZone ? 'NODE_AREA' : 'NODE_POINT';
  }

  /**
   * Check if robot's current nodeCode matches a step position
   * @param robotNodeCode - Full node code from RobotQuery (e.g., "Sim1-1-5")
   * @param stepPosition - Position from mission step (zone code or full node code)
   * @param stepType - "NODE_AREA" or "NODE_POINT"
   */
  private isRobotAtPosition(robotNodeCode: string, stepPosition: string, stepType: 'NODE_AREA' | 'NODE_POINT'): boolean {
    if (!robotNodeCode || !stepPosition) {
      return false;
    }

    // Extract just the nodeNumber from the robot's full node code (e.g., "Sim1-1-5" -> "5")
    const robotNodeNumber = this.extractLastNodeNumber(robotNodeCode);

    if (stepType === 'NODE_AREA') {
      // Find the MapZone by zoneCode
      const zone = this.mapZonesWithNodes.find(
        z => z.zoneCode.toLowerCase() === stepPosition.toLowerCase()
      );
      if (!zone || !zone.nodes) {
        return false;
      }

      // Parse comma-separated node numbers (or JSON array)
      const nodeNumbers = this.parseZoneNodes(zone.nodes);

      return nodeNumbers.includes(robotNodeNumber);
    }
    else if (stepType === 'NODE_POINT') {
      // Step position is full node code: "Sim1-1-16"
      // Extract the nodeNumber (last part after splitting by '-')
      const stepNodeNumber = this.extractLastNodeNumber(stepPosition);

      return robotNodeNumber === stepNodeNumber;
    }

    return false;
  }

  /**
   * Confirm manual waypoint to continue mission
   */
  confirmManualWaypoint(id: number): void {
    const job = this.workflowJobs.get(id);
    if (!job || !job.isWaitingForManualConfirm || !job.currentManualStep) return;

    // Get position from currentManualStep (set by checkManualWaypointStatus)
    const currentPosition = job.currentManualStep.position;
    if (!currentPosition) {
      return;
    }

    // Always generate a NEW requestId for each operation feedback call
    const request: OperationFeedbackRequest = {
      requestId: this.generateRequestId(),
      missionCode: job.missionCode,
      position: currentPosition
    };

    this.missionsService.sendOperationFeedback(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Mark position as confirmed
            if (!job.confirmedManualPositions) {
              job.confirmedManualPositions = new Set();
            }
            job.confirmedManualPositions.add(currentPosition);
            job.isWaitingForManualConfirm = false;
            job.currentManualStep = undefined;

            this.snackBar.open('Manual waypoint confirmed - robot will continue', 'Close', { duration: 3000 });
          } else {
            this.snackBar.open(response.message || 'Failed to confirm manual waypoint', 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to confirm manual waypoint', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Check if job is waiting for manual confirmation (for template)
   */
  isWaitingForManualConfirm(id: number): boolean {
    const job = this.workflowJobs.get(id);
    return job?.isWaitingForManualConfirm || false;
  }

  /**
   * Get current manual waypoint position for display
   */
  getManualWaypointPosition(id: number): string {
    const job = this.workflowJobs.get(id);
    return job?.currentManualStep?.position || '';
  }
}
