import { TableConfig } from '../../shared/models/table.models';
import { MobileRobotDisplayData } from '../../models/mobile-robot.models';

/**
 * Mobile Robot Table Configuration
 *
 * This configuration defines how the mobile robot table should be rendered
 * using the generic table component.
 */
export const MOBILE_ROBOT_TABLE_CONFIG: TableConfig<MobileRobotDisplayData> = {
  title: 'Mobile Robots Management',
  bordered: true,
  striped: true,
  hoverable: true,

  columns: [
    {
      key: 'robotId',
      header: 'Robot ID',
      sortable: true,
      filterable: true
    },
    {
      key: 'robotTypeCode',
      header: 'Type',
      sortable: true,
      filterable: true
    },
    {
      key: 'statusText',
      header: 'Status',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MobileRobotDisplayData) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'batteryLevelText',
      header: 'Battery',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MobileRobotDisplayData) => {
        return value || '0%';
      }
    },
    {
      key: 'mapCode',
      header: 'Map Code',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'floorDisplay',
      header: 'Floor',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MobileRobotDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'coordinatesText',
      header: 'Coordinates',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MobileRobotDisplayData) => {
        return value || '(0.00, 0.00)';
      }
    },
    {
      key: 'orientationText',
      header: 'Orientation',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MobileRobotDisplayData) => {
        return value || '0°';
      }
    },
    {
      key: 'nodeDisplay',
      header: 'Current Node',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MobileRobotDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'reliabilityText',
      header: 'Reliability',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MobileRobotDisplayData) => {
        return `${row.reliability.toFixed(1)}% (${value})`;
      }
    }
  ],

  actions: [
    {
      action: 'view',
      label: 'View',
      icon: 'visibility',
      type: 'icon',
      tooltip: 'View robot details'
    },
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      type: 'icon',
      tooltip: 'Edit robot'
    },
    {
      action: 'export',
      label: 'Export',
      icon: 'download',
      type: 'menu-item',
      tooltip: 'Export robot data'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'menu-item',
      tooltip: 'Delete robot',
      cssClass: 'danger-action'
    }
  ],

  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh mobile robots'
    },
    {
      action: 'sync',
      label: 'Sync Robots',
      icon: 'sync',
      type: 'raised',
      color: 'accent',
      tooltip: 'Sync mobile robots from external API',
      loading: false
    }
  ],

  filter: {
    placeholder: 'Search robots by ID, type, status, map code...',
    enabled: true
  },

  pagination: {
    pageSizeOptions: [5, 10, 25, 100],
    pageSize: 10,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No mobile robots found',
    icon: 'smart_toy',
    actionText: 'Sync Robots',
    action: () => {
      // This will be overridden in the component
    }
  },

  defaultSort: {
    column: 'robotId',
    direction: 'asc'
  },

  cssClass: 'mobile-robot-table'
};