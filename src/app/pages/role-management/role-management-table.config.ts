import { TableConfig } from '../../shared/models/table.models';
import { RoleDto } from '../../models/role.models';

export const ROLE_MANAGEMENT_TABLE_CONFIG: TableConfig<RoleDto> = {
  title: 'Role Management',
  columns: [
    {
      key: 'name',
      header: 'Role Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'roleCode',
      header: 'Role Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'isProtected',
      header: 'Protected',
      sortable: true,
      filterable: false,
      transform: (value: boolean) => (value ? 'Yes' : 'No')
    },
    {
      key: 'createdUtc',
      header: 'Created',
      sortable: true,
      filterable: false,
      transform: (value: Date) => new Date(value).toLocaleString()
    },
    {
      key: 'updatedUtc',
      header: 'Last Updated',
      sortable: true,
      filterable: false,
      transform: (value: Date | undefined) =>
        value ? new Date(value).toLocaleString() : 'Never'
    }
  ],
  actions: [
    {
      action: 'view',
      label: 'View',
      icon: 'visibility',
      type: 'icon',
      tooltip: 'View'
    },
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
      label: 'Add Role',
      icon: 'add',
      color: 'primary'
    }
  ],
  pagination: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100]
  },
  filter: {
    placeholder: 'Search roles...',
    enabled: true
  },
  defaultSort: {
    column: 'name',
    direction: 'asc'
  },
  empty: {
    message: 'No roles found',
    icon: 'inbox',
    actionText: 'Add First Role'
  }
};
