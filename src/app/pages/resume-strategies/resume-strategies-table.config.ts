import { TableConfig, ColumnConfig, ActionConfig } from '../../shared/models/table.models';
import { ResumeStrategyDisplayData } from '../../models/resume-strategies.models';

/**
 * Table configuration for Resume Strategies
 */
export const RESUME_STRATEGIES_TABLE_CONFIG: TableConfig<ResumeStrategyDisplayData> = {
  title: 'Resume Strategies',

  // Column definitions
  columns: [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: '80px',
      cellClass: 'id-cell',
      headerClass: 'id-header',
      transform: (value: number) => value.toString()
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      width: '200px',
      cellClass: 'display-name-cell',
      headerClass: 'display-name-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      width: '150px',
      cellClass: 'actual-value-cell',
      headerClass: 'actual-value-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      width: '300px',
      cellClass: 'description-cell',
      headerClass: 'description-header',
      transform: (value: string) => value || 'No description'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '120px',
      allowHtml: true,
      cellClass: 'status-cell',
      headerClass: 'status-header',
      transform: (value: boolean, row: ResumeStrategyDisplayData) => {
        const statusClass = value ? 'status-active' : 'status-inactive';
        return `<span class="status-badge ${statusClass}">${row.statusText}</span>`;
      }
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'createdDateRelative',
      header: 'Created',
      sortable: true,
      filterable: true,
      width: '140px',
      cellClass: 'created-date-cell',
      headerClass: 'created-date-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'updatedDateRelative',
      header: 'Updated',
      sortable: true,
      filterable: true,
      width: '140px',
      cellClass: 'updated-date-cell',
      headerClass: 'updated-date-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<ResumeStrategyDisplayData>
  ],

  // Row actions
  actions: [
    {
      action: 'view',
      label: 'View',
      icon: 'visibility',
      type: 'icon',
      tooltip: 'View details',
      color: 'primary',
      disabled: () => false
    } as ActionConfig,

    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      type: 'icon',
      tooltip: 'Edit resume strategy',
      color: 'accent',
      disabled: () => false
    } as ActionConfig,

    {
      action: 'toggle-status',
      label: 'Toggle Status',
      icon: 'power_settings_new',
      type: 'icon',
      tooltip: 'Toggle active/inactive status',
      color: 'warn',
      disabled: () => false
    } as ActionConfig,

    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'icon',
      tooltip: 'Delete resume strategy',
      color: 'warn',
      disabled: (row: any) => row.isActive
    } as ActionConfig
  ],

  // Pagination configuration
  pagination: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50],
    showFirstLastButtons: true,
    enabled: true
  },

  // Filter configuration
  filter: {
    placeholder: 'Search resume strategies...',
    enabled: true
  },

  // Default sort configuration
  defaultSort: {
    column: 'displayName',
    direction: 'asc'
  },

  // Empty state configuration
  empty: {
    message: 'No Resume Strategies Found. Get started by creating your first resume strategy configuration.',
    icon: 'restart_alt',
    actionText: 'Create Resume Strategy'
  }
};
