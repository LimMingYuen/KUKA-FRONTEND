/**
 * Command Manager Service - Undo/redo stack management
 */

import { Injectable, signal, computed, EventEmitter } from '@angular/core';
import { ICommand } from './base-command';
import { MAX_UNDO_STACK_SIZE, COMMAND_MERGE_WINDOW } from '../core/constants';

@Injectable()
export class CommandManagerService {
  // Undo and redo stacks
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];

  // Signals for reactive state
  private readonly _canUndo = signal(false);
  private readonly _canRedo = signal(false);
  private readonly _lastAction = signal<string>('');

  // Public readonly signals
  public readonly canUndo = this._canUndo.asReadonly();
  public readonly canRedo = this._canRedo.asReadonly();
  public readonly lastAction = this._lastAction.asReadonly();

  // Events
  public readonly onUndo = new EventEmitter<ICommand>();
  public readonly onRedo = new EventEmitter<ICommand>();
  public readonly onChange = new EventEmitter<void>();

  /**
   * Execute a command and add it to the undo stack
   */
  execute(command: ICommand): void {
    // Check if we can merge with the last command
    const lastCommand = this.undoStack[this.undoStack.length - 1];
    if (lastCommand && command.canMerge?.(lastCommand)) {
      // Merge commands instead of adding new
      lastCommand.merge?.(command);
      command.execute();
    } else {
      // Execute and add to stack
      command.execute();
      this.undoStack.push(command);

      // Limit stack size
      if (this.undoStack.length > MAX_UNDO_STACK_SIZE) {
        this.undoStack.shift();
      }
    }

    // Clear redo stack on new action
    this.redoStack = [];

    this.updateState();
    this._lastAction.set(command.description);
    this.onChange.emit();
  }

  /**
   * Undo the last command
   */
  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;

    command.undo();
    this.redoStack.push(command);

    this.updateState();
    this._lastAction.set(`Undo: ${command.description}`);
    this.onUndo.emit(command);
    this.onChange.emit();
  }

  /**
   * Redo the last undone command
   */
  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;

    command.execute();
    this.undoStack.push(command);

    this.updateState();
    this._lastAction.set(`Redo: ${command.description}`);
    this.onRedo.emit(command);
    this.onChange.emit();
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.updateState();
    this._lastAction.set('');
    this.onChange.emit();
  }

  /**
   * Get the number of undoable actions
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of redoable actions
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Get undo stack descriptions (for UI display)
   */
  getUndoHistory(): string[] {
    return this.undoStack.map(cmd => cmd.description);
  }

  /**
   * Get redo stack descriptions (for UI display)
   */
  getRedoHistory(): string[] {
    return this.redoStack.map(cmd => cmd.description);
  }

  /**
   * Undo multiple steps
   */
  undoMultiple(count: number): void {
    const steps = Math.min(count, this.undoStack.length);
    for (let i = 0; i < steps; i++) {
      this.undo();
    }
  }

  /**
   * Redo multiple steps
   */
  redoMultiple(count: number): void {
    const steps = Math.min(count, this.redoStack.length);
    for (let i = 0; i < steps; i++) {
      this.redo();
    }
  }

  /**
   * Begin a transaction (group multiple commands)
   */
  beginTransaction(): TransactionBuilder {
    return new TransactionBuilder(this);
  }

  private updateState(): void {
    this._canUndo.set(this.undoStack.length > 0);
    this._canRedo.set(this.redoStack.length > 0);
  }
}

/**
 * Transaction Builder - Groups multiple commands into one
 */
export class TransactionBuilder {
  private commands: ICommand[] = [];

  constructor(private commandManager: CommandManagerService) {}

  /**
   * Add a command to the transaction (executes immediately)
   */
  add(command: ICommand): this {
    command.execute();
    this.commands.push(command);
    return this;
  }

  /**
   * Commit the transaction as a single undoable action
   */
  commit(description: string): void {
    if (this.commands.length === 0) return;

    // Create a composite command but don't execute (already executed)
    const composite = new TransactionCommand(this.commands, description);
    this.commandManager['undoStack'].push(composite);
    this.commandManager['redoStack'] = [];
    this.commandManager['updateState']();
    this.commandManager['_lastAction'].set(description);
    this.commandManager.onChange.emit();
  }

  /**
   * Rollback the transaction
   */
  rollback(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
    this.commands = [];
  }
}

/**
 * Transaction Command - Internal class for composite undo
 */
class TransactionCommand implements ICommand {
  readonly timestamp: number;

  constructor(
    private commands: ICommand[],
    private _description: string
  ) {
    this.timestamp = Date.now();
  }

  execute(): void {
    // Already executed during transaction
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  get description(): string {
    return this._description;
  }
}
