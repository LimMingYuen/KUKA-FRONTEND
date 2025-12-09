import { Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape, { Core, ElementDefinition, NodeSingular, EventObject } from 'cytoscape';

export interface MissionStepFlowData {
  sequence: number;
  position: string;
  type: string;
  putDown: string;
  passStrategy: string;
  waitingMillis: number;
}

@Component({
  selector: 'app-mission-flowchart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flowchart-container">
      <div *ngIf="!steps() || steps().length === 0" class="empty-state">
        <p>No mission steps to visualize</p>
        <p class="hint">Add mission steps to see the flowchart</p>
      </div>
      <div #cyContainer class="cy-container" [class.hidden]="!steps() || steps().length === 0"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .flowchart-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .cy-container {
      width: 100%;
      height: 100%;
      min-height: 400px;

      &.hidden {
        display: none;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 400px;
      color: #999;

      p {
        margin: 4px 0;

        &.hint {
          font-size: 0.9em;
          color: #bbb;
        }
      }
    }
  `]
})
export class MissionFlowchartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cyContainer', { static: false }) cyContainer!: ElementRef;
  @Input() set missionSteps(value: MissionStepFlowData[]) {
    this.steps.set(value || []);
    if (this.cy) {
      this.renderFlowchart();
    }
  }

  public steps = signal<MissionStepFlowData[]>([]);
  private cy: Core | null = null;

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    // Initialize cytoscape after view is ready
    if (this.steps() && this.steps().length > 0) {
      setTimeout(() => this.initCytoscape(), 0);
    }
  }

  ngOnDestroy(): void {
    if (this.cy) {
      this.cy.destroy();
    }
  }

  private initCytoscape(): void {
    if (!this.cyContainer || !this.cyContainer.nativeElement) {
      return;
    }

    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#ff6f00',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#fff',
            'text-outline-color': '#ff6f00',
            'text-outline-width': 2,
            'font-size': '11px',
            'font-weight': 'bold',
            'width': '200px',
            'height': '70px',
            'shape': 'roundrectangle',
            'border-width': 2,
            'border-color': '#e65100',
            'text-wrap': 'wrap',
            'text-max-width': '190px',
            'text-justification': 'center'
          }
        },
        {
          selector: 'node.start',
          style: {
            'background-color': '#4caf50',
            'text-outline-color': '#4caf50',
            'border-color': '#388e3c',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node.end',
          style: {
            'background-color': '#f44336',
            'text-outline-color': '#f44336',
            'border-color': '#d32f2f',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node.step',
          style: {
            'background-color': '#ff6f00',
            'text-outline-color': '#ff6f00',
            'border-color': '#e65100'
          }
        },
        {
          selector: 'node.qr-code',
          style: {
            'background-color': '#2196f3',
            'text-outline-color': '#2196f3',
            'border-color': '#1976d2'
          }
        },
        {
          selector: 'node.zone',
          style: {
            'background-color': '#9c27b0',
            'text-outline-color': '#9c27b0',
            'border-color': '#7b1fa2'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5
          }
        },
        {
          selector: 'edge.retry',
          style: {
            'line-color': '#ff9800',
            'target-arrow-color': '#ff9800',
            'line-style': 'dashed'
          }
        }
      ],
      layout: {
        name: 'preset'
      },
      minZoom: 0.5,
      maxZoom: 2,
      wheelSensitivity: 0.2
    });

    this.renderFlowchart();
  }

  private renderFlowchart(): void {
    if (!this.cy) return;

    const steps = this.steps();
    if (!steps || steps.length === 0) return;

    const elements: ElementDefinition[] = [];
    const nodeSpacing = 200;
    const startY = 100;

    // Add START node
    elements.push({
      data: { id: 'start', label: 'START' },
      position: { x: 300, y: startY },
      classes: 'start'
    });

    // Add mission steps
    steps.forEach((step, index) => {
      const nodeId = `step-${index}`;
      const yPos = startY + (index + 1) * nodeSpacing;

      // Determine node class based on type
      let nodeClass = 'step';
      if (step.type === 'NODE_POINT') {
        nodeClass = 'qr-code';
      } else if (step.type === 'NODE_AREA') {
        nodeClass = 'zone';
      }

      // Create label with step information (Step, Type, Position - full name)
      const label = `Step ${index + 1}: ${step.type}\n${step.position}`;

      elements.push({
        data: {
          id: nodeId,
          label: label,
          step: step
        },
        position: { x: 300, y: yPos },
        classes: nodeClass
      });

      // Add edge from previous node
      const sourceId = index === 0 ? 'start' : `step-${index - 1}`;
      elements.push({
        data: {
          id: `edge-${index}`,
          source: sourceId,
          target: nodeId
        }
      });

      // Add retry edge if strategy includes RETRY
      if (step.passStrategy && step.passStrategy.includes('RETRY')) {
        elements.push({
          data: {
            id: `retry-${index}`,
            source: nodeId,
            target: nodeId
          },
          classes: 'retry'
        });
      }
    });

    // Add END node
    const endY = startY + (steps.length + 1) * nodeSpacing;
    elements.push({
      data: { id: 'end', label: 'END' },
      position: { x: 300, y: endY },
      classes: 'end'
    });

    // Add final edge
    elements.push({
      data: {
        id: 'edge-end',
        source: `step-${steps.length - 1}`,
        target: 'end'
      }
    });

    // Update graph
    this.cy.elements().remove();
    this.cy.add(elements);

    // Fit to view
    this.cy.fit(undefined, 50);

    // Add tooltips on hover
    this.addTooltips();
  }

  private addTooltips(): void {
    if (!this.cy) return;

    this.cy.nodes('.step, .qr-code, .zone').on('mouseover', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const step = node.data('step') as MissionStepFlowData;

      if (step) {
        const tooltipText = this.createTooltipText(step);
        node.style('label', tooltipText);
      }
    });

    this.cy.nodes('.step, .qr-code, .zone').on('mouseout', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const step = node.data('step') as MissionStepFlowData;

      if (step) {
        const label = `Step ${step.sequence + 1}: ${step.type}\n${step.position}`;
        node.style('label', label);
      }
    });
  }

  private createTooltipText(step: MissionStepFlowData): string {
    const lines = [
      `Step ${step.sequence + 1}`,
      `Type: ${step.type === 'NODE_POINT' ? 'QR Code' : 'Zone'}`,
      `Position: ${step.position}`,
      `Strategy: ${step.passStrategy}`,
      `Rule: ${step.putDown}`,
    ];

    if (step.waitingMillis > 0) {
      lines.push(`Wait: ${step.waitingMillis}ms`);
    }

    return lines.join('\n');
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
