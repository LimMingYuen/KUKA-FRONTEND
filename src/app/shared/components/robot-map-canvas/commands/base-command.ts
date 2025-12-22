/**
 * Base Command - Abstract interface for undo/redo commands
 */

import { WritableSignal } from '@angular/core';
import { CustomNode, CustomZone, CustomLine, Point } from '../../../../models/robot-monitoring.models';

/**
 * Interface for all commands
 */
export interface ICommand {
  execute(): void;
  undo(): void;
  readonly description: string;
  readonly timestamp: number;
  canMerge?(other: ICommand): boolean;
  merge?(other: ICommand): void;
}

/**
 * Abstract base class for commands
 */
export abstract class BaseCommand implements ICommand {
  readonly timestamp: number;

  constructor() {
    this.timestamp = Date.now();
  }

  abstract execute(): void;
  abstract undo(): void;
  abstract get description(): string;

  canMerge(other: ICommand): boolean {
    return false;
  }

  merge(other: ICommand): void {
    // Default: do nothing
  }
}

/**
 * Add Node Command
 */
export class AddNodeCommand extends BaseCommand {
  constructor(
    private nodesSignal: WritableSignal<CustomNode[]>,
    private node: CustomNode
  ) {
    super();
  }

  override execute(): void {
    this.nodesSignal.update(nodes => [...nodes, this.node]);
  }

  override undo(): void {
    this.nodesSignal.update(nodes => nodes.filter(n => n.id !== this.node.id));
  }

  override get description(): string {
    return `Add node "${this.node.label}"`;
  }
}

/**
 * Move Node Command
 */
export class MoveNodeCommand extends BaseCommand {
  private previousX: number;
  private previousY: number;

  constructor(
    private nodesSignal: WritableSignal<CustomNode[]>,
    private nodeId: string,
    previousX: number,
    previousY: number,
    private newX: number,
    private newY: number
  ) {
    super();
    this.previousX = previousX;
    this.previousY = previousY;
  }

  override execute(): void {
    this.nodesSignal.update(nodes =>
      nodes.map(n =>
        n.id === this.nodeId ? { ...n, x: this.newX, y: this.newY } : n
      )
    );
  }

  override undo(): void {
    this.nodesSignal.update(nodes =>
      nodes.map(n =>
        n.id === this.nodeId ? { ...n, x: this.previousX, y: this.previousY } : n
      )
    );
  }

  override get description(): string {
    return `Move node`;
  }

  override canMerge(other: ICommand): boolean {
    if (!(other instanceof MoveNodeCommand)) return false;
    return other.nodeId === this.nodeId && (other.timestamp - this.timestamp) < 500;
  }

  override merge(other: ICommand): void {
    if (other instanceof MoveNodeCommand) {
      this.newX = other.newX;
      this.newY = other.newY;
    }
  }
}

/**
 * Delete Node Command
 */
export class DeleteNodeCommand extends BaseCommand {
  private deletedNode: CustomNode | null = null;
  private deletedLines: CustomLine[] = [];

  constructor(
    private nodesSignal: WritableSignal<CustomNode[]>,
    private linesSignal: WritableSignal<CustomLine[]>,
    private nodeId: string
  ) {
    super();
  }

  override execute(): void {
    // Find and store node before deleting
    const nodes = this.nodesSignal();
    this.deletedNode = nodes.find(n => n.id === this.nodeId) || null;

    // Find and store connected lines
    const lines = this.linesSignal();
    this.deletedLines = lines.filter(
      l => l.fromNodeId === this.nodeId || l.toNodeId === this.nodeId
    );

    // Delete node
    this.nodesSignal.update(nodes => nodes.filter(n => n.id !== this.nodeId));

    // Delete connected lines
    this.linesSignal.update(lines =>
      lines.filter(l => l.fromNodeId !== this.nodeId && l.toNodeId !== this.nodeId)
    );
  }

  override undo(): void {
    // Restore node
    if (this.deletedNode) {
      this.nodesSignal.update(nodes => [...nodes, this.deletedNode!]);
    }

    // Restore lines
    if (this.deletedLines.length > 0) {
      this.linesSignal.update(lines => [...lines, ...this.deletedLines]);
    }
  }

