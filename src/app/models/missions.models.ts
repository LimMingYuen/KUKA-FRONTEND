// =============================================================================
// MISSION SUBMISSION MODELS
// =============================================================================

export interface MissionStepData {
  sequence: number;
  position: string;
  type: string;
  putDown: boolean;
  passStrategy: string;
  waitingMillis: number;
}

export interface MissionTemplate {
  orgId: string;
  missionType: string;
  viewBoardType: string;
  robotModels: string[];
  robotIds: string[];
  robotType: string;
  priority: number; // Priority range: 0-100 (higher = more urgent)
  containerModelCode: string | null;
  containerCode: string | null;
  templateCode: string | null;
  lockRobotAfterFinish: boolean;
  unlockRobotId: string | null;
  unlockMissionCode: string | null;
  idleNode: string | null;
  missionData: MissionStepData[];
}

export interface SaveMissionAsTemplateRequest {
  missionName: string;
  description: string;
  missionTemplate: MissionTemplate;
}

export interface SaveMissionAsTemplateResponse {
  success: boolean;
  message: string;
  savedMissionId?: number;
  missionName?: string;
}

export interface SubmitMissionRequest {
  missionCode: string;
  templateCode?: string;
  priority: number;
  orgId?: string;
  viewBoardType?: string;
  robotModels?: string[];
  robotIds?: string[];
  robotType?: string;
  containerModelCode?: string;
  containerCode?: string;
  idleNode?: string;
  lockRobotAfterFinish?: boolean;
  unlockRobotId?: string;
  unlockMissionCode?: string;
  requestId?: string;
  missionData?: MissionStepData[];
}

export interface SubmitMissionResponseData {
  queueItemCodes: string[];
  queueItemCount: number;
  isMultiMap: boolean;
  primaryMapCode: string;
}

export interface SubmitMissionResponse {
  success: boolean;
  code: string;
  message: string;
  requestId?: string;
  data?: SubmitMissionResponseData;
}

// =============================================================================
// MISSION CANCEL MODELS
// =============================================================================

export interface MissionCancelRequest {
  missionCode: string;
  reason?: string;
}

export interface MissionCancelResponse {
  success: boolean;
  code: string;
  message: string;
}

// =============================================================================
// JOB QUERY MODELS
// =============================================================================

export interface JobQueryRequest {
  missionCodes?: string[];
  queueItemIds?: number[];
  robotId?: string;
  status?: string;
  limit?: number;
}

export interface JobData {
  jobCode: string;              // Job code (same as mission code)
  missionCode?: string;         // For backward compatibility
  workflowId?: number;          // Workflow id
  containerCode?: string;       // Container code
  robotId?: string;             // Robot id
  status: number | string;      // Job status (0=Created, 2=Executing, 3=Waiting, 4=Cancelling, 5=Complete, 31=Cancelled, 32=Manual Complete, 50=Warning, 99=Startup Error)
  workflowName?: string;        // Name of the workflow configuration
  workflowCode?: string;        // Workflow code of the workflow configuration
  workflowPriority?: number;    // Workflow priority (0-100)
  mapCode?: string;             // Map code
  targetCellCode?: string;      // Target node code of the running task
  beginCellCode?: string;       // Begin node code of the running task
  targetCellCodeForeign?: string; // Foreign code of target node
  beginCellCodeForeign?: string;  // Foreign code of begin node
  finalNodeCode?: string;       // End node of the workflow
  warnFlag?: number;            // Warn flag (0=Normal, 1=Warning)
  warnCode?: string;            // Warn code
  completeTime?: string;        // Workflow complete time (yyyy-MM-dd HH:mm:ss)
  spendTime?: number;           // Workflow spend time (seconds)
  createUsername?: string;      // Operator
  createTime?: string;          // Workflow create time (yyyy-MM-dd HH:mm:ss)
  source?: string;              // Source: INTERFACE, PDA, DEVICE, MLS, SELF, EVENT
  materialsInfo?: string;       // Materials info
  progress?: number;            // Progress percentage (for compatibility)
  currentLocation?: string;     // Current location (for compatibility)
  updatedAt?: string;           // Updated at timestamp (for compatibility)
}

export interface JobQueryResponse {
  success: boolean;
  code: string;
  message: string;
  data?: JobData[];
}

// =============================================================================
// OPERATION FEEDBACK MODELS
// =============================================================================

export interface OperationFeedbackRequest {
  requestId: string;
  missionCode: string;
  position: string;
  operationType?: string;
  status?: string;
  message?: string;
  data?: any;
}

export interface OperationFeedbackResponse {
  success: boolean;
  code: string;
  message: string;
}

// =============================================================================
// ROBOT QUERY MODELS
// =============================================================================

export interface RobotQueryRequest {
  robotId?: string;
  robotType?: string;
  mapCode?: string;
  floorNumber?: number;
  includeCurrentMission?: boolean;
}

export interface RobotData {
  robotId: string;
  robotName?: string;
  robotType?: string;
  status: string;
  batteryLevel?: number;
  currentLocation?: string;
  currentMission?: {
    missionCode: string;
    progress: number;
  };
  lastUpdated?: string;
}

export interface RobotQueryResponse {
  success: boolean;
  code: string;
  message: string;
  data?: RobotData[];
}

