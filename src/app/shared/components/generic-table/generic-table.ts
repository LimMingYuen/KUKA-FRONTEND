import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';

import {
  TableConfig,
  ActionEvent,
  SortEvent,
  PageEvent,
  FilterEvent,
  DEFAULT_PAGINATION_CONFIG,
  DEFAULT_EMPTY_CONFIG,
  DEFAULT_FILTER_CONFIG,
  DEFAULT_TABLE_CONFIG
} from '../../models/table.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatToolbarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatMenuModule
  ],
  templateUrl: './generic-table.html',
  styleUrl: './generic-table.scss'
})
export class GenericTableComponent<T = any> implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  // Inputs
  @Input() data: T[] = [];
  @Input() config!: TableConfig<T>;
  @Input() loading: boolean = false;
  @Input() empty: boolean = false;

  // Outputs
  @Output() action = new EventEmitter<ActionEvent>();
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() filterChange = new EventEmitter<FilterEvent>();

  // Material table references
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table data source
  public dataSource = new MatTableDataSource<T>();

  // Displayed columns
  public displayedColumns: string[] = [];

  // Filter value
  public filterValue: string = '';

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    this.initializeConfig();
    this.updateDisplayedColumns();
    this.setupDataSource();
  }

  ngAfterViewInit(): void {
    // Connect paginator and sort
    if (this.paginator && this.config.pagination?.enabled) {
      this.dataSource.paginator = this.paginator;

      // Update paginator with current data length
      if (this.data && this.data.length > 0) {
        this.paginator.length = this.data.length;
      }
    }

    // Try to connect sort with a longer delay to handle timing issues
    setTimeout(() => {
      if (this.sort) {
        this.dataSource.sort = this.sort;

        // Set default sort if configured
        if (this.config.defaultSort) {
          setTimeout(() => {
            if (this.dataSource.sort) {
              this.dataSource.sort.sort({
                id: this.config.defaultSort!.column as string,
                start: this.config.defaultSort!.direction,
                disableClear: false
              });
            }
          }, 100);
        }
      } else {
        // Try one more time with a longer delay
        setTimeout(() => {
          if (this.sort) {
            this.dataSource.sort = this.sort;

            if (this.config.defaultSort) {
              this.dataSource.sort.sort({
                id: this.config.defaultSort!.column as string,
                start: this.config.defaultSort!.direction,
                disableClear: false
              });
            }
          }
        }, 500);
      }
    }, 100);

    // Force update paginator after a short delay to ensure it's properly initialized
    setTimeout(() => {
      this.updatePaginatorIfAvailable();
    }, 200);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateDataSource();
    }

    if (changes['config']) {
      this.initializeConfig();
      this.updateDisplayedColumns();
      this.setupDataSource();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize configuration with defaults
   */
  private initializeConfig(): void {
    const defaults = DEFAULT_TABLE_CONFIG as TableConfig<T>;
    this.config = {
      ...defaults,
      ...this.config,
      pagination: {
        ...DEFAULT_PAGINATION_CONFIG,
        ...this.config.pagination
      },
      empty: {
        ...DEFAULT_EMPTY_CONFIG,
        ...this.config.empty
      },
      filter: {
        ...DEFAULT_FILTER_CONFIG,
        ...this.config.filter
      }
    };
  }

  /**
   * Update displayed columns based on configuration
   */
  private updateDisplayedColumns(): void {
    const columnKeys = this.config.columns.map(col => col.key as string);

    // Add actions column if actions are configured
    if (this.config.actions && this.config.actions.length > 0) {
      columnKeys.push('actions');
    }

    this.displayedColumns = columnKeys;
  }

  /**
   * Setup data source with filter and sort predicates
   */
  private setupDataSource(): void {
    this.setupFilterPredicate();
    this.setupSortingDataAccessor();
  }

  /**
   * Update data source with new data
   */
  private updateDataSource(): void {
    this.dataSource.data = this.data || [];

    // Update paginator length if available
    if (this.paginator) {
      this.paginator.length = this.data.length;
    }

    // Try to connect sort again when data is updated
    this.connectSortIfAvailable();
  }

  /**
   * Connect sort if available (fallback method)
   */
  private connectSortIfAvailable(): void {
    if (this.sort && !this.dataSource.sort) {
      this.dataSource.sort = this.sort;

      // Apply default sort if configured and not already sorted
      if (this.config.defaultSort && this.data && this.data.length > 0) {
        setTimeout(() => {
          if (this.dataSource.sort) {
            this.dataSource.sort.sort({
              id: this.config.defaultSort!.column as string,
              start: this.config.defaultSort!.direction,
              disableClear: false
            });
          }
        }, 50);
      }
    }
  }

  /**
   * Force update paginator when data changes after initialization
   */
  private updatePaginatorIfAvailable(): void {
    if (this.paginator && this.config.pagination?.enabled) {
      // Connect the paginator to the data source if not already connected
      if (!this.dataSource.paginator) {
        this.dataSource.paginator = this.paginator;
      }

      this.paginator.length = this.data?.length || 0;
    }
  }

  /**
   * Setup custom filter predicate
   */
  private setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: T, filter: string): boolean => {
      if (!filter) return true;

      const filterStr = filter.toLowerCase().trim();
      const filterableColumns = this.config.columns.filter(col => col.filterable);

      return filterableColumns.some(col => {
        const value = data[col.key];
        if (value == null) return false;

        const stringValue = String(value).toLowerCase();

        // Apply transform if configured
        const transformedValue = col.transform
          ? col.transform(value, data).toLowerCase()
          : stringValue;

        return transformedValue.includes(filterStr);
      });
    };
  }

  /**
   * Setup custom sorting data accessor
   */
  private setupSortingDataAccessor(): void {
    this.dataSource.sortingDataAccessor = (data: T, sortHeaderId: string): string | number => {
      // Find the column configuration for this sort header
      const column = this.config.columns.find(col => col.key === sortHeaderId);

      if (!column) {
        // Fallback to direct property access if column not found
        const value = (data as any)[sortHeaderId];
        return value != null ? value : '';
      }

      // Get the raw value
      let value = data[column.key];

      if (value == null) {
        return '';
      }

      // Apply transform if configured
      if (column.transform) {
        const transformedValue = column.transform(value, data);

        // Try to return numeric values for proper numeric sorting
        if (typeof value === 'number') {
          const numValue = parseFloat(String(transformedValue).replace(/[^0-9.-]/g, ''));
          return isNaN(numValue) ? transformedValue : numValue;
        }

        return transformedValue;
      }

      // Return the original value
      return typeof value === 'number' ? value : String(value);
    };
  }

  /**
   * Apply filter to table data
   */
  public applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this.filterValue = filterValue;

    // Reset to first page when filtering
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    // Emit filter change event
    this.filterChange.emit({
      type: 'filter',
      filter: filterValue
    });
  }

  /**
   * Clear filter
   */
  public clearFilter(): void {
    this.filterValue = '';
    this.dataSource.filter = '';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    this.filterChange.emit({
      type: 'filter',
      filter: ''
    });
  }

  /**
   * Handle sort change
   */
  public onSortChange(event: any): void {
    this.sortChange.emit({
      type: 'sort',
      column: event.active,
      direction: event.direction
    });
  }

  /**
   * Handle page change
   */
  public onPageChange(event: any): void {
    this.pageChange.emit({
      type: 'page',
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      length: event.length
    });
  }

  /**
   * Handle action click
   */
  public onActionClick(actionConfig: any, row: T, rowIndex: number): void {
    this.action.emit({
      type: 'action',
      action: actionConfig.action,
      row,
      rowIndex
    });
  }

  /**
   * Handle header action click
   */
  public onHeaderActionClick(actionConfig: any): void {
    this.action.emit({
      type: 'header-action',
      action: actionConfig.action,
      data: actionConfig,
      row: null,
      rowIndex: -1
    });
  }

  /**
   * Handle empty state action click
   */
  public onEmptyActionClick(): void {
    if (this.config.empty?.action) {
      this.config.empty.action();
    }
  }

  /**
   * Get cell value for display
   */
  public getCellValue(row: T, column: any): string {
    const key = column.key as keyof T;
    const value = row[key];

    if (value == null) return '';

    // Apply transform if configured
    if (column.transform) {
      return column.transform(value, row);
    }

    return String(value);
  }

  /**
   * Check if action should be visible for a row
   */
  public isActionVisible(actionConfig: any, row: T): boolean {
    if (actionConfig.hidden) {
      return !actionConfig.hidden(row);
    }
    return true;
  }

  /**
   * Check if action should be disabled for a row
   */
  public isActionDisabled(actionConfig: any, row: T): boolean {
    if (actionConfig.disabled) {
      return actionConfig.disabled(row);
    }
    return false;
  }

  /**
   * Get total items count
   */
  public get totalItems(): number {
    return this.dataSource.data.length;
  }

  /**
   * Check if data table is empty
   */
  public get isTableEmpty(): boolean {
    return this.totalItems === 0;
  }

  /**
   * Check if should show empty state
   */
  public get shouldShowEmptyState(): boolean {
    return this.isTableEmpty && !this.loading;
  }

  /**
   * Check if should show no results state (when filter is applied)
   */
  public get shouldShowNoResults(): boolean {
    return this.dataSource.filteredData.length === 0 &&
           this.filterValue.length > 0 &&
           !this.loading;
  }

  /**
   * Get CSS classes for table container
   */
  public getTableClasses(): { [key: string]: boolean } {
    return {
      'generic-table': true,
      'generic-table--bordered': !!this.config.bordered,
      'generic-table--striped': !!this.config.striped,
      'generic-table--hoverable': !!this.config.hoverable,
      'generic-table--compact': !!this.config.compact,
      [this.config.cssClass || '']: !!this.config.cssClass
    };
  }

  /**
   * Get CSS classes for row
   */
  public getRowClasses(rowIndex: number): { [key: string]: boolean } {
    return {
      'table-row': true,
      'table-row--striped': !!(this.config.striped && rowIndex % 2 === 1)
    };
  }

  /**
   * Get column key as string
   */
  public getColumnKey(column: any): string {
    return String(column.key);
  }

  /**
   * Track by function for rows
   */
  public trackByFn(index: number, item: T): any {
    // Try to find an ID property, otherwise use index
    const idProperty = 'id' as keyof T;
    return (item as any)[idProperty] || index;
  }
}