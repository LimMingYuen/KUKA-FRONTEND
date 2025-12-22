/**
 * Context Menu Component - Right-click / long-press menu overlay
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { ContextMenuState, ContextMenuItem, Vec2 } from '../core/canvas-types';

@Component({
  selector: 'app-canvas-context-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatRippleModule],
  template: `
    @if (state.isOpen) {
      <div
        class="context-menu-overlay"
        (click)="onOverlayClick($event)"
        (contextmenu)="$event.preventDefault()">
        <div
          class="context-menu"
          [style.left.px]="menuPosition.x"
          [style.top.px]="menuPosition.y"
          [class.animate-in]="isAnimating">
          @for (item of state.items; track item.id) {
            @if (item.divider) {
              <div class="menu-divider"></div>
            } @else {
              <button
                class="menu-item"
                [class.disabled]="item.disabled"
                [disabled]="item.disabled"
                matRipple
                (click)="onItemClick(item)">
                @if (item.icon) {
                  <mat-icon class="menu-icon">{{ item.icon }}</mat-icon>
                }
                <span class="menu-label">{{ item.label }}</span>
              </button>
            }
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .context-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
    }

    .context-menu {
      position: absolute;
      min-width: 160px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
      padding: 6px 0;
      transform-origin: top left;
      opacity: 0;
      transform: scale(0.95);
      transition: opacity 150ms ease-out, transform 150ms ease-out;
    }

    .context-menu.animate-in {
      opacity: 1;
      transform: scale(1);
    }

    .menu-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      text-align: left;
      transition: background-color 100ms;
    }

    .menu-item:hover:not(.disabled) {
      background-color: rgba(0, 0, 0, 0.04);
    }

    .menu-item:active:not(.disabled) {
      background-color: rgba(0, 0, 0, 0.08);
    }

    .menu-item.disabled {
      color: #999;
      cursor: not-allowed;
    }

    .menu-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 12px;
      color: #666;
    }

    .menu-item.disabled .menu-icon {
      color: #bbb;
    }

    .menu-label {
      flex: 1;
    }

    .menu-divider {
      height: 1px;
      background-color: rgba(0, 0, 0, 0.08);
      margin: 6px 0;
    }
  `]
})
export class CanvasContextMenuComponent implements OnChanges {
  private elementRef = inject(ElementRef);

  @Input() state: ContextMenuState = {
    isOpen: false,
    screenPos: { x: 0, y: 0 },
    target: null,
    items: []
  };

  @Output() itemClick = new EventEmitter<ContextMenuItem>();
  @Output() close = new EventEmitter<void>();

  menuPosition: Vec2 = { x: 0, y: 0 };
  isAnimating = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state'] && this.state.isOpen) {
      this.positionMenu();
      // Trigger animation
      this.isAnimating = false;
      requestAnimationFrame(() => {
        this.isAnimating = true;
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state.isOpen) {
      this.close.emit();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    // Close if clicked outside menu
    const menuEl = this.elementRef.nativeElement.querySelector('.context-menu');
    if (menuEl && !menuEl.contains(event.target as Node)) {
      this.close.emit();
    }
  }

  onItemClick(item: ContextMenuItem): void {
    if (!item.disabled && !item.divider) {
      this.itemClick.emit(item);
    }
  }

  private positionMenu(): void {
    const { screenPos } = this.state;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Estimate menu size (will adjust after render)
    const menuWidth = 180;
    const menuHeight = this.state.items.length * 40;

    // Position menu, keeping it within viewport
    let x = screenPos.x;
    let y = screenPos.y;

    // Adjust if too close to right edge
    if (x + menuWidth > viewportWidth - 10) {
      x = viewportWidth - menuWidth - 10;
    }

    // Adjust if too close to bottom edge
    if (y + menuHeight > viewportHeight - 10) {
      y = viewportHeight - menuHeight - 10;
    }

    // Keep minimum distance from edges
    x = Math.max(10, x);
    y = Math.max(10, y);

    this.menuPosition = { x, y };
  }
}
