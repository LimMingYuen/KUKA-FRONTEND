/**
 * Robot Type Models
 * Based on RobotTypesController API structure
 */

// Base DTO from API
export interface RobotTypeDto {
  id: number;
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
  createdUtc: string;
  updatedUtc: string;
}

// Display data with additional computed properties
export interface RobotTypeDisplayData extends RobotTypeDto {
  statusText: string;
  createdDateDisplay: string;
  updatedDateDisplay: string;
  createdDateRelative: string;
  updatedDateRelative: string;
  actualValueDisplay: string;
  descriptionDisplay: string;
}

// Request models for API operations
export interface RobotTypeCreateRequest {
  displayName: string;
  actualValue: string;
  description?: string;
  isActive: boolean;
}

export interface RobotTypeUpdateRequest {
  displayName: string;
  actualValue: string;
  description?: string;
  isActive: boolean;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data: T;
}

// Validation utilities
export function isValidDisplayName(displayName: string): boolean {
  return Boolean(displayName && displayName.trim().length >= 3 && displayName.trim().length <= 100);
}

export function isValidActualValue(actualValue: string): boolean {
  return Boolean(actualValue && actualValue.trim().length >= 1 && actualValue.trim().length <= 50);
}

export function isValidDescription(description: string): boolean {
  return !description || description.trim().length <= 500;
}

// Transform utilities
export function transformRobotTypeDtoToDisplayData(dto: RobotTypeDto): RobotTypeDisplayData {
  const now = new Date();
  const createdDate = new Date(dto.createdUtc);
  const updatedDate = new Date(dto.updatedUtc);

  return {
    ...dto,
    statusText: dto.isActive ? 'Active' : 'Inactive',
    createdDateDisplay: createdDate.toLocaleDateString(),
    updatedDateDisplay: updatedDate.toLocaleDateString(),
    createdDateRelative: getRelativeTime(createdDate, now),
    updatedDateRelative: getRelativeTime(updatedDate, now),
    actualValueDisplay: `[${dto.actualValue}]`,
    descriptionDisplay: dto.description || 'No description'
  };
}

export function getStatusClass(isActive: boolean): string {
  return isActive ? 'status-active' : 'status-inactive';
}

export function getActualValueClass(value: string): string {
  return `actual-value--${value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

// Utility function for relative time
function getRelativeTime(date: Date, now: Date): string {
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
}