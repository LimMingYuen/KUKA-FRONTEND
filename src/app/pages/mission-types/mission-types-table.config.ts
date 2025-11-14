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
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: '80px',
      cellClass: 'id-cell',
      headerClass: 'id-header',
      transform: (value: number) => value.toString()
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      width: '200px',
      cellClass: 'display-name-cell',
      headerClass: 'display-name-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      width: '150px',
      cellClass: 'actual-value-cell',
      headerClass: 'actual-value-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      width: '300px',
      cellClass: 'description-cell',
      headerClass: 'description-header',
      transform: (value: string) => value || 'No description'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'statusText',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '120px',
      cellClass: 'status-cell',
      headerClass: 'status-header',
      transform: (value: string) => value || 'Unknown'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      width: '160px',
      cellClass: 'created-date-cell',
      headerClass: 'created-date-header',
      transform: (value: string) => value || 'N/A'
    } as ColumnConfig<MissionTypeDisplayData>,

    {
      key: 'updatedDateDisplay',
      header: 'Updated Date',
      sortable: true,
      filterable: true,
      width: '160px',
      cellClass: 'updated-date-cell',
      headerClass: 'updated-date-header',
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
      icon: 'toggle_on',
      type: 'icon',
      tooltip: 'Toggle mission type status',
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
      disabled: (row: any) => row.isActive
    } as ActionConfig
  ],

  // Empty state configuration
  empty: {
    message: 'No Mission Types Found. Get started by creating your first mission type configuration.',
    icon: 'assignment',
    actionText: 'Create Mission Type'
  }
};