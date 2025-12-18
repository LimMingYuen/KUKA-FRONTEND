import { TableConfig, ColumnConfig, ActionConfig } from '../../shared/models/table.models';
import { OrganizationIdDisplayData } from '../../models/organization-ids.models';

/**
 * Table configuration for Organization IDs
 */
export const ORGANIZATION_IDS_TABLE_CONFIG: TableConfig<OrganizationIdDisplayData> = {
  title: 'Organization IDs',

  // Column definitions
  columns: [
    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<OrganizationIdDisplayData>,

    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<OrganizationIdDisplayData>,

    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'No description'
    } as ColumnConfig<OrganizationIdDisplayData>,

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
    } as ColumnConfig<OrganizationIdDisplayData>,

    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<OrganizationIdDisplayData>,

    {
      key: 'updatedDateDisplay',
      header: 'Updated Date',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<OrganizationIdDisplayData>
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
      tooltip: 'Edit organization ID',
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
      tooltip: 'Delete organization ID',
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
      tooltip: 'Refresh organization IDs'
    },
    {
      action: 'create-organization-id',
      label: 'Create Organization ID',
      icon: 'add',
      type: 'raised',
      color: 'primary',
      tooltip: 'Create new organization ID',
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
    placeholder: 'Search organization IDs...',
    enabled: true
  },

  // Default sort configuration
  defaultSort: {
    column: 'displayName',
    direction: 'asc'
  },

  // Empty state configuration
  empty: {
    message: 'No Organization IDs Found. Get started by creating your first organization ID configuration.',
    icon: 'business',
    actionText: 'Create Organization ID'
  }
};
