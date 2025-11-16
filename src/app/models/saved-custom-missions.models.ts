export interface SavedCustomMissionDto {
  id: number;
  missionName: string;
  description: string | null;
  missionType: string;
  robotType: string;
  priority: string;
  robotModels: string[];
  robotIds: string[];
  containerModelCode: string | null;
  containerCode: string | null;
  idleNode: string | null;
  missionStepsJson: string;
  createdBy: string;
  createdUtc: string;
  updatedUtc: string | null;
  scheduleSummary: SavedMissionScheduleSummaryDto;
}

export interface SavedMissionScheduleSummaryDto {
  totalSchedules: number;
  activeSchedules: number;
  nextRunUtc: string | null;
  lastStatus: string | null;
  lastRunUtc: string | null;
}

export interface SavedCustomMissionCreateRequest {
  missionName: string;
  description: string | null;
  missionType: string;
  robotType: string;
  priority: string;
  robotModels: string[];
  robotIds: string[];
  containerModelCode: string | null;
  containerCode: string | null;
  idleNode: string | null;
  missionStepsJson: string;
}

export interface SavedCustomMissionUpdateRequest {
  missionName: string;
  description: string | null;
  missionType: string;
  robotType: string;
  priority: string;
  robotModels: string[];
  robotIds: string[];
  containerModelCode: string | null;
  containerCode: string | null;
  idleNode: string | null;
  missionStepsJson: string;
}

export interface TriggerMissionResponse {
  missionCode: string;
  requestId: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  msg: string;
  data: T;
}

// Workflow Template Models
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
  priority: number;
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

// Display models for frontend
export interface SavedCustomMissionsDisplayData {
  id: number;
  missionName: string;
  description: string;
  missionType: string;
  robotType: string;
  priority: string;
  robotModels: string;
  robotIds: string;
  containerModelCode: string;
  containerCode: string;
  idleNode: string;
  createdBy: string;
  createdUtc: string;
  updatedUtc: string;
  activeSchedules: number;
  totalSchedules: string;
  nextRunUtc: string;
  lastStatus: string;
  lastRunUtc: string;
  missionStepsJson: string;
}

// Enums for mission data
export enum MissionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum MissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum MissionTriggerSource {
  MANUAL = 'MANUAL',
  SCHEDULE = 'SCHEDULE',
  SYSTEM = 'SYSTEM'
}

// Utility functions for data transformation
export class SavedCustomMissionsUtils {
  static transformToDisplay(dto: SavedCustomMissionDto): SavedCustomMissionsDisplayData {
    return {
      id: dto.id,
      missionName: dto.missionName,
      description: dto.description || '-',
      missionType: dto.missionType,
      robotType: dto.robotType,
      priority: dto.priority,
      robotModels: dto.robotModels.join(', ') || '-',
      robotIds: dto.robotIds.join(', ') || '-',
      containerModelCode: dto.containerModelCode || '-',
      containerCode: dto.containerCode || '-',
      idleNode: dto.idleNode || '-',
      createdBy: dto.createdBy,
      createdUtc: formatDateTime(dto.createdUtc),
      updatedUtc: dto.updatedUtc ? formatDateTime(dto.updatedUtc) : '-',
      activeSchedules: dto.scheduleSummary.activeSchedules,
      totalSchedules: `${dto.scheduleSummary.activeSchedules}/${dto.scheduleSummary.totalSchedules}`,
      nextRunUtc: dto.scheduleSummary.nextRunUtc ? formatDateTime(dto.scheduleSummary.nextRunUtc) : '-',
      lastStatus: dto.scheduleSummary.lastStatus || '-',
      lastRunUtc: dto.scheduleSummary.lastRunUtc ? formatDateTime(dto.scheduleSummary.lastRunUtc) : '-',
      missionStepsJson: dto.missionStepsJson
    };
  }

  static getPriorityColor(priority: string): string {
    switch (priority.toUpperCase()) {
      case MissionPriority.CRITICAL:
        return 'warn';
      case MissionPriority.HIGH:
        return 'accent';
      case MissionPriority.MEDIUM:
        return 'primary';
      case MissionPriority.LOW:
        return '';
      default:
        return '';
    }
  }

  static getStatusColor(status: string): string {
    switch (status?.toUpperCase()) {
      case MissionStatus.RUNNING:
        return 'primary';
      case MissionStatus.COMPLETED:
        return 'accent';
      case MissionStatus.FAILED:
        return 'warn';
      case MissionStatus.CANCELLED:
        return '';
      case MissionStatus.PENDING:
        return '';
      default:
        return '';
    }
  }

  static isValidMissionStepsJson(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
}

// Date formatting utility
function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}