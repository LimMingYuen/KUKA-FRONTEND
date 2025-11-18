import { TableConfig } from '../../shared/models/table.models';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';

export const WORKFLOW_TEMPLATE_TABLE_CONFIG: TableConfig<SavedCustomMissionsDisplayData> = {
  title: 'Workflow Templates',
  columns: [
    {
      key: 'missionName',
      header: 'Template Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      filterable: true
    },
    {
      key: 'missionType',
      header: 'Mission Type',
      sortable: true,
      filterable: true
    },
    {
      key: 'robotType',
      header: 'Robot Type',
      sortable: true,
      filterable: true
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      filterable: true
    },
    {
      key: 'robotModels',
      header: 'Robot Models',
      sortable: false,
      filterable: true
    },
    {
      key: 'createdBy',
      header: 'Created By',
      sortable: true,
      filterable: true
    },
    {
      key: 'createdUtc',
      header: 'Created',
      sortable: true,
      filterable: false
    }
  ],
  actions: [
    {
      action: 'view',
      label: 'View Details',
      icon: 'visibility',
      color: 'primary',
      type: 'icon',
      tooltip: 'View template details'
    },
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      color: 'primary',
      type: 'icon',
      tooltip: 'Edit template'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: 'warn',
      type: 'icon',
      tooltip: 'Delete template'
    }
  ],
  headerActions: [
    {
      action: 'create',
      label: 'Create Template',
      icon: 'add',
      color: 'primary'
    },
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      color: 'primary'
    }
  ],
  pagination: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100]
  },
  filter: {
    placeholder: 'Search workflow templates...',
    enabled: true
  },
  defaultSort: {
    column: 'createdUtc',
    direction: 'desc'
  },
  empty: {
    message: 'No workflow templates found. Create your first template to get started.',
    icon: 'add_task',
    actionText: 'Create Template'
  }
};
