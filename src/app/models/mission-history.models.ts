/**
 * Mission History Models
 *
 * TypeScript interfaces for Mission History data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Mission History DTO from backend API response
 */
export interface MissionHistorySummaryDto {
  id: number;
  missionCode: string;
  requestId: string;
  workflowName: string;
  status: string;
  createdDate: string;
  processedDate?: string;
  submittedToAmrDate?: string;
  completedDate?: string;
  assignedRobotId?: string;
  durationMinutes?: number;  // Mission working time in minutes
  errorMessage?: string;     // Error message for failed missions
  createdBy?: string;        // Username of who triggered the job
}

/**
 * Mission History Request DTO for adding new records
 */
export interface MissionHistoryRequest {
  missionCode: string;
  requestId: string;
  workflowName: string;
  status: string;

  // Additional fields for analytics and duration tracking
  workflowId?: number;
  savedMissionId?: number;
  triggerSource?: string;
  missionType?: string;
  assignedRobotId?: string;
  processedDate?: string;
  submittedToAmrDate?: string;
  completedDate?: string;
  errorMessage?: string;
  createdBy?: string;
}

/**
 * Update Mission History Request DTO
 */
export interface UpdateMissionHistoryRequest {
  status?: string;
  assignedRobotId?: string;
  processedDate?: string;
  submittedToAmrDate?: string;
  completedDate?: string;
  errorMessage?: string;
}

/**
 * Mission History Count Response
 */
export interface MissionHistoryCountResponse {
  count: number;
  maxRecords: number;
}

/**
 * Display Data for Mission History Table
 * Extended with formatted display values
 */
export interface MissionHistoryDisplayData extends MissionHistorySummaryDto {
  // Formatted display values
  statusText: string;
  createdDateDisplay: string;
  createdDateRelative: string;
  completedDateDisplay: string;  // Formatted completion date/time
  workflowDisplay: string;
  durationDisplay: string;  // Formatted duration (e.g., "2m 30s", "1h 15m")
  robotDisplay: string;  // Formatted robot ID
  errorMessageDisplay: string;  // Error message for failed missions
  createdByDisplay: string;  // Who triggered the job
}

/**
 * Utility Functions for Mission History Data Processing
 */

/**
 * Mission Status enumeration
 */
export enum MissionStatus {
  Completed = 'Completed',
  Failed = 'Failed',
  InProgress = 'In Progress',
  Pending = 'Pending',
  Cancelled = 'Cancelled',
  Unknown = 'Unknown'
}

/**
 * Transform status string to display text
 */
export function getStatusText(status: string): string {
  switch (status) {
    case MissionStatus.Completed: return 'Completed';
    case MissionStatus.Failed: return 'Failed';
    case MissionStatus.InProgress: return 'In Progress';
    case MissionStatus.Pending: return 'Pending';
    case MissionStatus.Cancelled: return 'Cancelled';
    default: return status || 'Unknown';
  }
}

/**
 * Parse date string from backend/AMR system.
 * Handles both ISO format with 'Z' and "yyyy-MM-dd HH:mm:ss" format without timezone.
 * The AMR system returns dates in LOCAL time (Malaysia UTC+8), not UTC.
 */
function parseUtcDate(dateString: string): Date {
  // If already has timezone info, use directly
  if (dateString.includes('Z') || dateString.includes('+') || dateString.match(/T.*[+-]\d{2}:\d{2}$/)) {
    return new Date(dateString);
  }

  // For "yyyy-MM-dd HH:mm:ss" format, the AMR system sends LOCAL time
  // Replace space with 'T' but DON'T append 'Z' - let JavaScript interpret as local time
  const isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
  return new Date(isoString);
}

/**
 * Format date string for display (converts UTC to local time)
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    const date = parseUtcDate(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format relative time for display (converts UTC to local time)
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    const date = parseUtcDate(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatDate(dateString);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format workflow name for display
 */
export function formatWorkflowName(workflowName: string): string {
  if (!workflowName) return 'N/A';

  // Convert camelCase or PascalCase to readable format
  return workflowName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format duration in minutes to human-readable format
 */
export function formatDuration(durationMinutes: number | null | undefined): string {
  if (durationMinutes == null || durationMinutes < 0) return 'N/A';

  const totalSeconds = Math.round(durationMinutes * 60);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  if (minutes > 0) {
    if (seconds > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Format robot ID for display
 */
export function formatRobotId(robotId: string | null | undefined): string {
  if (!robotId) return 'N/A';
  return `Robot ${robotId}`;
}

/**
 * Transform MissionHistorySummaryDto to MissionHistoryDisplayData
 */
export function transformMissionHistoryData(mission: MissionHistorySummaryDto): MissionHistoryDisplayData {
  return {
    ...mission,
    statusText: getStatusText(mission.status),
    createdDateDisplay: formatDate(mission.createdDate),
    createdDateRelative: formatRelativeTime(mission.createdDate),
    completedDateDisplay: mission.completedDate ? formatDate(mission.completedDate) : '-',
    workflowDisplay: formatWorkflowName(mission.workflowName),
    durationDisplay: formatDuration(mission.durationMinutes),
    robotDisplay: formatRobotId(mission.assignedRobotId),
    errorMessageDisplay: mission.errorMessage || '',
    createdByDisplay: mission.createdBy || 'System'
  };
}

/**
 * Transform array of mission history for display
 */
export function transformMissionHistoryForDisplay(missions: MissionHistorySummaryDto[]): MissionHistoryDisplayData[] {
  return missions.map(mission => transformMissionHistoryData(mission));
}

/**
 * Get CSS class for status badge
 */
export function getStatusClass(status: string): string {
  switch (status) {
    case MissionStatus.Completed: return 'status-completed';
    case MissionStatus.Failed: return 'status-failed';
    case MissionStatus.InProgress: return 'status-in-progress';
    case MissionStatus.Pending: return 'status-pending';
    case MissionStatus.Cancelled: return 'status-cancelled';
    default: return 'status-unknown';
  }
}

/**
 * Get CSS class for workflow name
 */
export function getWorkflowClass(workflowName: string): string {
  if (!workflowName) return 'workflow-unknown';

  // Generate a consistent class based on workflow name
  const hash = workflowName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const classIndex = hash % 6;

  const workflowClasses = [
    'workflow-primary',
    'workflow-secondary',
    'workflow-tertiary',
    'workflow-quaternary',
    'workflow-quinary',
    'workflow-senary'
  ];

  return workflowClasses[classIndex];
}

/**
 * Validate mission code format
 */
export function isValidMissionCode(missionCode: string): boolean {
  if (!missionCode) return false;
  return missionCode.trim().length > 0;
}

/**
 * Validate request ID format
 */
export function isValidRequestId(requestId: string): boolean {
  if (!requestId) return false;
  return requestId.trim().length > 0;
}

/**
 * Get mission type from code
 */
export function getMissionType(missionCode: string): string {
  if (!missionCode) return 'Unknown';

  // Extract mission type from code (assuming format like "TYPE-123" or similar)
  const parts = missionCode.split('-');
  if (parts.length > 1) {
    return parts[0].toUpperCase();
  }

  return 'General';
}