/**
 * Workflow schedule entity
 */
export interface WorkflowSchedule {
  id: number;
  savedMissionId: number;
  savedMissionName: string;
  scheduleName: string;
  description?: string;
  scheduleType: ScheduleType;
  oneTimeUtc?: string;
  intervalMinutes?: number;
  cronExpression?: string;
  isEnabled: boolean;
  nextRunUtc?: string;
  lastRunUtc?: string;
  lastRunStatus?: 'Success' | 'Failed';
  lastErrorMessage?: string;
  executionCount: number;
  maxExecutions?: number;
  createdBy: string;
  createdUtc: string;
  updatedUtc?: string;
}

/**
 * Schedule type enum
 */
export type ScheduleType = 'OneTime' | 'Interval' | 'Cron';

/**
 * Request to create a new workflow schedule
 */
export interface CreateScheduleRequest {
  scheduleName: string;
  description?: string;
  savedMissionId: number;
  scheduleType: ScheduleType;
  oneTimeUtc?: string;
  intervalMinutes?: number;
  cronExpression?: string;
  isEnabled: boolean;
  maxExecutions?: number;
}

/**
 * Request to update an existing workflow schedule
 */
export interface UpdateScheduleRequest {
  scheduleName?: string;
  description?: string;
  scheduleType?: ScheduleType;
  oneTimeUtc?: string;
  intervalMinutes?: number;
  cronExpression?: string;
  isEnabled?: boolean;
  maxExecutions?: number;
}

/**
 * Request to toggle schedule enabled state
 */
export interface ToggleScheduleRequest {
  isEnabled: boolean;
}

/**
 * Result of manually triggering a schedule
 */
export interface ScheduleTriggerResult {
  success: boolean;
  missionCode?: string;
  requestId?: string;
  errorMessage?: string;
}

/**
 * Interval options for the UI dropdown
 */
export const INTERVAL_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 2, label: '2 minutes' },
  { value: 3, label: '3 minutes' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 360, label: '6 hours' },
  { value: 480, label: '8 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' }
];

/**
 * Common cron expression examples for UI helper
 */
export const CRON_EXAMPLES = [
  { expression: '0 9 * * *', label: 'Every day at 9:00 AM' },
  { expression: '0 9 * * MON-FRI', label: 'Weekdays at 9:00 AM' },
  { expression: '0 */2 * * *', label: 'Every 2 hours' },
  { expression: '0 9,18 * * *', label: 'At 9:00 AM and 6:00 PM' },
  { expression: '0 0 * * SUN', label: 'Every Sunday at midnight' }
];

/**
 * Display data for workflow schedules with pre-formatted values
 */
export interface WorkflowScheduleDisplayData extends WorkflowSchedule {
  scheduleTypeDisplay: string;
  nextRunDisplay: string;
  lastRunDisplay: string;
  executionCountDisplay: string;
}

/**
 * Transform a WorkflowSchedule to display data with formatted values
 */
export function transformScheduleToDisplayData(
  schedule: WorkflowSchedule,
  intervalOptions: typeof INTERVAL_OPTIONS
): WorkflowScheduleDisplayData {
  return {
    ...schedule,
    scheduleTypeDisplay: getScheduleTypeDisplay(schedule, intervalOptions),
    nextRunDisplay: formatUtcToLocal(schedule.nextRunUtc),
    lastRunDisplay: formatUtcToLocal(schedule.lastRunUtc),
    executionCountDisplay: formatExecutionCount(schedule.executionCount, schedule.maxExecutions)
  };
}

/**
 * Get schedule type display text
 */
function getScheduleTypeDisplay(schedule: WorkflowSchedule, intervalOptions: typeof INTERVAL_OPTIONS): string {
  switch (schedule.scheduleType) {
    case 'OneTime':
      return 'One-time';
    case 'Interval':
      const option = intervalOptions.find(o => o.value === schedule.intervalMinutes);
      return option ? option.label : `${schedule.intervalMinutes} min`;
    case 'Cron':
      return schedule.cronExpression || 'Cron';
    default:
      return schedule.scheduleType;
  }
}

/**
 * Format UTC datetime string to local time display
 */
function formatUtcToLocal(utcString?: string): string {
  if (!utcString) return '-';

  const utcDate = utcString.endsWith('Z') ? utcString : utcString + 'Z';
  const date = new Date(utcDate);

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format execution count display
 */
function formatExecutionCount(count: number, max?: number): string {
  return max ? `${count} / ${max}` : `${count}`;
}
