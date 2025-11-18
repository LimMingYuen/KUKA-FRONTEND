/**
 * Generic Table Component Configuration Interfaces
 *
 * These interfaces define the configuration structure for the reusable table component,
 * allowing it to handle different data types and use cases with full type safety.
 */

import { TemplateRef } from '@angular/core';

/**
 * Base interface for table events
 */
export interface BaseTableEvent {
  type: string;
  data?: any;
}

/**
 * Action event emitted when a user clicks an action button
 */
export interface ActionEvent extends BaseTableEvent {
  action: string;
  row: any;
  rowIndex: number;
}

/**
 * Sort change event
 */
export interface SortEvent extends BaseTableEvent {
  column: string;
  direction: 'asc' | 'desc' | '';
}

/**
 * Page change event
 */
export interface PageEvent extends BaseTableEvent {
  pageIndex: number;
  pageSize: number;
  length: number;
}

/**
 * Filter change event
 */
export interface FilterEvent extends BaseTableEvent {
  filter: string;
}

/**
 * Column configuration for the generic table
 */
export interface ColumnConfig<T> {
  /** Column key - maps to property name in data object */
  key: keyof T;
  /** Column header text */
  header: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Whether column is included in search filter */
  filterable?: boolean;
  /** Column width CSS */
  width?: string;
  /** Custom cell template */
  template?: TemplateRef<any>;
  /** CSS class for header cells */
  headerClass?: string;
  /** CSS class for data cells */
  cellClass?: string;
  /** Transform function for display value */
  transform?: (value: any, row: T) => string;
  /** Allow HTML rendering (use with caution - only for trusted content) */
  allowHtml?: boolean;
}

/**
 * Action button configuration
 */
export interface ActionConfig {
  /** Action identifier */
  action: string;
  /** Button label or icon name */
  label: string;
  /** Button type: 'icon' | 'button' | 'menu-item' */
  type?: 'icon' | 'button' | 'menu-item';
  /** Material icon name */
  icon?: string;
  /** Button color */
  color?: 'primary' | 'accent' | 'warn';
  /** Tooltip text */
  tooltip?: string;
  /** Whether action is disabled */
  disabled?: (row: any) => boolean;
  /** Whether action should be hidden */
  hidden?: (row: any) => boolean;
  /** CSS class for action button */
  cssClass?: string;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Available page size options */
  pageSizeOptions: number[];
  /** Default page size */
  pageSize: number;
  /** Whether to show first/last buttons */
  showFirstLastButtons?: boolean;
  /** Whether pagination is enabled */
  enabled?: boolean;
}

/**
 * Empty state configuration
 */
export interface EmptyConfig {
  /** Empty state message */
  message: string;
  /** Empty state icon name */
  icon?: string;
  /** Action button text */
  actionText?: string;
  /** Action to perform when empty state action is clicked */
  action?: () => void;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  /** Placeholder text for search input */
  placeholder: string;
  /** Whether filter is enabled */
  enabled?: boolean;
  /** Fields to include in filter (if not specified, all filterable columns are used) */
  fields?: string[];
}

/**
 * Header action configuration
 */
export interface HeaderActionConfig {
  /** Action identifier */
  action: string;
  /** Button label */
  label: string;
  /** Material icon name */
  icon?: string;
  /** Button type: 'icon' | 'button' | 'raised' */
  type?: 'icon' | 'button' | 'raised';
  /** Button color */
  color?: 'primary' | 'accent' | 'warn';
  /** Tooltip text */
  tooltip?: string;
  /** Whether action shows loading state */
  loading?: boolean;
  /** CSS class for header action */
  cssClass?: string;
}

/**
 * Main table configuration interface
 */
export interface TableConfig<T> {
  /** Table title */
  title: string;
  /** Column definitions */
  columns: ColumnConfig<T>[];
  /** Row actions configuration */
  actions?: ActionConfig[];
  /** Pagination configuration */
  pagination?: PaginationConfig;
  /** Empty state configuration */
  empty?: EmptyConfig;
  /** Filter configuration */
  filter?: FilterConfig;
  /** Header actions configuration */
  headerActions?: HeaderActionConfig[];
  /** Whether table is bordered */
  bordered?: boolean;
  /** Whether table is striped */
  striped?: boolean;
  /** Whether table is hoverable */
  hoverable?: boolean;
  /** Whether table is compact */
  compact?: boolean;
  /** Custom CSS classes */
  cssClass?: string;
  /** Default sort column */
  defaultSort?: {
    column: keyof T;
    direction: 'asc' | 'desc';
  };
  /** Whether to show row numbers column (enabled by default) */
  showRowNumbers?: boolean;
}

/**
 * Default configurations
 */
export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  pageSizeOptions: [5, 10, 25, 100],
  pageSize: 10,
  showFirstLastButtons: true,
  enabled: true
};

export const DEFAULT_EMPTY_CONFIG: EmptyConfig = {
  message: 'No data available',
  icon: 'inbox'
};

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  placeholder: 'Search...',
  enabled: true
};

export const DEFAULT_TABLE_CONFIG: Partial<TableConfig<any>> = {
  pagination: DEFAULT_PAGINATION_CONFIG,
  empty: DEFAULT_EMPTY_CONFIG,
  filter: DEFAULT_FILTER_CONFIG,
  bordered: true,
  striped: true,
  hoverable: true,
  showRowNumbers: true
};