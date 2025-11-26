/**
 * Auto-sync settings response
 */
export interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  syncWorkflows: boolean;
  syncQrCodes: boolean;
  syncMapZones: boolean;
  syncMobileRobots: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

/**
 * Request to update auto-sync settings
 */
export interface AutoSyncSettingsUpdate {
  enabled: boolean;
  intervalMinutes: number;
  syncWorkflows: boolean;
  syncQrCodes: boolean;
  syncMapZones: boolean;
  syncMobileRobots: boolean;
}

/**
 * Result of a single sync operation
 */
export interface SyncResult {
  apiName: string;
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  errorMessage: string | null;
  timestamp: string;
}

/**
 * Result of running all syncs
 */
export interface AutoSyncRunResult {
  runTime: string;
  results: SyncResult[];
  totalApis: number;
  successfulApis: number;
  failedApis: number;
}

/**
 * Interval options for the settings UI
 */
export const SYNC_INTERVAL_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' }
];
