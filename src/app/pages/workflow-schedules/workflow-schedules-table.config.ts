import { TableConfig } from '../../shared/models/table.models';
import { WorkflowScheduleDisplayData } from '../../models/workflow-schedule.models';

/**
 * Table configuration for workflow schedules
 * Note: The 'isEnabled' column uses a custom template assigned at runtime
 */
export const WORKFLOW_SCHEDULES_TABLE_CONFIG: TableConfig<WorkflowScheduleDisplayData> = {
  title: 'Workflow Schedules',
  showRowNumbers: true,
  columns: [
    {
      key: 'scheduleName',
      header: 'Schedule Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'savedMissionName',
      header: 'Workflow Template',
      sortable: true,
      filterable: true
    },
    {
      key: 'scheduleTypeDisplay',
      header: 'Type',
      sortable: true,
      filterable: true
    },
    {
      key: 'nextRunDisplay',
      header: 'Next Run',
      sortable: true,
      filterable: false
    },
    {
      key: 'lastRunDisplay',
      header: 'Last Run',
      sortable: true,
      filterable: false
    },
    {
      key: 'executionCountDisplay',
      header: 'Executions',
      sortable: true,
      filterable: false
    },
    {
      key: 'isEnabled',
      header: 'Status',
      sortable: true,
      filterable: false
      // template will be assigned at runtime for the toggle switch
    }
  ],
  actions: [
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      type: 'icon',
      tooltip: 'Edit'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'icon',
      tooltip: 'Delete'
    }
  ],
  headerActions: [
    {
      action: 'add',
      label: 'Create Schedule',
      icon: 'add',
      type: 'raised',
      color: 'primary'
    }
  ],
  pagination: {
    pageSize: 50,
    pageSizeOptions: [50, 100, 150, 200],
    enabled: true,
    showFirstLastButtons: true
  },
  filter: {
    placeholder: 'Search schedules...',
    enabled: true
  },
  empty: {
    message: 'No schedules found',
    icon: 'schedule',
    actionText: 'Create First Schedule'
  },
  defaultSort: {
    column: 'scheduleName',
    direction: 'asc'
  },
  hoverable: true,
  striped: true
};
