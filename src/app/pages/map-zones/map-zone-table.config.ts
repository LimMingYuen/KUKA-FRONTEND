import { TableConfig } from '../../shared/models/table.models';
import { MapZoneDisplayData } from '../../models/map-zone.models';

/**
 * Map Zone Table Configuration
 *
 * This configuration defines how the map zone table should be rendered
 * using the generic table component.
 */
export const MAP_ZONE_TABLE_CONFIG: TableConfig<MapZoneDisplayData> = {
  title: 'Map Zones Management',
  bordered: true,
  striped: true,
  hoverable: true,

  columns: [
    {
      key: 'name',
      header: 'Zone Name',
      sortable: true,
      filterable: true,
      headerClass: 'name-header',
      cellClass: 'name-cell'
    },
    {
      key: 'code',
      header: 'Zone Code',
      sortable: true,
      filterable: true,
      width: '140px',
      headerClass: 'code-header',
      cellClass: 'code-cell'
    },
    {
      key: 'layout',
      header: 'Layout',
      sortable: true,
      filterable: true,
      width: '180px',
      headerClass: 'layout-header',
      cellClass: 'layout-cell'
    },
    {
      key: 'areaPurpose',
      header: 'Area Purpose',
      sortable: true,
      filterable: true,
      width: '160px',
      headerClass: 'area-purpose-header',
      cellClass: 'area-purpose-cell'
    },
    {
      key: 'statusText',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '120px',
      headerClass: 'status-header',
      cellClass: 'status-cell'
    },
    {
      key: 'createdDate',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      width: '180px',
      transform: (value: string) => value || 'N/A'
    },
    {
      key: 'updatedDate',
      header: 'Updated Date',
      sortable: true,
      filterable: true,
      width: '180px',
      transform: (value: string) => value || 'N/A'
    }
  ],

  actions: [],

  headerActions: [
    {
      action: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      type: 'icon',
      tooltip: 'Refresh map zones'
    },
    {
      action: 'sync',
      label: 'Sync Map Zones',
      icon: 'sync',
      type: 'raised',
      color: 'accent',
      tooltip: 'Sync map zones from external API',
      loading: false
    }
  ],

  filter: {
    placeholder: 'Search map zones by name, code, status...',
    enabled: true
  },

  pagination: {
    pageSizeOptions: [5, 10, 25, 100],
    pageSize: 10,
    showFirstLastButtons: true,
    enabled: true
  },

  empty: {
    message: 'No map zones found',
    icon: 'map',
    actionText: 'Sync Map Zones',
    action: () => {
      // This will be overridden in the component
    }
  },

  defaultSort: {
    column: 'name',
    direction: 'asc'
  },

  cssClass: 'map-zone-table'
};