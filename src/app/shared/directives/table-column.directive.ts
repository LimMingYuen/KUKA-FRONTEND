import { Directive, TemplateRef, Input } from '@angular/core';

/**
 * Table Column Directive
 *
 * Allows for custom cell templates to be provided for specific columns
 * in the generic table component.
 *
 * Usage:
 * <ng-template appTableColumn let-data let-column="column">
 *   <span [class]="getStatusClass(data.status)">{{ data.statusText }}</span>
 * </ng-template>
 */
@Directive({
  selector: '[appTableColumn]'
})
export class TableColumnDirective<T = any> {
  constructor(public templateRef: TemplateRef<any>) {}

  @Input() appTableColumn!: string;
}