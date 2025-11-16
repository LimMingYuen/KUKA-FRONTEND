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
 * Classified workflow information
 */
export interface ClassifiedWorkflow {
  externalWorkflowId: number;
  workflowCode: string;
  workflowName: string;
  zoneName: string;
  zoneCode: string;
}

/**
 * Result of sync and classify all workflows operation
 */
export interface SyncAndClassifyAllResult {
  totalWorkflows: number;
  successCount: number;
  failureCount: number;
  noZoneMatchCount: number;
  failedWorkflowIds: number[];
  noZoneMatchWorkflowIds: number[];
  errors: { [key: string]: string };
  classifiedWorkflows: ClassifiedWorkflow[];
  timestamp?: Date;
}

/**
 * Sync and classify history entry
 */
export interface SyncClassifyHistoryEntry {
  id: number;
  timestamp: Date;
  totalWorkflows: number;
  successCount: number;
  failureCount: number;
  noZoneMatchCount: number;
  classifiedCount: number;
  duration?: number; // in milliseconds
  status: 'success' | 'partial' | 'failed';
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
