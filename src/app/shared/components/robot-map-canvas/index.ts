/**
 * Robot Map Canvas Module - Exports all public APIs
 */

// Core
export * from './core/canvas-types';
export * from './core/constants';
export { CanvasEngineService } from './core/canvas-engine.service';

// Animation
export * from './animation/spring';
export * from './animation/animated-value';
export { AnimationEngineService } from './animation/animation-engine.service';

// Services
export { ViewportService } from './services/viewport.service';
export { HitTestService } from './services/hit-test.service';
export { InteractionService } from './services/interaction.service';
export { GestureRecognizerService } from './services/gesture-recognizer.service';
export { SelectionManagerService } from './services/selection-manager.service';

// Commands
export * from './commands/base-command';
export { CommandManagerService, TransactionBuilder } from './commands/command-manager.service';

// Renderers
export { BackgroundRenderer } from './renderers/background-renderer';
export { NodeRenderer, type NodeRenderData } from './renderers/node-renderer';
export { ZoneRenderer, type ZoneRenderData } from './renderers/zone-renderer';
export { LineRenderer, type LineRenderData } from './renderers/line-renderer';
export { RobotRenderer, type RobotRenderData } from './renderers/robot-renderer';
export { SelectionRenderer } from './renderers/selection-renderer';

// Components
export { CanvasContextMenuComponent } from './context-menu/context-menu.component';
export { RobotMapCanvasV2Component } from './robot-map-canvas-v2.component';
