/**
 * Live Jobs Dashboard Models
 *
 * TypeScript interfaces for Live Jobs monitoring dashboard
 * displaying real-time job status from the AMR system.
 */

import { JobData } from './missions.models';

/**
 * Job status codes from AMR system
 */
export enum JobStatusCode {
  Created = 10,
  Executing = 20,
  Waiting = 25,
  Cancelling = 28,
  Complete = 30,
  Cancelled = 31,
  ManualComplete = 35,
  Warning = 50,
  StartupError = 60
}

/**
 * Status configuration for display
 */
export interface StatusConfig {
  code: number;
  text: string;
  colorClass: string;
  icon: string;
  isActive: boolean;
}

/**
 * Status configuration map
 */
export const JOB_STATUS_CONFIG: Record<number, StatusConfig> = {
  [JobStatusCode.Created]: {
    code: JobStatusCode.Created,
    text: 'Created',
    colorClass: 'status-created',
    icon: 'add_circle',
    isActive: true
  },
  [JobStatusCode.Executing]: {
    code: JobStatusCode.Executing,
    text: 'Executing',
    colorClass: 'status-executing',
    icon: 'play_circle',
    isActive: true
  },
  [JobStatusCode.Waiting]: {
    code: JobStatusCode.Waiting,
    text: 'Waiting',
    colorClass: 'status-waiting',
    icon: 'pause_circle',
    isActive: true
  },
  [JobStatusCode.Cancelling]: {
    code: JobStatusCode.Cancelling,
    text: 'Cancelling',
    colorClass: 'status-cancelling',
    icon: 'cancel',
    isActive: true
  },
  [JobStatusCode.Complete]: {
    code: JobStatusCode.Complete,
    text: 'Complete',
    colorClass: 'status-complete',
    icon: 'check_circle',
    isActive: false
  },
  [JobStatusCode.Cancelled]: {
    code: JobStatusCode.Cancelled,
    text: 'Cancelled',
    colorClass: 'status-cancelled',
    icon: 'cancel',
    isActive: false
  },
  [JobStatusCode.ManualComplete]: {
    code: JobStatusCode.ManualComplete,
    text: 'Manual Complete',
    colorClass: 'status-complete',
    icon: 'check_circle',
    isActive: false
  },
  [JobStatusCode.Warning]: {
    code: JobStatusCode.Warning,
    text: 'Warning',
    colorClass: 'status-warning',
    icon: 'warning',
    isActive: true
  },
  [JobStatusCode.StartupError]: {
    code: JobStatusCode.StartupError,
    text: 'Startup Error',
    colorClass: 'status-error',
    icon: 'error',
    isActive: true  // Keep errors visible in live view for operator attention
  }
};

/**
 * Filter options for status dropdown (all statuses)
 */
export const STATUS_FILTER_OPTIONS = [
  { value: null, label: 'All Statuses' },
  { value: JobStatusCode.Created, label: 'Created' },
  { value: JobStatusCode.Executing, label: 'Executing' },
  { value: JobStatusCode.Waiting, label: 'Waiting' },
  { value: JobStatusCode.Cancelling, label: 'Cancelling' },
  { value: JobStatusCode.Complete, label: 'Complete' },
  { value: JobStatusCode.Cancelled, label: 'Cancelled' },
  { value: JobStatusCode.Warning, label: 'Warning' },
  { value: JobStatusCode.StartupError, label: 'Error' }
];

/**
 * Filter options for live jobs (active statuses only)
 */
export const LIVE_STATUS_FILTER_OPTIONS = [
  { value: null, label: 'All Statuses' },
  { value: JobStatusCode.Created, label: 'Created' },
  { value: JobStatusCode.Executing, label: 'Executing' },
  { value: JobStatusCode.Waiting, label: 'Waiting' },
  { value: JobStatusCode.Cancelling, label: 'Cancelling' },
  { value: JobStatusCode.Warning, label: 'Warning' },
  { value: JobStatusCode.StartupError, label: 'Error' }
];

/**
 * Live Job Display Data - extends JobData with formatted display fields
 */
export interface LiveJobDisplayData extends JobData {
  // Display fields
  statusText: string;
  statusColorClass: string;
  statusIcon: string;
  isActiveJob: boolean;
  hasWarning: boolean;

  // Formatted fields
  createdDateDisplay: string;
  createdDateRelative: string;
  durationDisplay: string;
  progressPercent: number;
  locationDisplay: string;
}

/**
 * Statistics for the dashboard summary
 */
export interface LiveJobStatistics {
  total: number;
  created: number;
  executing: number;
  waiting: number;
  cancelling: number;
  complete: number;
  cancelled: number;
  warning: number;
  error: number;
  activeJobs: number;
}

/**
 * Filter state for the dashboard
 */
export interface LiveJobFilters {
  status: number | null;
  robotId: string | null;
  workflowName: string | null;
  mapCode: string | null;
}

/**
 * Get status configuration for a status code
 */
