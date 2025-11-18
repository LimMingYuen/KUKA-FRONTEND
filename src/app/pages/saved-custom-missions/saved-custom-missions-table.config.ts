import { TableConfig } from '../../shared/models/table.models';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';
import { SavedCustomMissionsUtils } from '../../models/saved-custom-missions.models';

/**
 * Saved Custom Missions Table Configuration
 *
 * This configuration defines how the saved custom missions table should be rendered
 * using the generic table component.
 */
export const SAVED_CUSTOM_MISSIONS_TABLE_CONFIG: TableConfig<SavedCustomMissionsDisplayData> = {
  title: 'Saved Custom Missions',
  bordered: true,
  striped: true,
  hoverable: true,

  columns: [
    {
      key: 'missionName',
      header: 'Mission Name',
      sortable: true,
      filterable: true,
      width: '200px',
      headerClass: 'mission-name-header',
      cellClass: 'mission-name-cell',
      transform: (value: string) => {
        return value || 'Unnamed Mission';
      }
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      width: '250px',
      headerClass: 'description-header',
      cellClass: 'description-cell',
      transform: (value: string) => {
        return value || '-';
      }
    },
    {
      key: 'missionType',
      header: 'Mission Type',
      sortable: true,
      filterable: true,
      width: '150px',
      headerClass: 'mission-type-header',
      cellClass: 'mission-type-cell',
      transform: (value: string) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'robotType',
      header: 'Robot Type',
      sortable: true,
      filterable: true,
      width: '150px',
      headerClass: 'robot-type-header',
      cellClass: 'robot-type-cell',
      transform: (value: string) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'priority-header',
      cellClass: 'priority-cell',
      transform: (value: string, row: SavedCustomMissionsDisplayData) => {
        return value || 'MEDIUM';
      }
    },
    {
      key: 'robotModels',
      header: 'Robot Models',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'robot-models-header',
      cellClass: 'robot-models-cell',
      transform: (value: string) => {
        return value || '-';
      }
    },
    {
      key: 'totalSchedules',
      header: 'Schedules',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'schedules-header',
      cellClass: 'schedules-cell',
      transform: (value: string, row: SavedCustomMissionsDisplayData) => {
        return value || '0/0';
      }
    },
    {
      key: 'nextRunUtc',
      header: 'Next Run',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'next-run-header',
      cellClass: 'next-run-cell',
      transform: (value: string) => {
        return value || 'Not scheduled';
      }
    },
    {
      key: 'lastStatus',
      header: 'Last Status',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'last-status-header',
      cellClass: 'last-status-cell',
      transform: (value: string) => {
        return value || 'Never run';
      }
    },
    {
      key: 'lastRunUtc',
      header: 'Last Run',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'last-run-header',
      cellClass: 'last-run-cell',
      transform: (value: string) => {
        return value || 'Never';
      }
    },
    {
      key: 'createdBy',
      header: 'Created By',
      sortable: true,
      filterable: true,
      width: '150px',
      headerClass: 'created-by-header',
      cellClass: 'created-by-cell',
      transform: (value: string) => {
        return value || 'System';
      }
    },
    {
      key: 'createdUtc',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'created-date-header',
      cellClass: 'created-date-cell',
      transform: (value: string) => {
        return value || 'N/A';
      }
    }
  ],

  actions: [
    {
      action: 'view',
      label: 'View Details',
      icon: 'visibility',
      type: 'icon',
      tooltip: 'View mission details'
    },
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      type: 'icon',
      tooltip: 'Edit mission configuration'
    },
    {
      action: 'trigger',
      label: 'Trigger Mission',
      icon: 'play_arrow',
      type: 'menu-item',
      tooltip: 'Trigger mission execution',
      cssClass: 'trigger-action'
    },
    {
      action: 'duplicate',
      label: 'Duplicate',
      icon: 'content_copy',
      type: 'menu-item',
      tooltip: 'Duplicate mission'
    },
    {
      action: 'export',
      label: 'Export',
      icon: 'download',
      type: 'menu-item',
      tooltip: 'Export mission data'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'menu-item',
      tooltip: 'Delete mission',
      cssClass: 'danger-action'
    }
  ],

  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh missions list'
    },
    {
      action: 'create',
      label: 'New Mission',
      icon: 'add',
      type: 'button',
      color: 'primary',
      tooltip: 'Create new saved custom mission'
    },
    {
      action: 'export-all',
      label: 'Export All',
      icon: 'download',
      type: 'button',
      color: 'accent',
      tooltip: 'Export all missions data'
    }
  ],

  filter: {
    placeholder: 'Search missions by name, type, robot, description...',
    enabled: true
  },

  pagination: {
    pageSizeOptions: [10, 25, 50, 100],
    pageSize: 25,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No saved custom missions found',
    icon: 'save',
    actionText: 'Create New Mission',
    action: () => {
      // This will be overridden in the component
    }
  },

  defaultSort: {
    column: 'createdUtc',
    direction: 'desc'
  },

  cssClass: 'saved-custom-missions-table'
};