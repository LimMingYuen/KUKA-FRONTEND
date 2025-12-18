import { TableConfig, ColumnConfig, ActionConfig } from '../../shared/models/table.models';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';

/**
 * Base columns (shown to all users)
 */
const BASE_COLUMNS: ColumnConfig<SavedCustomMissionsDisplayData>[] = [
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
];

/**
 * Status column (shown only to SuperAdmin)
 */
const STATUS_COLUMN: ColumnConfig<SavedCustomMissionsDisplayData> = {
  key: 'isActive',
  header: 'Status',
  sortable: true,
  filterable: true,
  allowHtml: true,
  transform: (value: boolean) => {
    const statusClass = value ? 'status-active' : 'status-inactive';
    const statusText = value ? 'ACTIVE' : 'INACTIVE';
    return `<span class="status-badge ${statusClass}">${statusText}</span>`;
  }
};

/**
 * Base actions (shown to all users)
 */
const BASE_ACTIONS: ActionConfig[] = [
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
];

/**
 * Toggle status action (shown only to SuperAdmin)
 */
const TOGGLE_STATUS_ACTION: ActionConfig = {
  action: 'toggle-status',
  label: 'Toggle Status',
  type: 'icon',
  icon: 'power_settings_new',
  tooltip: 'Toggle active/inactive status',
  color: 'accent'
};

/**
 * Get table configuration based on user role
 * @param isSuperAdmin Whether the current user is a SuperAdmin
 * @returns Table configuration with appropriate columns and actions
 */
export function getWorkflowTemplateTableConfig(isSuperAdmin: boolean): TableConfig<SavedCustomMissionsDisplayData> {
  // Insert status column after robotType for SuperAdmin
  const columns = isSuperAdmin
    ? [...BASE_COLUMNS.slice(0, 4), STATUS_COLUMN, ...BASE_COLUMNS.slice(4)]
    : BASE_COLUMNS;

  // Insert toggle-status action before delete for SuperAdmin
  const actions = isSuperAdmin
    ? [BASE_ACTIONS[0], BASE_ACTIONS[1], TOGGLE_STATUS_ACTION, BASE_ACTIONS[2]]
    : BASE_ACTIONS;

  return {
    title: 'Workflow Templates',
    columns,
    actions,
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
      pageSize: 50,
      pageSizeOptions: [50, 100, 150, 200]
    },
    filter: {
      placeholder: 'Search workflow templates...',
      enabled: true,
      storageKey: 'workflow-template-filter'
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
}

// Backward compatible export for non-SuperAdmin (default configuration)
export const WORKFLOW_TEMPLATE_TABLE_CONFIG = getWorkflowTemplateTableConfig(false);