  override get description(): string {
    return `Delete node`;
  }
}

/**
 * Add Zone Command
 */
export class AddZoneCommand extends BaseCommand {
  constructor(
    private zonesSignal: WritableSignal<CustomZone[]>,
    private zone: CustomZone
  ) {
    super();
  }

  override execute(): void {
    this.zonesSignal.update(zones => [...zones, this.zone]);
  }

  override undo(): void {
    this.zonesSignal.update(zones => zones.filter(z => z.id !== this.zone.id));
  }

  override get description(): string {
    return `Add zone "${this.zone.name}"`;
  }
}

/**
 * Delete Zone Command
 */
export class DeleteZoneCommand extends BaseCommand {
  private deletedZone: CustomZone | null = null;

  constructor(
    private zonesSignal: WritableSignal<CustomZone[]>,
    private zoneId: string
  ) {
    super();
  }

  override execute(): void {
    const zones = this.zonesSignal();
    this.deletedZone = zones.find(z => z.id === this.zoneId) || null;
    this.zonesSignal.update(zones => zones.filter(z => z.id !== this.zoneId));
  }

  override undo(): void {
    if (this.deletedZone) {
      this.zonesSignal.update(zones => [...zones, this.deletedZone!]);
    }
  }

  override get description(): string {
    return `Delete zone`;
  }
}

/**
 * Edit Zone Vertex Command
 */
export class EditZoneVertexCommand extends BaseCommand {
  private previousPoints: Point[];

  constructor(
    private zonesSignal: WritableSignal<CustomZone[]>,
    private zoneId: string,
    previousPoints: Point[],
    private newPoints: Point[]
  ) {
    super();
    this.previousPoints = [...previousPoints];
  }

  override execute(): void {
    this.zonesSignal.update(zones =>
      zones.map(z =>
        z.id === this.zoneId ? { ...z, points: this.newPoints } : z
      )
    );
  }

  override undo(): void {
    this.zonesSignal.update(zones =>
      zones.map(z =>
        z.id === this.zoneId ? { ...z, points: this.previousPoints } : z
      )
    );
  }

  override get description(): string {
    return `Edit zone vertices`;
  }

  override canMerge(other: ICommand): boolean {
    if (!(other instanceof EditZoneVertexCommand)) return false;
    return other.zoneId === this.zoneId && (other.timestamp - this.timestamp) < 500;
  }

  override merge(other: ICommand): void {
    if (other instanceof EditZoneVertexCommand) {
      this.newPoints = other.newPoints;
    }
  }
}

/**
 * Add Line Command
 */
export class AddLineCommand extends BaseCommand {
  constructor(
    private linesSignal: WritableSignal<CustomLine[]>,
    private line: CustomLine
  ) {
    super();
  }

  override execute(): void {
    this.linesSignal.update(lines => [...lines, this.line]);
  }

  override undo(): void {
    this.linesSignal.update(lines => lines.filter(l => l.id !== this.line.id));
  }

  override get description(): string {
    return `Add line`;
  }
}

/**
 * Delete Line Command
 */
export class DeleteLineCommand extends BaseCommand {
  private deletedLine: CustomLine | null = null;

  constructor(
    private linesSignal: WritableSignal<CustomLine[]>,
    private lineId: string
  ) {
    super();
  }

  override execute(): void {
    const lines = this.linesSignal();
    this.deletedLine = lines.find(l => l.id === this.lineId) || null;
    this.linesSignal.update(lines => lines.filter(l => l.id !== this.lineId));
  }

  override undo(): void {
    if (this.deletedLine) {
      this.linesSignal.update(lines => [...lines, this.deletedLine!]);
    }
  }

  override get description(): string {
    return `Delete line`;
  }
}

/**
 * Composite Command (for multiple actions as one)
 */
export class CompositeCommand extends BaseCommand {
  constructor(
    private commands: ICommand[],
    private _description: string
  ) {
    super();
  }

  override execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  override undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  override get description(): string {
    return this._description;
  }
}
