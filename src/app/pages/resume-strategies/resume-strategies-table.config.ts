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
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'No description'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      allowHtml: true,
      transform: (value: boolean) => {
        const statusClass = value ? 'status-active' : 'status-inactive';
        const statusText = value ? 'ACTIVE' : 'INACTIVE';
        return `<span class="status-badge ${statusClass}">${statusText}</span>`;
      }
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<ResumeStrategyDisplayData>,

    {
      key: 'updatedDateDisplay',
      header: 'Updated Date',
      sortable: true,
      filterable: true,
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
      disabled: () => false
    } as ActionConfig
  ],

  // Header actions
  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh resume strategies'
    },
    {
      action: 'create-resume-strategy',
      label: 'Create Resume Strategy',
      icon: 'add',
      type: 'raised',
      color: 'primary',
      tooltip: 'Create new resume strategy',
      loading: false
    }
  ],

  // Pagination configuration
  pagination: {
    pageSize: 50,
    pageSizeOptions: [50, 100, 150, 200],
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
