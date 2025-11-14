/**
 * Shelf Decision Rules Models
 *
 * TypeScript interfaces for Shelf Decision Rules data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Shelf Decision Rule DTO from backend API response
 */
export interface ShelfDecisionRuleDto {
  id: number;
  displayName: string;
  actualValue: number;
  description: string;
  isActive: boolean;
  createdUtc: string;
  updatedUtc: string;
}

/**
 * Shelf Decision Rule Create Request DTO
 */
export interface ShelfDecisionRuleCreateRequest {
  displayName: string;
  actualValue: number;
  description: string;
  isActive: boolean;
}

/**
 * Shelf Decision Rule Update Request DTO
 */
export interface ShelfDecisionRuleUpdateRequest {
  displayName: string;
  actualValue: number;
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
 * Display Data for Shelf Decision Rules Table
 * Extended with formatted display values
 */
export interface ShelfDecisionRuleDisplayData extends ShelfDecisionRuleDto {
  // Formatted display values
  statusText: string;
  createdDateDisplay: string;
  updatedDateDisplay: string;
  createdDateRelative: string;
  updatedDateRelative: string;
  valueDisplay: string;
  descriptionDisplay: string;
}

/**
 * Utility Functions for Shelf Decision Rules Data Processing
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
 * Format numeric value for display
 */
export function formatValue(value: number): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString();
}

/**
 * Format description for display
 */
export function formatDescription(description: string): string {
  if (!description) return 'No description';
  return description.length > 100 ? description.substring(0, 100) + '...' : description;
}

/**
 * Transform ShelfDecisionRuleDto to ShelfDecisionRuleDisplayData
 */
export function transformShelfDecisionRuleData(rule: ShelfDecisionRuleDto): ShelfDecisionRuleDisplayData {
  return {
    ...rule,
    statusText: getStatusText(rule.isActive),
    createdDateDisplay: formatDate(rule.createdUtc),
    updatedDateDisplay: formatDate(rule.updatedUtc),
    createdDateRelative: formatRelativeTime(rule.createdUtc),
    updatedDateRelative: formatRelativeTime(rule.updatedUtc),
    valueDisplay: formatValue(rule.actualValue),
    descriptionDisplay: formatDescription(rule.description)
  };
}

/**
 * Transform array of shelf decision rules for display
 */
export function transformShelfDecisionRulesForDisplay(rules: ShelfDecisionRuleDto[]): ShelfDecisionRuleDisplayData[] {
  return rules.map(rule => transformShelfDecisionRuleData(rule));
}

/**
 * Get CSS class for status badge
 */
export function getStatusClass(isActive: boolean): string {
  return isActive ? 'status-active' : 'status-inactive';
}

/**
 * Get CSS class for value display
 */
export function getValueClass(value: number): string {
  if (value < 0) return 'value-negative';
  if (value === 0) return 'value-zero';
  return 'value-positive';
}

/**
 * Validate rule display name
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName) return false;
  return displayName.trim().length >= 3 && displayName.trim().length <= 100;
}

/**
 * Validate rule actual value
 */
export function isValidActualValue(value: number): boolean {
  return value !== null && value !== undefined && !isNaN(value);
}

/**
 * Validate rule description
 */
export function isValidDescription(description: string): boolean {
  if (!description) return true; // Description is optional
  return description.trim().length <= 500;
}

/**
 * Check if rule value conflicts with existing rules
 */
export function hasValueConflict(newValue: number, existingRules: ShelfDecisionRuleDto[], currentId?: number): boolean {
  return existingRules.some(rule =>
    rule.actualValue === newValue && rule.id !== currentId
  );
}

/**
 * Get rule type from display name
 */
export function getRuleType(displayName: string): string {
  if (!displayName) return 'Unknown';

  // Extract rule type from display name
  const lowerName = displayName.toLowerCase();

  if (lowerName.includes('capacity')) return 'Capacity';
  if (lowerName.includes('weight')) return 'Weight';
  if (lowerName.includes('priority')) return 'Priority';
  if (lowerName.includes('threshold')) return 'Threshold';
  if (lowerName.includes('limit')) return 'Limit';
  if (lowerName.includes('buffer')) return 'Buffer';

  return 'General';
}

/**
 * Sort rules by priority (active first, then by actual value)
 */
export function sortRulesByPriority(rules: ShelfDecisionRuleDisplayData[]): ShelfDecisionRuleDisplayData[] {
  return rules.sort((a, b) => {
    // Active rules come first
    if (a.isActive !== b.isActive) {
      return b.isActive ? 1 : -1;
    }
    // Then sort by actual value
    return a.actualValue - b.actualValue;
  });
}