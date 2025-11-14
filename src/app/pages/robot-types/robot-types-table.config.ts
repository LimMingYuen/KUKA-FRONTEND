import { TableConfig, ColumnConfig, ActionConfig } from '../../shared/models/table.models';
import { RobotTypeDisplayData } from '../../models/robot-types.models';

export const ROBOT_TYPES_TABLE_CONFIG: TableConfig<RobotTypeDisplayData> = {
  title: 'Robot Types',

  columns: [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: '80px'
    },
    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      width: '200px',
      transform: (value: string) => value || 'N/A'
    },
    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      width: '150px',
      transform: (value: string, row: RobotTypeDisplayData) => row.actualValueDisplay
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      width: '300px',
      transform: (value: string, row: RobotTypeDisplayData) => row.descriptionDisplay
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '100px',
      transform: (value: boolean, row: RobotTypeDisplayData) => row.statusText
    },
    {
      key: 'createdDateRelative',
      header: 'Created',
      sortable: true,
      filterable: true,
      width: '120px'
    },
    {
      key: 'updatedDateRelative',
      header: 'Updated',
      sortable: true,
      filterable: true,
      width: '120px'
    }
  ] as ColumnConfig<RobotTypeDisplayData>[],

  actions: [
    {
      action: 'view',
      label: 'View',
      type: 'icon',
      icon: 'visibility',
      tooltip: 'View robot type details',
      color: 'primary'
    } as ActionConfig,

    {
      action: 'edit',
      label: 'Edit',
      type: 'icon',
      icon: 'edit',
      tooltip: 'Edit robot type',
      color: 'accent'
    } as ActionConfig,

    {
      action: 'toggle-status',
      label: 'Toggle Status',
      type: 'icon',
      icon: 'power_settings_new',
      tooltip: 'Toggle active/inactive status',
      color: 'warn'
    } as ActionConfig,

    {
      action: 'delete',
      label: 'Delete',
      type: 'icon',
      icon: 'delete',
      tooltip: 'Delete robot type',
      color: 'warn'
    } as ActionConfig
  ],

  pagination: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50],
    showFirstLastButtons: true,
    enabled: true
  },

  filter: {
    placeholder: 'Search robot types...',
    enabled: true
  },

  defaultSort: {
    column: 'displayName',
    direction: 'asc'
  },

  
  empty: {
    message: 'There are no robot types configured yet.',
    icon: 'smart_toy',
    actionText: 'Create First Robot Type',
    action: () => {} // This will be overridden by the component
  }
};