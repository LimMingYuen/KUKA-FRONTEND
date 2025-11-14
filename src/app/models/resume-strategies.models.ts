/**
 * Resume Strategies Models
 *
 * TypeScript interfaces for Resume Strategies data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Resume Strategy DTO from backend API response
 */
export interface ResumeStrategyDto {
  id: number;
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
  createdUtc: string;
  updatedUtc: string;
}

/**
 * Resume Strategy Create Request DTO
 */
export interface ResumeStrategyCreateRequest {
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
}

/**
 * Resume Strategy Update Request DTO
 */
export interface ResumeStrategyUpdateRequest {
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  msg?: string;
}

/**
 * Display Data for Resume Strategies Table
 * Extended with formatted display values
 */
export interface ResumeStrategyDisplayData extends ResumeStrategyDto {
  // Formatted display values
  statusText: string;
  createdDateDisplay: string;
  updatedDateDisplay: string;
  createdDateRelative: string;
  updatedDateRelative: string;
  actualValueDisplay: string;
  descriptionDisplay: string;
}

/**
 * Utility Functions for Resume Strategies Data Processing
 */

/**
 * Transform status boolean to display text
 */
export function getStatusText(isActive: boolean): string {
  return isActive ? 'Active' : 'Inactive';
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
 * Format actual value for display
 */
export function formatActualValue(value: string): string {
  if (!value) return 'N/A';
  return value;
}

/**
 * Format description for display
 */
export function formatDescription(description: string): string {
  if (!description) return 'No description';
  return description.length > 100 ? description.substring(0, 100) + '...' : description;
}

/**
 * Transform ResumeStrategyDto to ResumeStrategyDisplayData
 */
export function transformResumeStrategyData(resumeStrategy: ResumeStrategyDto): ResumeStrategyDisplayData {
  return {
    ...resumeStrategy,
    statusText: getStatusText(resumeStrategy.isActive),
    createdDateDisplay: formatDate(resumeStrategy.createdUtc),
    updatedDateDisplay: formatDate(resumeStrategy.updatedUtc),
    createdDateRelative: formatRelativeTime(resumeStrategy.createdUtc),
    updatedDateRelative: formatRelativeTime(resumeStrategy.updatedUtc),
    actualValueDisplay: formatActualValue(resumeStrategy.actualValue),
    descriptionDisplay: formatDescription(resumeStrategy.description)
  };
}

/**
 * Transform array of resume strategies for display
 */
export function transformResumeStrategiesForDisplay(resumeStrategies: ResumeStrategyDto[]): ResumeStrategyDisplayData[] {
  return resumeStrategies.map(resumeStrategy => transformResumeStrategyData(resumeStrategy));
}

/**
 * Get CSS class for status badge
 */
export function getStatusClass(isActive: boolean): string {
  return isActive ? 'status-active' : 'status-inactive';
}

/**
 * Get CSS class for actual value display
 */
export function getActualValueClass(value: string): string {
  if (!value) return 'value-empty';
  return 'value-normal';
}

/**
 * Validate resume strategy display name
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName) return false;
  return displayName.trim().length >= 3 && displayName.trim().length <= 100;
}

/**
 * Validate resume strategy actual value
 */
export function isValidActualValue(actualValue: string): boolean {
  if (!actualValue) return false;
  return actualValue.trim().length >= 1 && actualValue.trim().length <= 50;
}

/**
 * Validate resume strategy description
 */
export function isValidDescription(description: string): boolean {
  if (!description) return true; // Description is optional
  return description.trim().length <= 500;
}

/**
 * Check if resume strategy value conflicts with existing resume strategies
 */
export function hasValueConflict(newValue: string, existingResumeStrategies: ResumeStrategyDto[], currentId?: number): boolean {
  return existingResumeStrategies.some(resumeStrategy =>
    resumeStrategy.actualValue === newValue && resumeStrategy.id !== currentId
  );
}

/**
 * Sort resume strategies by priority (active first, then by display name)
 */
export function sortResumeStrategiesByPriority(resumeStrategies: ResumeStrategyDisplayData[]): ResumeStrategyDisplayData[] {
  return resumeStrategies.sort((a, b) => {
    // Active resume strategies come first
    if (a.isActive !== b.isActive) {
      return b.isActive ? 1 : -1;
    }
    // Then sort by display name
    return a.displayName.localeCompare(b.displayName);
  });
}
