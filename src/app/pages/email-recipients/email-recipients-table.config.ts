import { TableConfig } from '../../shared/models/table.models';
import { EmailRecipientDto, parseNotificationTypes } from '../../models/email-recipients.models';

export const EMAIL_RECIPIENTS_TABLE_CONFIG: TableConfig<EmailRecipientDto> = {
  title: 'Email Recipients',
  columns: [
    {
      key: 'emailAddress',
      header: 'Email Address',
      sortable: true,
      filterable: true
    },
    {
      key: 'displayName',
      header: 'Display Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'notificationTypes',
      header: 'Notification Types',
      sortable: false,
      filterable: true,
      transform: (value: string) => {
        const types = parseNotificationTypes(value);
        return types.length > 0 ? types.join(', ') : 'None';
      }
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: false,
      transform: (value: boolean) => (value ? 'Active' : 'Inactive')
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
      action: 'test-email',
      label: 'Test Email',
      icon: 'send',
      type: 'icon',
      tooltip: 'Send Test Email'
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
      label: 'Add Recipient',
      icon: 'add',
      color: 'primary'
    }
  ],
  pagination: {
    pageSize: 50,
    pageSizeOptions: [50, 100, 150, 200]
  },
  filter: {
    placeholder: 'Search recipients...',
    enabled: true
  },
  defaultSort: {
    column: 'displayName',
    direction: 'asc'
  },
  empty: {
    message: 'No email recipients configured',
    icon: 'email',
    actionText: 'Add First Recipient'
  }
};
