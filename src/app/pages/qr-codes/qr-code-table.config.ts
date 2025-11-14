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
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: '80px',
      headerClass: 'id-header',
      cellClass: 'id-cell'
    },
    {
      key: 'nodeLabel',
      header: 'Node Label',
      sortable: true,
      filterable: true,
      headerClass: 'node-label-header',
      cellClass: 'node-label-cell'
    },
    {
      key: 'mapCode',
      header: 'Map Code',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'map-code-header',
      cellClass: 'map-code-cell'
    },
    {
      key: 'floorDisplay',
      header: 'Floor',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'floor-header',
      cellClass: 'floor-cell',
      transform: (value: string, row: QrCodeDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'nodeDisplay',
      header: 'Node',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'node-header',
      cellClass: 'node-cell',
      transform: (value: string, row: QrCodeDisplayData) => {
        return value || 'N/A';
      }
    },
    {
      key: 'reliabilityText',
      header: 'Reliability',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'reliability-header',
      cellClass: 'reliability-cell',
      transform: (value: string, row: QrCodeDisplayData) => {
        return `${row.reliability.toFixed(1)}% (${value})`;
      }
    },
    {
      key: 'reportTimes',
      header: 'Report Times',
      sortable: true,
      filterable: true,
      width: '130px',
      headerClass: 'report-times-header',
      cellClass: 'report-times-cell',
      transform: (value: number) => {
        return value?.toLocaleString() || '0';
      }
    },
    {
      key: 'lastUpdatedDate',
      header: 'Last Updated',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'last-updated-header',
      cellClass: 'last-updated-cell',
      transform: (value: string) => {
        return value || 'Never';
      }
    }
  ],

  actions: [
    {
      action: 'view',
      label: 'View',
      icon: 'visibility',
      type: 'icon',
      tooltip: 'View QR code details'
    },
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      type: 'icon',
      tooltip: 'Edit QR code'
    },
    {
      action: 'export',
      label: 'Export',
      icon: 'download',
      type: 'menu-item',
      tooltip: 'Export QR code data'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'menu-item',
      tooltip: 'Delete QR code',
      cssClass: 'danger-action'
    }
  ],

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
    pageSizeOptions: [5, 10, 25, 100],
    pageSize: 10,
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
    column: 'id',
    direction: 'asc'
  },

  cssClass: 'qr-code-table'
};