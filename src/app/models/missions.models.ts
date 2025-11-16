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
  priority: number; // 1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL
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
  missionCode: string;
  status: string;
  robotId?: string;
  progress?: number;
  currentLocation?: string;
  updatedAt?: string;
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
}
