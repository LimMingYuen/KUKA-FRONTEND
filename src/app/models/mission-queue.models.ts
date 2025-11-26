/**
 * Mission Queue Models
 *
 * TypeScript interfaces for Mission Queue data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Mission Queue Status enumeration
 */
export enum MissionQueueStatus {
  Queued = 0,
  Processing = 1,
  Assigned = 2,
  Completed = 3,
  Failed = 4,
  Cancelled = 5
}

/**
 * Mission Queue DTO from backend API response
 */
export interface MissionQueueDto {
  id: number;
  missionCode: string;
  requestId: string;
  savedMissionId?: number;
  missionName: string;
  missionRequestJson: string;
  status: string;
  statusCode: number;
  priority: number;
  queuePosition: number;
  assignedRobotId?: string;
  createdUtc: string;
  processingStartedUtc?: string;
  assignedUtc?: string;
  completedUtc?: string;
  createdBy?: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  robotTypeFilter?: string;
  preferredRobotIds?: string;
  waitTimeSeconds: number;
}

/**
 * Add to Queue Request DTO
 */
export interface AddToQueueRequest {
  missionCode: string;
  requestId: string;
  savedMissionId?: number;
  missionName: string;
  missionRequestJson: string;
  priority?: number;
  robotTypeFilter?: string;
  preferredRobotIds?: string;
}

/**
 * Change Priority Request DTO
 */
export interface ChangePriorityRequest {
  priority: number;
}

/**
 * Mission Queue Statistics DTO
 */
export interface MissionQueueStatistics {
  totalQueued: number;
  totalProcessing: number;
  totalAssigned: number;
  totalCompleted: number;
  totalFailed: number;
  totalCancelled: number;
  averageWaitTimeSeconds: number;
  successRate: number;
}

/**
 * Display Data for Mission Queue Table
 * Extended with formatted display values
 */
export interface MissionQueueDisplayData extends MissionQueueDto {
  statusText: string;
  statusClass: string;
  priorityText: string;
  createdDateDisplay: string;
  createdDateRelative: string;
  waitTimeDisplay: string;
  robotDisplay: string;
  canCancel: boolean;
  canRetry: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/**
 * Status display configuration
 */
export const STATUS_CONFIG: Record<number, { text: string; class: string; icon: string }> = {
  [MissionQueueStatus.Queued]: { text: 'Queued', class: 'status-queued', icon: 'hourglass_empty' },
  [MissionQueueStatus.Processing]: { text: 'Processing', class: 'status-processing', icon: 'sync' },
  [MissionQueueStatus.Assigned]: { text: 'Assigned', class: 'status-assigned', icon: 'smart_toy' },
  [MissionQueueStatus.Completed]: { text: 'Completed', class: 'status-completed', icon: 'check_circle' },
  [MissionQueueStatus.Failed]: { text: 'Failed', class: 'status-failed', icon: 'error' },
  [MissionQueueStatus.Cancelled]: { text: 'Cancelled', class: 'status-cancelled', icon: 'cancel' }
};

/**
 * Priority display configuration
 */
export const PRIORITY_CONFIG: Record<number, { text: string; class: string }> = {
  1: { text: 'Critical', class: 'priority-critical' },
  2: { text: 'High', class: 'priority-high' },
  3: { text: 'Normal', class: 'priority-normal' },
  4: { text: 'Low', class: 'priority-low' },
  5: { text: 'Lowest', class: 'priority-lowest' }
};

/**
 * Get status text from status code
 */
export function getStatusText(statusCode: number): string {
  return STATUS_CONFIG[statusCode]?.text || 'Unknown';
}

/**
 * Get status CSS class from status code
 */
export function getStatusClass(statusCode: number): string {
  return STATUS_CONFIG[statusCode]?.class || 'status-unknown';
}

/**
 * Get status icon from status code
 */
export function getStatusIcon(statusCode: number): string {
  return STATUS_CONFIG[statusCode]?.icon || 'help';
}

/**
 * Get priority text from priority value
 */
export function getPriorityText(priority: number): string {
  return PRIORITY_CONFIG[priority]?.text || `Priority ${priority}`;
}

/**
 * Get priority CSS class from priority value
 */
export function getPriorityClass(priority: number): string {
  return PRIORITY_CONFIG[priority]?.class || 'priority-normal';
}

/**
 * Format date string for display (converts UTC to local time)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';

  try {
    // Ensure the string is treated as UTC by appending 'Z' if not present
    const utcDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(utcDate);
    return date.toLocaleString(undefined, {
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
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';

  try {
    // Ensure the string is treated as UTC by appending 'Z' if not present
    const utcDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(utcDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatDate(dateString);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format wait time in seconds to human-readable format
 */
export function formatWaitTime(waitTimeSeconds: number | null | undefined): string {
  if (waitTimeSeconds == null || waitTimeSeconds < 0) return 'N/A';

  const totalSeconds = Math.round(waitTimeSeconds);

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
  if (!robotId) return 'Unassigned';
  return `Robot ${robotId}`;
}

/**
 * Check if queue item can be cancelled
 * Allows cancellation for Queued, Processing, and Assigned statuses
 * Backend will call external AMR cancel API for Assigned missions
 */
export function canCancelItem(statusCode: number): boolean {
  return statusCode === MissionQueueStatus.Queued ||
         statusCode === MissionQueueStatus.Processing ||
         statusCode === MissionQueueStatus.Assigned;
}

/**
 * Check if queue item can be retried
 */
export function canRetryItem(statusCode: number, retryCount: number, maxRetries: number): boolean {
  return statusCode === MissionQueueStatus.Failed && retryCount < maxRetries;
}

/**
 * Check if queue item can be moved up
 */
export function canMoveUpItem(statusCode: number, queuePosition: number): boolean {
  return statusCode === MissionQueueStatus.Queued && queuePosition > 1;
}

/**
 * Check if queue item can be moved down (needs to check against total queued items)
 */
export function canMoveDownItem(statusCode: number): boolean {
  return statusCode === MissionQueueStatus.Queued;
}

/**
 * Transform MissionQueueDto to MissionQueueDisplayData
 */
export function transformQueueItem(item: MissionQueueDto): MissionQueueDisplayData {
  return {
    ...item,
    statusText: getStatusText(item.statusCode),
    statusClass: getStatusClass(item.statusCode),
    priorityText: getPriorityText(item.priority),
    createdDateDisplay: formatDate(item.createdUtc),
    createdDateRelative: formatRelativeTime(item.createdUtc),
    waitTimeDisplay: formatWaitTime(item.waitTimeSeconds),
    robotDisplay: formatRobotId(item.assignedRobotId),
    canCancel: canCancelItem(item.statusCode),
    canRetry: canRetryItem(item.statusCode, item.retryCount, item.maxRetries),
    canMoveUp: canMoveUpItem(item.statusCode, item.queuePosition),
    canMoveDown: canMoveDownItem(item.statusCode)
  };
}

/**
 * Transform array of queue items for display
 */
export function transformQueueItems(items: MissionQueueDto[]): MissionQueueDisplayData[] {
  return items.map(item => transformQueueItem(item));
}

/**
 * Format success rate for display
 */
export function formatSuccessRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Format average wait time for display
 */
export function formatAverageWaitTime(seconds: number): string {
  return formatWaitTime(seconds);
}
