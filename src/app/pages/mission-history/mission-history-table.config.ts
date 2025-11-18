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
      width: '180px',
      headerClass: 'mission-code-header',
      cellClass: 'mission-code-cell',
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'requestId',
      header: 'Request ID',
      sortable: true,
      filterable: true,
      width: '200px',
      headerClass: 'request-id-header',
      cellClass: 'request-id-cell',
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'workflowDisplay',
      header: 'Workflow',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'workflow-header',
      cellClass: 'workflow-cell',
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'statusText',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'status-header',
      cellClass: 'status-cell',
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'robotDisplay',
      header: 'Robot',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'robot-header',
      cellClass: 'robot-cell',
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'durationDisplay',
      header: 'Working Time',
      sortable: true,
      filterable: false,
      width: '130px',
      headerClass: 'duration-header',
      cellClass: 'duration-cell',
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      width: '200px',
      headerClass: 'created-date-header',
      cellClass: 'created-date-cell',
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'createdDateRelative',
      header: 'Time Ago',
      sortable: false,
      filterable: false,
      width: '140px',
      headerClass: 'time-ago-header',
      cellClass: 'time-ago-cell',
      transform: (value: string, row: MissionHistoryDisplayData) => {
        return value || 'N/A';
      }
    }
  ],

  actions: [
    {
      action: 'view',
      label: 'View',
      icon: 'visibility',
      type: 'icon',
      tooltip: 'View mission details'
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
      action: 'export-all',
      label: 'Export All',
      icon: 'download',
      type: 'button',
      color: 'primary',
      tooltip: 'Export all mission history data'
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