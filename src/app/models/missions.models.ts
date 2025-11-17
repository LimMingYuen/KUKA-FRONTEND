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
  jobCode?: string;           // Specific mission/job code
  workflowId?: number;        // Workflow template ID
  workflowCode?: string;      // Workflow template code
  workflowName?: string;      // Workflow name
  robotId?: string;           // Assigned robot ID
  status?: string;            // Job status code
  containerCode?: string;     // Container code
  targetCellCode?: string;    // Destination cell
  createUsername?: string;    // User who created the mission
  sourceValue?: number;       // Source type (2=Interface, 3=PDA, 4=Device, 5=MLS, 6=Fleet, 7=Workflow event)
  maps?: string[];            // Filter by map codes
  limit?: number;             // Maximum results (default: 10)
}

export interface JobData {
  jobCode: string;              // Job code (same as mission code)
  missionCode?: string;         // For backward compatibility
  workflowId?: number;          // Workflow id
  containerCode?: string;       // Container code
  robotId?: string;             // Robot id
  status: number | string;      // Job status (10=Created, 20=Executing, 25=Waiting, 28=Cancelling, 30=Complete, 31=Cancelled, 35=Manual Complete, 50=Warning, 60=Startup Error)
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
  robotId?: string;       // Specific robot ID (empty = query all robots)
  robotType?: string;     // Robot type code (e.g., "KMP600I", "LIFT")
  mapCode?: string;       // Filter by map code
  floorNumber?: string;   // Filter by floor number (Note: mapCode and floorNumber must be passed together)
}

export interface RobotData {
  robotId: string;
  robotName?: string;
  robotType?: string;
  status: string;
  batteryLevel?: number;
  currentLocation?: string;
  nodeCode?: string;
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
// ENUMS
// =============================================================================

export enum MissionPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
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
   * Status codes from AMR System API (Section 3.1)
   */
  static getJobStatusText(status: number | string): string {
    if (typeof status === 'string') return status;

    switch (status) {
      case 10: return 'Created';
      case 20: return 'Executing';
      case 25: return 'Waiting';
      case 28: return 'Cancelling';
      case 30: return 'Complete';
      case 31: return 'Cancelled';
      case 35: return 'Manual Complete';
      case 50: return 'Warning';
      case 60: return 'Startup Error';
      default: return `Status ${status}`;
    }
  }

  /**
   * Get color for job status
   * Status codes from AMR System API (Section 3.1)
   */
  static getJobStatusColor(status: number | string): string {
    const numStatus = typeof status === 'number' ? status : parseInt(status, 10);

    switch (numStatus) {
      case 10: // Created
        return '';
      case 20: // Executing
        return 'primary';
      case 25: // Waiting
        return 'accent';
      case 28: // Cancelling
        return 'warn';
      case 30: // Complete
      case 35: // Manual Complete
        return 'accent';
      case 31: // Cancelled
        return '';
      case 50: // Warning
        return 'warn';
      case 60: // Startup Error
        return 'warn';
      default:
        return '';
    }
  }

  /**
   * Check if job is in terminal state (completed, cancelled, or error)
   * Terminal states: 30 (Complete), 31 (Cancelled), 35 (Manual Complete), 60 (Startup Error)
   */
  static isJobTerminal(status: number | string): boolean {
    const numStatus = typeof status === 'number' ? status : parseInt(status, 10);
    return numStatus === 30 || numStatus === 31 || numStatus === 35 || numStatus === 60;
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
