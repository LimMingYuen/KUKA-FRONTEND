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
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: '80px',
      headerClass: 'id-header',
      cellClass: 'id-cell'
    },
    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true,
      headerClass: 'display-name-header',
      cellClass: 'display-name-cell',
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'actualValue',
      header: 'Actual Value',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'actual-value-header',
      cellClass: 'actual-value-cell',
      transform: (value: number) => {
        return value?.toLocaleString() || '0';
      }
    },
    {
      key: 'descriptionDisplay',
      header: 'Description',
      sortable: true,
      filterable: true,
      headerClass: 'description-header',
      cellClass: 'description-cell',
      transform: (value: string) => {
        return value || 'No description';
      }
    },
    {
      key: 'statusText',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'status-header',
      cellClass: 'status-cell',
      transform: (value: string, row: ShelfDecisionRuleDisplayData) => {
        return value || 'Unknown';
      }
    },
    {
      key: 'createdDateDisplay',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'created-date-header',
      cellClass: 'created-date-cell',
      transform: (value: string) => {
        return value || 'N/A';
      }
    },
    {
      key: 'updatedDateRelative',
      header: 'Last Updated',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'updated-date-header',
      cellClass: 'updated-date-cell',
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
      icon: 'toggle_on',
      type: 'icon',
      tooltip: 'Toggle active/inactive status'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'menu-item',
      tooltip: 'Delete rule',
      cssClass: 'danger-action'
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