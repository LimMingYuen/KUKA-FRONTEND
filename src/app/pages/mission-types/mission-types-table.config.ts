import { TableConfig, ColumnConfig, ActionConfig } from '../../shared/models/table.models';
import { MissionTypeDisplayData } from '../../models/mission-types.models';

/**
 * Table configuration for Mission Types
 */
export const MISSION_TYPES_TABLE_CONFIG: TableConfig<MissionTypeDisplayData> = {
  title: 'Mission Types',

  // Column definitions
  columns: [
    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'No description'
    } as ColumnConfig<MissionTypeDisplayData>,

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
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'updatedDateDisplay',
      header: 'Updated Date',
      sortable: true,
      filterable: true,
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<MissionTypeDisplayData>
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
      tooltip: 'Edit mission type',
      color: 'accent',
      disabled: () => false
    } as ActionConfig,

    {
      action: 'toggle-status',
      label: 'Toggle Status',
      icon: 'power_settings_new',
      type: 'icon',
      tooltip: 'Toggle active/inactive status',
      color: 'primary',
      disabled: () => false
    } as ActionConfig,

    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'icon',
      tooltip: 'Delete mission type',
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
      tooltip: 'Refresh mission types'
    },
    {
      action: 'create-mission-type',
      label: 'Create Mission Type',
      icon: 'add',
      type: 'raised',
      color: 'primary',
      tooltip: 'Create new mission type',
      loading: false
    }
  ],

  // Empty state configuration
  empty: {
    message: 'No Mission Types Found. Get started by creating your first mission type configuration.',
    icon: 'assignment',
    actionText: 'Create Mission Type'
  }
};