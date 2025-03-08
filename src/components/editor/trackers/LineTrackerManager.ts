
/**
 * LineTrackerManager.ts - Main class for line tracking management
 */

import { LinePosition } from './LinePosition';
import { CursorTracker } from './CursorTracker';
import { ChangeHistory } from './ChangeHistory';
import { UuidPreservationService } from './UuidPreservationService';
import { LineTrackerEventHandler } from './LineTrackerEventHandler';
import { LineTrackerInitializer } from './LineTrackerInitializer';
import { LineOperation, LineChangeHistory, LineTrackerState } from './LineTrackerTypes';

export class LineTrackerManager {
  private quill: any;
  private linePosition: LinePosition;
  private cursorTracker: CursorTracker;
  private changeHistory: ChangeHistory;
  private uuidPreservation: UuidPreservationService;
  private eventHandler: LineTrackerEventHandler;
  private initializer: LineTrackerInitializer;
  
  // State tracking
  private state: LineTrackerState = {
    isUpdating: false,
    isInitialized: false,
    isProgrammaticUpdate: false,
    initAttempts: 0
  };

  constructor(quill: any) {
    this.quill = quill;
    this.linePosition = new LinePosition();
    this.cursorTracker = new CursorTracker();
    this.changeHistory = new ChangeHistory();
    this.uuidPreservation = new UuidPreservationService(quill);
    
    // Create helper classes
    this.eventHandler = new LineTrackerEventHandler(
      quill,
      this.linePosition,
      this.cursorTracker,
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

  // Public API methods

  public initialize(): void {
    this.delayedInitialize();
  }

  public setProgrammaticUpdate(value: boolean): void {
    this.state.isProgrammaticUpdate = value;
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

  public getLastOperation(): LineOperation | null {
    return this.cursorTracker.getLastOperation();
  }

  public getChangeHistory(uuid: string): LineChangeHistory[] {
    return this.changeHistory.getChangeHistory(uuid);
  }
  
  public refreshLineUuids(lineData: any[]): void {
    this.eventHandler.refreshLineUuids(lineData);
    
    // Also update our linePosition tracking
    for (let i = 0; i < lineData.length; i++) {
      if (lineData[i] && lineData[i].uuid) {
        this.setLineUuid(i + 1, lineData[i].uuid);
      }
    }
    
    // If no UUIDs applied and we have lineData, try again after a delay
    if (lineData.length > 0) {
      setTimeout(() => this.eventHandler.refreshLineUuids(lineData), 200);
    }
  }

  public forceRefreshUuids(): void {
    this.initializer.forceRefreshUuids((index) => this.getLineUuid(index));
  }
}
