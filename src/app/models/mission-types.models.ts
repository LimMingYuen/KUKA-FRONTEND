/**
 * Mission Types Models
 *
 * TypeScript interfaces for Mission Types data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Mission Type DTO from backend API response
 */
export interface MissionTypeDto {
  id: number;
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
  createdUtc: string;
  updatedUtc: string;
}

/**
 * Mission Type Create Request DTO
 */
export interface MissionTypeCreateRequest {
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
}

/**
 * Mission Type Update Request DTO
 */
export interface MissionTypeUpdateRequest {
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
 * Display Data for Mission Types Table
 * Extended with formatted display values
 */
export interface MissionTypeDisplayData extends MissionTypeDto {
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
 * Utility Functions for Mission Types Data Processing
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
 * Transform MissionTypeDto to MissionTypeDisplayData
 */
export function transformMissionTypeData(missionType: MissionTypeDto): MissionTypeDisplayData {
  return {
    ...missionType,
    statusText: getStatusText(missionType.isActive),
    createdDateDisplay: formatDate(missionType.createdUtc),
    updatedDateDisplay: formatDate(missionType.updatedUtc),
    createdDateRelative: formatRelativeTime(missionType.createdUtc),
    updatedDateRelative: formatRelativeTime(missionType.updatedUtc),
    actualValueDisplay: formatActualValue(missionType.actualValue),
    descriptionDisplay: formatDescription(missionType.description)
  };
}

/**
 * Transform array of mission types for display
 */
export function transformMissionTypesForDisplay(missionTypes: MissionTypeDto[]): MissionTypeDisplayData[] {
  return missionTypes.map(missionType => transformMissionTypeData(missionType));
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
  if (value.toLowerCase().includes('urgent')) return 'value-urgent';
  if (value.toLowerCase().includes('high')) return 'value-high';
  if (value.toLowerCase().includes('medium')) return 'value-medium';
  if (value.toLowerCase().includes('low')) return 'value-low';
  return 'value-normal';
}

/**
 * Validate mission type display name
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName) return false;
  return displayName.trim().length >= 3 && displayName.trim().length <= 100;
}

/**
 * Validate mission type actual value
 */
export function isValidActualValue(actualValue: string): boolean {
  if (!actualValue) return false;
  return actualValue.trim().length >= 1 && actualValue.trim().length <= 50;
}

/**
 * Validate mission type description
 */
export function isValidDescription(description: string): boolean {
  if (!description) return true; // Description is optional
  return description.trim().length <= 500;
}

/**
 * Check if mission type value conflicts with existing mission types
 */
export function hasValueConflict(newValue: string, existingMissionTypes: MissionTypeDto[], currentId?: number): boolean {
  return existingMissionTypes.some(missionType =>
    missionType.actualValue === newValue && missionType.id !== currentId
  );
}

/**
 * Get mission type category from display name
 */
export function getMissionTypeCategory(displayName: string): string {
  if (!displayName) return 'Unknown';

  // Extract category from display name
  const lowerName = displayName.toLowerCase();

  if (lowerName.includes('delivery')) return 'Delivery';
  if (lowerName.includes('pickup')) return 'Pickup';
  if (lowerName.includes('transport')) return 'Transport';
  if (lowerName.includes('maintenance')) return 'Maintenance';
  if (lowerName.includes('inspection')) return 'Inspection';
  if (lowerName.includes('emergency')) return 'Emergency';
  if (lowerName.includes('routine')) return 'Routine';
  if (lowerName.includes('special')) return 'Special';

  return 'General';
}

/**
 * Sort mission types by priority (active first, then by display name)
 */
export function sortMissionTypesByPriority(missionTypes: MissionTypeDisplayData[]): MissionTypeDisplayData[] {
  return missionTypes.sort((a, b) => {
    // Active mission types come first
    if (a.isActive !== b.isActive) {
      return b.isActive ? 1 : -1;
    }
    // Then sort by display name
    return a.displayName.localeCompare(b.displayName);
  });
}