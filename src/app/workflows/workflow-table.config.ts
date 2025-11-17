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
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: '80px',
      headerClass: 'id-header',
      cellClass: 'id-cell'
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      headerClass: 'name-header',
      cellClass: 'name-cell'
    },
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'code-header',
      cellClass: 'code-cell'
    },
    {
      key: 'externalCode',
      header: 'External Code',
      sortable: true,
      filterable: true,
      width: '150px',
      headerClass: 'external-code-header',
      cellClass: 'external-code-cell'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'status-header',
      cellClass: 'status-cell',
      transform: (value: number, row: WorkflowDisplayData) => row.statusText
    },
    {
      key: 'statusText',
      header: 'Status Text',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'status-text-header',
      cellClass: 'status-text-cell'
    },
    {
      key: 'layoutCode',
      header: 'Layout Code',
      sortable: true,
      filterable: true,
      width: '130px',
      headerClass: 'layout-code-header',
      cellClass: 'layout-code-cell'
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
    pageSizeOptions: [5, 10, 25, 100],
    pageSize: 10,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No workflows found',
    icon: 'account_tree',
    actionText: 'Sync Workflows',
    action: () => {
      // This will be overridden in the component
      console.log('Sync workflows from empty state');
    }
  },

  defaultSort: {
    column: 'id',
    direction: 'asc'
  },

  cssClass: 'workflow-table'
};