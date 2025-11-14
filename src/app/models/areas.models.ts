/**
 * Areas Models
 *
 * TypeScript interfaces for Areas data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Area DTO from backend API response
 */
export interface AreaDto {
  id: number;
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
  createdUtc: string;
  updatedUtc: string;
}

/**
 * Area Create Request DTO
 */
export interface AreaCreateRequest {
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
}

/**
 * Area Update Request DTO
 */
export interface AreaUpdateRequest {
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
 * Display Data for Areas Table
 * Extended with formatted display values
 */
export interface AreaDisplayData extends AreaDto {
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
 * Utility Functions for Areas Data Processing
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
 * Transform AreaDto to AreaDisplayData
 */
export function transformAreaData(area: AreaDto): AreaDisplayData {
  return {
    ...area,
    statusText: getStatusText(area.isActive),
    createdDateDisplay: formatDate(area.createdUtc),
    updatedDateDisplay: formatDate(area.updatedUtc),
    createdDateRelative: formatRelativeTime(area.createdUtc),
    updatedDateRelative: formatRelativeTime(area.updatedUtc),
    actualValueDisplay: formatActualValue(area.actualValue),
    descriptionDisplay: formatDescription(area.description)
  };
}

/**
 * Transform array of areas for display
 */
export function transformAreasForDisplay(areas: AreaDto[]): AreaDisplayData[] {
  return areas.map(area => transformAreaData(area));
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
 * Validate area display name
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName) return false;
  return displayName.trim().length >= 3 && displayName.trim().length <= 100;
}

/**
 * Validate area actual value
 */
export function isValidActualValue(actualValue: string): boolean {
  if (!actualValue) return false;
  return actualValue.trim().length >= 1 && actualValue.trim().length <= 50;
}

/**
 * Validate area description
 */
export function isValidDescription(description: string): boolean {
  if (!description) return true; // Description is optional
  return description.trim().length <= 500;
}

/**
 * Check if area value conflicts with existing areas
 */
export function hasValueConflict(newValue: string, existingAreas: AreaDto[], currentId?: number): boolean {
  return existingAreas.some(area =>
    area.actualValue === newValue && area.id !== currentId
  );
}

/**
 * Sort areas by priority (active first, then by display name)
 */
export function sortAreasByPriority(areas: AreaDisplayData[]): AreaDisplayData[] {
  return areas.sort((a, b) => {
    // Active areas come first
    if (a.isActive !== b.isActive) {
      return b.isActive ? 1 : -1;
    }
    // Then sort by display name
    return a.displayName.localeCompare(b.displayName);
  });
}
