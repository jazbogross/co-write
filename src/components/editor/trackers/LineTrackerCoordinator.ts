
/**
 * LineTrackerCoordinator.ts - Coordinates the various line tracking components
 * Refactored to delegate responsibilities to smaller, focused components
 */

import { LinePosition } from './LinePosition';
import { UuidPreservationService } from './UuidPreservationService';
import { LineTrackerEventHandler } from './LineTrackerEventHandler';
import { LineTrackerInitializer } from './LineTrackerInitializer';
import { LineTrackerState } from './LineTrackerTypes';
import { 
  EventCoordinator,
  LineTrackerInitializationService,
  UuidOperationsCoordinator
} from './coordinators';

export class LineTrackerCoordinator {
  private quill: any;
  private linePosition: LinePosition;
  private uuidPreservation: UuidPreservationService;
  private eventHandler: LineTrackerEventHandler;
  private initializer: LineTrackerInitializer;
  private cursorManager: any;
  private historyManager: any;
  private state: LineTrackerState;

  // Specialized coordinators
  private eventCoordinator: EventCoordinator;
  private initService: LineTrackerInitializationService;
  private uuidOperations: UuidOperationsCoordinator;

  constructor(
    quill: any,
    cursorManager: any,
    historyManager: any,
    state: LineTrackerState
  ) {
    this.quill = quill;
    this.cursorManager = cursorManager;
    this.historyManager = historyManager;
    this.state = state;
    
    // Initialize components
    this.linePosition = new LinePosition();
    this.uuidPreservation = new UuidPreservationService(quill);
    this.eventHandler = new LineTrackerEventHandler(
      quill,
      this.linePosition,
      this.cursorManager,
      this.uuidPreservation
    );
    this.initializer = new LineTrackerInitializer(
      quill,
      this.linePosition,
      this.uuidPreservation
    );
    
    // Create specialized coordinators
    this.eventCoordinator = new EventCoordinator(
      quill,
      this.eventHandler,
      state,
      (index) => this.getLineUuid(index)
    );
    
    this.initService = new LineTrackerInitializationService(
      quill,
      this.initializer,
      state,
      (index) => this.getLineUuid(index)
    );
    
    this.uuidOperations = new UuidOperationsCoordinator(
      quill,
      this.linePosition,
      this.eventHandler
    );
    
    // Set up event listeners
    this.eventCoordinator.setupEventListeners();
    
    // Initialize with a slight delay
    setTimeout(() => this.initialize(), 300);
  }

  public initialize(): void {
    this.initService.initialize();
  }

  public handleProgrammaticUpdate(value: boolean): void {
    this.uuidOperations.handleProgrammaticUpdate(
      value,
      (index) => this.getLineUuid(index)
    );
  }

  public getLineUuid(oneBasedIndex: number): string | undefined {
    return this.uuidOperations.getLineUuid(oneBasedIndex);
  }

  public setLineUuid(oneBasedIndex: number, uuid: string): void {
    this.uuidOperations.setLineUuid(oneBasedIndex, uuid);
  }

  public getDomUuidMap(): Map<number, string> {
    return this.uuidOperations.getDomUuidMap();
  }

  public refreshLineUuids(lineData: any[]): void {
    this.uuidOperations.refreshLineUuids(lineData);
  }

  public forceRefreshUuids(): void {
    this.initService.forceRefreshUuids();
  }
}
