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
      key: 'id',
      header: 'ID',
      sortable: true,
      filterable: true,
      width: '80px',
      headerClass: 'id-header',
      cellClass: 'id-cell'
    },
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
      width: '160px',
      headerClass: 'created-date-header',
      cellClass: 'created-date-cell',
      transform: (value: string) => {
        if (!value) return 'N/A';
        try {
          const date = new Date(value);
          return date.toLocaleDateString();
        } catch {
          return value;
        }
      }
    },
    {
      key: 'updatedDate',
      header: 'Updated Date',
      sortable: true,
      filterable: true,
      width: '160px',
      headerClass: 'updated-date-header',
      cellClass: 'updated-date-cell',
      transform: (value: string) => {
        if (!value) return 'N/A';
        try {
          const date = new Date(value);
          return date.toLocaleDateString();
        } catch {
          return value;
        }
      }
    }
  ],

  actions: [
    {
      action: 'view',
      label: 'View',
      icon: 'visibility',
      type: 'icon',
      tooltip: 'View zone details'
    },
    {
      action: 'edit',
      label: 'Edit',
      icon: 'edit',
      type: 'icon',
      tooltip: 'Edit zone'
    },
    {
      action: 'export',
      label: 'Export',
      icon: 'download',
      type: 'menu-item',
      tooltip: 'Export zone data'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'delete',
      type: 'menu-item',
      tooltip: 'Delete zone',
      cssClass: 'danger-action'
    }
  ],

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
      console.log('Sync map zones from empty state');
    }
  },

  defaultSort: {
    column: 'id',
    direction: 'asc'
  },

  cssClass: 'map-zone-table'
};