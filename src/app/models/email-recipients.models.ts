/**
 * Email Recipients Management Models
 * Based on backend EmailRecipientsController API
 */

/**
 * Email recipient entity
 */
export interface EmailRecipient {
  id: number;
  emailAddress: string;
  displayName: string;
  description?: string;
  notificationTypes: string;
  isActive: boolean;
  createdUtc: Date;
  updatedUtc?: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Email recipient DTO (Data Transfer Object)
 */
export interface EmailRecipientDto {
  id: number;
  emailAddress: string;
  displayName: string;
  description?: string;
  notificationTypes: string;
  isActive: boolean;
  createdUtc: Date;
  updatedUtc?: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Email recipient create request
 */
export interface EmailRecipientCreateRequest {
  emailAddress: string;
  displayName: string;
  description?: string;
  notificationTypes: string;
  isActive: boolean;
}

/**
 * Email recipient update request
 */
export interface EmailRecipientUpdateRequest {
  emailAddress: string;
  displayName: string;
  description?: string;
  notificationTypes: string;
  isActive: boolean;
}

/**
 * Test email request
 */
export interface TestEmailRequest {
  testEmailAddress: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data?: T;
}

/**
 * Notification type option for multi-select
 */
export interface NotificationTypeOption {
  value: string;
  label: string;
  description: string;
}

/**
 * Available notification types
 */
export const NOTIFICATION_TYPE_OPTIONS: NotificationTypeOption[] = [
  {
    value: 'MissionError',
    label: 'Mission Submit Error',
    description: 'Errors when submitting missions to the AMR system'
  },
  {
    value: 'JobQueryError',
    label: 'Job Query Error',
    description: 'Errors when querying job status from the AMR system'
  },
  {
    value: 'RobotQueryError',
    label: 'Robot Query Error',
    description: 'Errors when querying robot position from the AMR system'
  }
];

/**
 * Transform raw API response to EmailRecipient
 */
export function transformEmailRecipient(raw: any): EmailRecipient {
  return {
    id: raw.id,
    emailAddress: raw.emailAddress,
    displayName: raw.displayName,
    description: raw.description,
    notificationTypes: raw.notificationTypes || '',
    isActive: raw.isActive ?? true,
    createdUtc: new Date(raw.createdUtc),
    updatedUtc: raw.updatedUtc ? new Date(raw.updatedUtc) : undefined,
    createdBy: raw.createdBy,
    updatedBy: raw.updatedBy
  };
}

/**
 * Parse notification types string to array
 */
export function parseNotificationTypes(notificationTypes: string): string[] {
  if (!notificationTypes) return [];
  return notificationTypes.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
}

/**
 * Join notification types array to string
 */
export function joinNotificationTypes(types: string[]): string {
  return types.filter((t) => t.trim().length > 0).join(',');
}
