import { Directive, TemplateRef, Input } from '@angular/core';

/**
 * Table Action Directive
 *
 * Allows for custom action templates to be provided for action buttons
 * in the generic table component.
 *
 * Usage:
 * <ng-template appTableAction let-data let-rowIndex="rowIndex">
 *   <button mat-button (click)="customAction(data)">
 *     <mat-icon>custom_icon</mat-icon>
 *     Custom Action
 *   </button>
 * </ng-template>
 */
@Directive({
  selector: '[appTableAction]'
})
export class TableActionDirective<T = any> {
  constructor(public templateRef: TemplateRef<any>) {}

  @Input() appTableAction!: string;
}