export function getStatusConfig(status: number | string): StatusConfig {
  const statusCode = typeof status === 'string' ? parseInt(status, 10) : status;
  return JOB_STATUS_CONFIG[statusCode] || {
    code: statusCode,
    text: `Unknown (${statusCode})`,
    colorClass: 'status-unknown',
    icon: 'help',
    isActive: false
  };
}

/**
 * Parse date string from AMR system.
 * The AMR system returns dates in format "yyyy-MM-dd HH:mm:ss" in UTC time
 * but without the 'Z' suffix. We need to append 'Z' to correctly interpret as UTC.
 */
function parseAmrDate(dateString: string): Date {
  // If the date string already has timezone info (ISO format with Z or +/-), use it directly
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
    return new Date(dateString);
  }

  // For "yyyy-MM-dd HH:mm:ss" format without timezone, the server sends UTC time
  // Replace space with 'T' and append 'Z' to indicate UTC
  const isoString = dateString.replace(' ', 'T') + 'Z';
  return new Date(isoString);
}

/**
 * Format date string for display
 */
export function formatJobDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';

  try {
    const date = parseAmrDate(dateString);
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
 * Format relative time for display
 */
export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'N/A';

  try {
    const date = parseAmrDate(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatJobDate(dateString);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number | undefined): string {
  if (seconds == null || seconds < 0) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format location display from node codes
 */
export function formatLocation(job: JobData): string {
  const parts: string[] = [];

  if (job.beginCellCode) {
    parts.push(job.beginCellCode);
  }

  if (job.targetCellCode && job.targetCellCode !== job.beginCellCode) {
    if (parts.length > 0) {
      parts.push('→');
    }
    parts.push(job.targetCellCode);
  }

  if (job.currentLocation && !parts.includes(job.currentLocation)) {
    if (parts.length > 0) {
      return `${parts.join(' ')} (at ${job.currentLocation})`;
    }
    return job.currentLocation;
  }

  return parts.length > 0 ? parts.join(' ') : 'N/A';
}

/**
 * Transform JobData to LiveJobDisplayData
 */
export function transformJobForDisplay(job: JobData): LiveJobDisplayData {
  const statusConfig = getStatusConfig(job.status);

  return {
    ...job,
    statusText: statusConfig.text,
    statusColorClass: statusConfig.colorClass,
    statusIcon: statusConfig.icon,
    isActiveJob: statusConfig.isActive,
    hasWarning: job.warnFlag === 1,
    createdDateDisplay: formatJobDate(job.createTime),
    createdDateRelative: formatRelativeTime(job.createTime),
    durationDisplay: formatDuration(job.spendTime),
    progressPercent: job.progress ?? 0,
    locationDisplay: formatLocation(job)
  };
}

/**
 * Transform array of jobs for display
 */
export function transformJobsForDisplay(jobs: JobData[]): LiveJobDisplayData[] {
  return jobs.map(transformJobForDisplay);
}

/**
 * Calculate statistics from jobs array
 */
export function calculateJobStatistics(jobs: LiveJobDisplayData[]): LiveJobStatistics {
  const stats: LiveJobStatistics = {
    total: jobs.length,
    created: 0,
    executing: 0,
    waiting: 0,
    cancelling: 0,
    complete: 0,
    cancelled: 0,
    warning: 0,
    error: 0,
    activeJobs: 0
  };

  jobs.forEach(job => {
    const statusCode = typeof job.status === 'string' ? parseInt(job.status, 10) : job.status;

    switch (statusCode) {
      case JobStatusCode.Created:
        stats.created++;
        break;
      case JobStatusCode.Executing:
        stats.executing++;
        break;
      case JobStatusCode.Waiting:
        stats.waiting++;
        break;
      case JobStatusCode.Cancelling:
        stats.cancelling++;
        break;
      case JobStatusCode.Complete:
      case JobStatusCode.ManualComplete:
        stats.complete++;
        break;
      case JobStatusCode.Cancelled:
        stats.cancelled++;
        break;
      case JobStatusCode.Warning:
        stats.warning++;
        break;
      case JobStatusCode.StartupError:
        stats.error++;
        break;
    }

    if (job.isActiveJob) {
      stats.activeJobs++;
    }
  });

  return stats;
}

/**
 * Get unique values for filter dropdowns
 */
export function getUniqueFilterValues(jobs: LiveJobDisplayData[]): {
  robots: string[];
  workflows: string[];
  maps: string[];
} {
  const robots = new Set<string>();
  const workflows = new Set<string>();
  const maps = new Set<string>();

  jobs.forEach(job => {
    if (job.robotId) robots.add(job.robotId);
    if (job.workflowName) workflows.add(job.workflowName);
    if (job.mapCode) maps.add(job.mapCode);
  });

  return {
    robots: Array.from(robots).sort(),
    workflows: Array.from(workflows).sort(),
    maps: Array.from(maps).sort()
  };
}
