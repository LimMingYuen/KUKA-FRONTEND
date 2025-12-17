import { TableConfig } from '../../shared/models/table.models';
import { ShelfDecisionRuleDisplayData } from '../../models/shelf-decision-rules.models';

/**
 * Shelf Decision Rules Table Configuration
 *
 * This configuration defines how the shelf decision rules table should be rendered
 * using the generic table component.
 */
export const SHELF_DECISION_RULES_TABLE_CONFIG: TableConfig<ShelfDecisionRuleDisplayData> = {
  title: 'Shelf Decision Rules',
  bordered: true,
  striped: true,
  hoverable: true,

  columns: [
    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'descriptionDisplay',
      header: 'Description',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
        return value || 'No description';
      }
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      allowHtml: true,
      transform: (value: boolean, row: ShelfDecisionRuleDisplayData) => {
        const statusClass = value ? 'status-active' : 'status-inactive';
        const statusText = value ? 'ACTIVE' : 'INACTIVE';
        return `<span class="status-badge ${statusClass}">${statusText}</span>`;
      }
    },
    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'updatedDateDisplay',
      header: 'Updated Date',
      sortable: true,
      filterable: true,
      transform: (value: string) => {
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
      tooltip: 'View rule details'
    },
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      type: 'icon',
      tooltip: 'Edit rule'
    },
    {
      action: 'toggle-status',
      label: 'Toggle Status',
      icon: 'power_settings_new',
      type: 'icon',
      tooltip: 'Toggle active/inactive status',
      color: 'primary'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'icon',
      color: 'warn',
      tooltip: 'Delete rule'
    }
  ],

  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh shelf decision rules'
    },
    {
      action: 'create-rule',
      label: 'Create Rule',
      icon: 'add',
      type: 'raised',
      color: 'primary',
      tooltip: 'Create new shelf decision rule',
      loading: false
    }
  ],

  filter: {
    placeholder: 'Search rules by name, description, status...',
    enabled: true
  },

  pagination: {
    pageSizeOptions: [5, 10, 25, 50],
    pageSize: 10,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No shelf decision rules found',
    icon: 'rule',
    actionText: 'Create Rule',
    action: () => {
      // This will be overridden in the component
    }
  },

  defaultSort: {
    column: 'actualValue',
    direction: 'asc'
  },

  cssClass: 'shelf-decision-rules-table'
};