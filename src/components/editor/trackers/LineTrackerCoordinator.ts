
/**
 * LineTrackerCoordinator.ts - Coordinates the various line tracking components
 */

import { LinePosition } from './LinePosition';
import { UuidPreservationService } from './UuidPreservationService';
import { LineTrackerEventHandler } from './LineTrackerEventHandler';
import { LineTrackerInitializer } from './LineTrackerInitializer';
import { LineTrackerState } from './LineTrackerTypes';

export class LineTrackerCoordinator {
  private quill: any;
  private linePosition: LinePosition;
  private uuidPreservation: UuidPreservationService;
  private eventHandler: LineTrackerEventHandler;
  private initializer: LineTrackerInitializer;
  private cursorManager: any;
  private historyManager: any;
  private state: LineTrackerState;

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
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Handle cursor position changes
    this.quill.on('selection-change', (range: any) => {
      this.eventHandler.handleSelectionChange(range, this.state);
    });

    // Handle text changes
    this.quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
      this.state.isUpdating = true;
      try {
        console.log('LineTrackerCoordinator - text-change delta', delta);
        this.eventHandler.handleTextChange(
          delta, 
          oldDelta, 
          source, 
          this.state,
          (index) => this.getLineUuid(index)
        );
      } finally {
        this.state.isUpdating = false;
      }
    });

    // Listen for editor-change to detect when Quill is truly ready
    this.quill.on('editor-change', (eventName: string) => {
      if (!this.state.isInitialized && eventName === 'text-change') {
        this.delayedInitialize();
      }
    });

    // Initialize after a small delay
    setTimeout(() => this.delayedInitialize(), 300);
  }

  public initialize(): void {
    this.delayedInitialize();
  }

  private delayedInitialize(): void {
    const newState = this.initializer.initialize(
      this.state,
      (index) => this.getLineUuid(index)
    );
    
    // Update state
    this.state.isInitialized = newState.isInitialized;
    this.state.initAttempts = newState.initAttempts;
    
    // If not initialized yet and under max attempts, schedule another try
    if (!this.state.isInitialized && this.state.initAttempts < 5) {
      this.initializer.scheduleInitialization(
        () => this.delayedInitialize(),
        this.state.initAttempts
      );
    }
  }

  public handleProgrammaticUpdate(value: boolean): void {
    this.eventHandler.handleProgrammaticUpdate(
      value,
      (index) => this.getLineUuid(index)
    );
  }

  public getLineUuid(oneBasedIndex: number): string | undefined {
    return this.linePosition.getLineUuid(oneBasedIndex);
  }

  public setLineUuid(oneBasedIndex: number, uuid: string): void {
    this.linePosition.setLineUuid(oneBasedIndex, uuid, this.quill);
  }

  public getDomUuidMap(): Map<number, string> {
    return this.linePosition.getDomUuidMap(this.quill);
  }

  public refreshLineUuids(lineData: any[]): void {
    this.eventHandler.refreshLineUuids(lineData);
    
    // Update our linePosition tracking and assign new UUIDs if missing
    for (let i = 0; i < lineData.length; i++) {
      if (lineData[i]) {
        if (!lineData[i].uuid) {
          const newUuid = crypto.randomUUID();
          lineData[i].uuid = newUuid;
          console.log(`LineTrackerCoordinator - Assigned new UUID for line ${i + 1}: ${newUuid}`);
        }
        this.setLineUuid(i + 1, lineData[i].uuid);
      }
    }
    
    // If there is content, try refreshing again after a delay to catch late updates
    if (lineData.length > 0) {
      setTimeout(() => this.eventHandler.refreshLineUuids(lineData), 200);
    }
  }

  public forceRefreshUuids(): void {
    this.initializer.forceRefreshUuids((index) => this.getLineUuid(index));
  }
}
