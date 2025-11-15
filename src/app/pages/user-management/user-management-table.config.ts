import { TableConfig } from '../../shared/models/table.models';
import { UserDto } from '../../models/user.models';

export const USER_MANAGEMENT_TABLE_CONFIG: TableConfig<UserDto> = {
  title: 'User Management',
  columns: [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: false
    },
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      filterable: true
    },
    {
      key: 'nickname',
      header: 'Nickname',
      sortable: true,
      filterable: true
    },
    {
      key: 'isSuperAdmin',
      header: 'Super Admin',
      sortable: true,
      filterable: false,
      transform: (value: boolean) => (value ? 'Yes' : 'No')
    },
    {
      key: 'roles',
      header: 'Roles',
      sortable: false,
      filterable: true,
      transform: (value: string[]) => (value && value.length > 0 ? value.join(', ') : 'None')
    },
    {
      key: 'createTime',
      header: 'Created',
      sortable: true,
      filterable: false,
      transform: (value: Date) => new Date(value).toLocaleDateString()
    },
    {
      key: 'createBy',
      header: 'Created By',
      sortable: true,
      filterable: true
    }
  ],
  actions: [
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      color: 'primary'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: 'warn'
    }
  ],
  headerActions: [
    {
      action: 'add',
      label: 'Add User',
      icon: 'add',
      color: 'primary'
    }
  ],
  pagination: {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100]
  },
  filter: {
    placeholder: 'Search users...',
    enabled: true
  },
  defaultSort: {
    column: 'username',
    direction: 'asc'
  },
  empty: {
    message: 'No users found',
    icon: 'inbox',
    actionText: 'Add First User'
  }
};
