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
}

/**
 * Mission History Request DTO for adding new records
 */
export interface MissionHistoryRequest {
  missionCode: string;
  requestId: string;
  workflowName: string;
  status: string;
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
  workflowDisplay: string;
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
 * Format date string for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
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
 * Format relative time for display
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
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
 * Transform MissionHistorySummaryDto to MissionHistoryDisplayData
 */
export function transformMissionHistoryData(mission: MissionHistorySummaryDto): MissionHistoryDisplayData {
  return {
    ...mission,
    statusText: getStatusText(mission.status),
    createdDateDisplay: formatDate(mission.createdDate),
    createdDateRelative: formatRelativeTime(mission.createdDate),
    workflowDisplay: formatWorkflowName(mission.workflowName)
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