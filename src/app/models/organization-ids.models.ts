/**
 * Organization IDs Models
 *
 * TypeScript interfaces for Organization IDs data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Organization ID DTO from backend API response
 */
export interface OrganizationIdDto {
  id: number;
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
  createdUtc: string;
  updatedUtc: string;
}

/**
 * Organization ID Create Request DTO
 */
export interface OrganizationIdCreateRequest {
  displayName: string;
  actualValue: string;
  description: string;
  isActive: boolean;
}

/**
 * Organization ID Update Request DTO
 */
export interface OrganizationIdUpdateRequest {
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
 * Display Data for Organization IDs Table
 * Extended with formatted display values
 */
export interface OrganizationIdDisplayData extends OrganizationIdDto {
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
 * Utility Functions for Organization IDs Data Processing
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
 * Transform OrganizationIdDto to OrganizationIdDisplayData
 */
export function transformOrganizationIdData(organizationId: OrganizationIdDto): OrganizationIdDisplayData {
  return {
    ...organizationId,
    statusText: getStatusText(organizationId.isActive),
    createdDateDisplay: formatDate(organizationId.createdUtc),
    updatedDateDisplay: formatDate(organizationId.updatedUtc),
    createdDateRelative: formatRelativeTime(organizationId.createdUtc),
    updatedDateRelative: formatRelativeTime(organizationId.updatedUtc),
    actualValueDisplay: formatActualValue(organizationId.actualValue),
    descriptionDisplay: formatDescription(organizationId.description)
  };
}

/**
 * Transform array of organization IDs for display
 */
export function transformOrganizationIdsForDisplay(organizationIds: OrganizationIdDto[]): OrganizationIdDisplayData[] {
  return organizationIds.map(organizationId => transformOrganizationIdData(organizationId));
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
 * Validate organization ID display name
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName) return false;
  return displayName.trim().length >= 3 && displayName.trim().length <= 100;
}

/**
 * Validate organization ID actual value
 */
export function isValidActualValue(actualValue: string): boolean {
  if (!actualValue) return false;
  return actualValue.trim().length >= 1 && actualValue.trim().length <= 50;
}

/**
 * Validate organization ID description
 */
export function isValidDescription(description: string): boolean {
  if (!description) return true; // Description is optional
  return description.trim().length <= 500;
}

/**
 * Check if organization ID value conflicts with existing organization IDs
 */
export function hasValueConflict(newValue: string, existingOrganizationIds: OrganizationIdDto[], currentId?: number): boolean {
  return existingOrganizationIds.some(organizationId =>
    organizationId.actualValue === newValue && organizationId.id !== currentId
  );
}

/**
 * Sort organization IDs by priority (active first, then by display name)
 */
export function sortOrganizationIdsByPriority(organizationIds: OrganizationIdDisplayData[]): OrganizationIdDisplayData[] {
  return organizationIds.sort((a, b) => {
    // Active organization IDs come first
    if (a.isActive !== b.isActive) {
      return b.isActive ? 1 : -1;
    }
    // Then sort by display name
    return a.displayName.localeCompare(b.displayName);
  });
}
