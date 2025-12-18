import { TableConfig } from '../../shared/models/table.models';
import { QrCodeDisplayData } from '../../models/qr-code.models';

/**
 * QR Code Table Configuration
 *
 * This configuration defines how the QR code table should be rendered
 * using the generic table component.
 */
export const QR_CODE_TABLE_CONFIG: TableConfig<QrCodeDisplayData> = {
  title: 'QR Codes Management',
  bordered: true,
  striped: true,
  hoverable: true,

  columns: [
    {
      key: 'nodeLabel',
      header: 'Node Label',
      sortable: true,
      filterable: true
    },
    {
      key: 'mapCode',
      header: 'Map Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'floorNumber',
      header: 'Floor',
      sortable: true,
      filterable: true
    },
    {
      key: 'nodeNumber',
      header: 'Node',
      sortable: true,
      filterable: true
    },
    {
      key: 'reliability',
      header: 'Reliability',
      sortable: true,
      filterable: true
    },
    {
      key: 'reportTimes',
      header: 'Report Times',
      sortable: true,
      filterable: true,
      transform: (value: number) => {
        return value?.toLocaleString() || '0';
      }
    },
    {
      key: 'lastUpdateTime',
      header: 'Last Updated',
      sortable: true,
      filterable: true
    }
  ],

  actions: [],

  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh QR codes'
    },
    {
      action: 'sync',
      label: 'Sync QR Codes',
      icon: 'sync',
      type: 'raised',
      color: 'accent',
      tooltip: 'Sync QR codes from external API',
      loading: false
    }
  ],

  filter: {
    placeholder: 'Search QR codes by node label, map code, floor...',
    enabled: true
  },

  pagination: {
    pageSizeOptions: [50, 100, 150, 200],
    pageSize: 50,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No QR codes found',
    icon: 'qr_code_2',
    actionText: 'Sync QR Codes',
    action: () => {
      // This will be overridden in the component
    }
  },

  defaultSort: {
    column: 'nodeLabel',
    direction: 'asc'
  },

  cssClass: 'qr-code-table'
};