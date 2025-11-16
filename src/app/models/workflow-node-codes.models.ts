/**
 * Workflow Node Code Sync Models
 * Models for managing workflow node code synchronization
 */

/**
 * Result of a workflow node code sync operation
 */
export interface WorkflowNodeCodeSyncResult {
  totalWorkflows: number;
  successCount: number;
  failureCount: number;
  nodeCodesInserted: number;
  nodeCodesDeleted: number;
  failedWorkflowIds: number[];
  errors: { [key: string]: string };
  timestamp?: Date;
}

/**
 * Sync history entry for tracking past sync operations
 */
export interface SyncHistoryEntry {
  id: number;
  timestamp: Date;
  totalWorkflows: number;
  successCount: number;
  failureCount: number;
  nodeCodesInserted: number;
  nodeCodesDeleted: number;
  duration?: number; // in milliseconds
  status: 'success' | 'partial' | 'failed';
}

/**
 * Failed workflow details
 */
export interface FailedWorkflowDetail {
  workflowId: number;
  errorMessage: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  code?: string;
  msg: string;
  data?: T;
}