// =============================================================================
// QUEUE MONITORING MODELS
// =============================================================================

export interface QueueItemStatusDto {
  queueItemId: number;
  queueItemCode: string;
  missionCode: string;
  status: string;
  priority: number;
  primaryMapCode: string;
  assignedRobotId?: string;
  enqueuedUtc: string;
  startedUtc?: string;
  completedUtc?: string;
  cancelledUtc?: string;
  errorMessage?: string;
  retryCount: number;
  isOpportunisticJob: boolean;
  hasNextSegment: boolean;
}

export interface MissionQueueStatusResponse {
  missionCode: string;
  totalSegments: number;
  queueItems: QueueItemStatusDto[];
  overallStatus: string;
}

export interface MapCodeQueueResponse {
  mapCode: string;
  queueItems: QueueItemStatusDto[];
  pendingCount: number;
  processingCount: number;
  completedCount: number;
}

export interface MapCodeStatistics {
  mapCode: string;
  pendingCount: number;
  readyToAssignCount: number;
  assignedCount: number;
  executingCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  totalCount: number;
}

export interface QueueStatisticsResponse {
  mapCodeStatistics: MapCodeStatistics[];
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  generatedAt: string;
}

export interface RobotCurrentJobResponse {
  robotId: string;
  hasActiveJob: boolean;
  currentJob?: QueueItemStatusDto;
}

export interface CancelQueueItemResponse {
  success: boolean;
  message: string;
  queueItemId: number;
  cancelledUtc?: string;
}

// =============================================================================
// MISSION QUEUE CONTROLLER MODELS
// =============================================================================

export interface MissionQueueItem {
  id: number;
  queueItemCode: string;
  missionCode: string;
  status: MissionQueueStatus;
  priority: number;
  primaryMapCode: string;
  assignedRobotId?: string;
  enqueuedUtc: string;
  startedUtc?: string;
  completedUtc?: string;
  cancelledUtc?: string;
  errorMessage?: string;
  retryCount: number;
  isOpportunisticJob: boolean;
  nextQueueItemId?: number;
}

export interface CancelJobRequest {
  reason?: string;
}

export interface UpdateStatusRequest {
  status: MissionQueueStatus;
}

// =============================================================================
// ENUMS
// =============================================================================

export enum MissionQueueStatus {
  Pending = 'Pending',
  ReadyToAssign = 'ReadyToAssign',
  Assigned = 'Assigned',
  SubmittedToAmr = 'SubmittedToAmr',
  Executing = 'Executing',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled'
}

export enum MissionPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum MissionTriggerSource {
  Direct = 'Direct',
  Scheduled = 'Scheduled',
  Opportunistic = 'Opportunistic'
}

// =============================================================================
// API RESPONSE WRAPPER
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  code?: string;
  msg?: string;
  message?: string;
  data?: T;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export class MissionsUtils {
  static getPriorityLabel(priority: number): string {
    switch (priority) {
      case MissionPriority.LOW:
        return 'Low';
      case MissionPriority.MEDIUM:
        return 'Medium';
      case MissionPriority.HIGH:
        return 'High';
      case MissionPriority.CRITICAL:
        return 'Critical';
      default:
        return 'Medium';
    }
  }

  static getPriorityColor(priority: number): string {
    switch (priority) {
      case MissionPriority.CRITICAL:
        return 'warn';
      case MissionPriority.HIGH:
        return 'accent';
      case MissionPriority.MEDIUM:
        return 'primary';
      case MissionPriority.LOW:
        return '';
      default:
        return 'primary';
    }
  }

  static getStatusColor(status: string): string {
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
    if (statusUpper?.includes('CANCELLED')) {
      return '';
    }
    return '';
  }

  static formatDateTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Convert numeric job status to readable string
   */
  static getJobStatusText(status: number | string): string {
    if (typeof status === 'string') return status;

    switch (status) {
      case 0: return 'Created';
      case 2: return 'Executing';
      case 3: return 'Waiting';
      case 4: return 'Cancelling';
      case 5: return 'Complete';
      case 31: return 'Cancelled';
      case 32: return 'Manual Complete';
      case 50: return 'Warning';
      case 99: return 'Startup Error';
      default: return `Status ${status}`;
    }
  }

  /**
   * Get color for job status
   */
  static getJobStatusColor(status: number | string): string {
    const numStatus = typeof status === 'number' ? status : parseInt(status, 10);

    switch (numStatus) {
      case 0: // Created
        return '';
      case 2: // Executing
        return 'primary';
      case 3: // Waiting
        return 'accent';
      case 4: // Cancelling
        return 'warn';
      case 5: // Complete
      case 32: // Manual Complete
        return 'accent';
      case 31: // Cancelled
        return '';
      case 50: // Warning
        return 'warn';
      case 99: // Startup Error
        return 'warn';
      default:
        return '';
    }
  }

  /**
   * Check if job is in terminal state (completed, cancelled, or error)
   */
  static isJobTerminal(status: number | string): boolean {
    const numStatus = typeof status === 'number' ? status : parseInt(status, 10);
    return numStatus === 5 || numStatus === 31 || numStatus === 32 || numStatus === 99;
  }

  /**
   * Format spend time from seconds to readable format
   */
  static formatSpendTime(seconds: number | undefined): string {
    if (!seconds) return '-';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
