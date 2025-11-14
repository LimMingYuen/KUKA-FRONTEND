/**
 * Workflow data models and interfaces
 * Based on backend DTOs from WorkflowsController
 */

export interface WorkflowSummaryDto {
  id: number;
  name: string;
  number: string;
  externalCode: string;
  status: number;
  layoutCode: string;
}

export interface WorkflowSyncResultDto {
  total: number;
  inserted: number;
  updated: number;
}

export interface WorkflowDiagramDto {
  workflowCode: string;
  workflowOuterCode: string;
  workflowName: string;
  workflowModel: string;
  robotTypeClass: string;
  mapCode: string;
  buttonName: string;
  createUsername: string;
  createTime: string;
  updateUsername: string;
  updateTime: string;
  status: number;
  needConfirm: boolean;
  lockRobotAfterFinish: boolean;
  workflowPriority: number;
  targetAreaCode: string;
  preSelectedRobotCellCode: string;
  preSelectedRobotId: string;
}

/**
 * API Response wrapper - consistent with existing auth service pattern
 */
export interface ApiResponse<T> {
  success: boolean;
  code: string;
  msg: string;
  data?: T;
}

/**
 * Workflow table display data structure
 */
export interface WorkflowDisplayData {
  id: number;
  name: string;
  code: string;
  externalCode: string;
  status: number;
  statusText: string;
  layoutCode: string;
}

/**
 * Workflow sync request payload
 */
export interface SyncRequest {
  pageNum: number;
  pageSize: number;
}

/**
 * Status mapping for workflow statuses
 */
export const WORKFLOW_STATUS_MAP: { [key: number]: string } = {
  0: 'Inactive',
  1: 'Active',
  2: 'Pending',
  3: 'Completed',
  4: 'Failed',
  5: 'Suspended'
};

/**
 * Get status text for workflow status code
 */
export function getWorkflowStatusText(status: number): string {
  return WORKFLOW_STATUS_MAP[status] || `Unknown (${status})`;
}