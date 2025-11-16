import { TableConfig, ColumnConfig, ActionConfig } from '../../shared/models/table.models';
import { AreaDisplayData } from '../../models/areas.models';

/**
 * Table configuration for Areas
 */
export const AREAS_TABLE_CONFIG: TableConfig<AreaDisplayData> = {
  title: 'Areas',

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
    } as ColumnConfig<AreaDisplayData>,

    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      width: '200px',
      cellClass: 'display-name-cell',
      headerClass: 'display-name-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<AreaDisplayData>,

    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      width: '150px',
      cellClass: 'actual-value-cell',
      headerClass: 'actual-value-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<AreaDisplayData>,

    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      width: '300px',
      cellClass: 'description-cell',
      headerClass: 'description-header',
      transform: (value: string) => value || 'No description'
    } as ColumnConfig<AreaDisplayData>,

    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '120px',
      allowHtml: true,
      cellClass: 'status-cell',
      headerClass: 'status-header',
      transform: (value: boolean, row: AreaDisplayData) => {
        const statusClass = value ? 'status-active' : 'status-inactive';
        return `<span class="status-badge ${statusClass}">${row.statusText}</span>`;
      }
    } as ColumnConfig<AreaDisplayData>,

    {
      key: 'createdDateRelative',
      header: 'Created',
      sortable: true,
      filterable: true,
      width: '140px',
      cellClass: 'created-date-cell',
      headerClass: 'created-date-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<AreaDisplayData>,

    {
      key: 'updatedDateRelative',
      header: 'Updated',
      sortable: true,
      filterable: true,
      width: '140px',
      cellClass: 'updated-date-cell',
      headerClass: 'updated-date-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<AreaDisplayData>
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
      tooltip: 'Edit area',
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
      tooltip: 'Delete area',
      color: 'warn',
      disabled: (row: any) => row.isActive
    } as ActionConfig
  ],

  // Header actions
  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh areas'
    },
    {
      action: 'create-area',
      label: 'Create Area',
      icon: 'add',
      type: 'raised',
      color: 'primary',
      tooltip: 'Create new area',
      loading: false
    }
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
    placeholder: 'Search areas...',
    enabled: true
  },

  // Default sort configuration
  defaultSort: {
    column: 'displayName',
    direction: 'asc'
  },

  // Empty state configuration
  empty: {
    message: 'No Areas Found. Get started by creating your first warehouse area configuration.',
    icon: 'location_on',
    actionText: 'Create Area'
  }
};
