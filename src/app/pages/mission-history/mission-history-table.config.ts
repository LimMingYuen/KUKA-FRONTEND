import { TableConfig } from '../../shared/models/table.models';
import { MissionHistoryDisplayData } from '../../models/mission-history.models';

/**
 * Mission History Table Configuration
 *
 * This configuration defines how the mission history table should be rendered
 * using the generic table component.
 */
export const MISSION_HISTORY_TABLE_CONFIG: TableConfig<MissionHistoryDisplayData> = {
  title: 'Mission History',
  bordered: true,
  striped: true,
  hoverable: true,

  columns: [
    {
      key: 'missionCode',
      header: 'Mission Code',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'requestId',
      header: 'Request ID',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'workflowDisplay',
      header: 'Workflow',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'statusText',
      header: 'Status',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'errorMessageDisplay',
      header: 'Error Message',
      sortable: false,
      filterable: true,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || '-';
      }
    },
    {
      key: 'robotDisplay',
      header: 'Robot',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'createdByDisplay',
      header: 'Triggered By',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'System';
      }
    },
    {
      key: 'durationDisplay',
      header: 'Working Time',
      sortable: true,
      filterable: false,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'createdDateRelative',
      header: 'Time Ago',
      sortable: false,
      filterable: false,
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    }
  ],

  actions: [
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'icon',
      tooltip: 'Delete mission record',
      cssClass: 'danger-action'
    }
  ],

  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh mission history'
    },
    {
      action: 'clear-history',
      label: 'Clear History',
      icon: 'clear_all',
      type: 'raised',
      color: 'warn',
      tooltip: 'Clear all mission history records',
      loading: false
    }
  ],

  filter: {
    placeholder: 'Search missions by code, workflow, status...',
    enabled: true
  },

  pagination: {
    pageSizeOptions: [10, 25, 50, 100],
    pageSize: 25,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No mission history found',
    icon: 'history',
    actionText: 'Refresh',
    action: () => {
      // This will be overridden in the component
    }
  },

  defaultSort: {
    column: 'createdDateDisplay',
    direction: 'desc'
  },

  cssClass: 'mission-history-table'
};