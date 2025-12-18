import { TableConfig } from '../shared/models/table.models';
import { WorkflowDisplayData } from '../models/workflow.models';

/**
 * Workflow Table Configuration
 *
 * This configuration defines how the workflow table should be rendered
 * using the generic table component.
 */
export const WORKFLOW_TABLE_CONFIG: TableConfig<WorkflowDisplayData> = {
  title: 'Workflows Management',
  bordered: true,
  striped: true,
  hoverable: true,

  columns: [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'externalCode',
      header: 'External Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      transform: (value: number, row: WorkflowDisplayData) => row.statusText
    },
    {
      key: 'statusText',
      header: 'Status Text',
      sortable: true,
      filterable: true
    },
    {
      key: 'layoutCode',
      header: 'Layout Code',
      sortable: true,
      filterable: true
    }
  ],

  headerActions: [
    {
      action: 'sync',
      label: 'Sync Workflows',
      icon: 'sync',
      type: 'raised',
      color: 'accent',
      tooltip: 'Sync workflows from external API',
      loading: false
    }
  ],

  filter: {
    placeholder: 'Search workflows by name, code, status...',
    enabled: true
  },

  pagination: {
    pageSizeOptions: [50, 100, 150, 200],
    pageSize: 50,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No workflows found',
    icon: 'account_tree',
    actionText: 'Sync Workflows',
    action: () => {
      // This will be overridden in the component
    }
  },

  defaultSort: {
    column: 'name',
    direction: 'asc'
  },

  cssClass: 'workflow-table'
};