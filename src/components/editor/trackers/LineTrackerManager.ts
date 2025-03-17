
/**
 * LineTrackerManager.ts - Main class for line tracking management
 * Refactored to use smaller, focused components
 */

import { LineTrackerState } from './LineTrackerTypes';
import { LineTrackerCoordinator } from './LineTrackerCoordinator';
import { CursorPositionManager } from './CursorPositionManager';
import { LineHistoryManager } from './LineHistoryManager';

export class LineTrackerManager {
  private coordinator: LineTrackerCoordinator;
  private cursorManager: CursorPositionManager;
  private historyManager: LineHistoryManager;
  
  // State tracking (maintained here for backward compatibility)
  private state: LineTrackerState = {
    isUpdating: false,
    isInitialized: false,
    isProgrammaticUpdate: false,
    initAttempts: 0
  };

  constructor(quill: any) {
    this.cursorManager = new CursorPositionManager(quill);
    this.historyManager = new LineHistoryManager();
    this.coordinator = new LineTrackerCoordinator(
      quill,
      this.cursorManager,
      this.historyManager,
      this.state
    );
  }

  // Public API methods

  public initialize(): void {
    this.coordinator.initialize();
  }

  public setProgrammaticUpdate(value: boolean): void {
    this.state.isProgrammaticUpdate = value;
    this.coordinator.handleProgrammaticUpdate(value);
  }

  public getLineUuid(oneBasedIndex: number): string | undefined {
    return this.coordinator.getLineUuid(oneBasedIndex);
  }

  public setLineUuid(oneBasedIndex: number, uuid: string): void {
    console.log(`LineTrackerManager - setLineUuid(${oneBasedIndex}, ${uuid})`);
    this.coordinator.setLineUuid(oneBasedIndex, uuid);
  }

  public getDomUuidMap(): Map<number, string> {
    return this.coordinator.getDomUuidMap();
  }

  public getLastOperation(): { type: string, lineIndex: number, movedContent?: string } | null {
    return this.cursorManager.getLastOperation();
  }

  public getChangeHistory(uuid: string): { content: string, timestamp: number }[] {
    return this.historyManager.getChangeHistory(uuid);
  }
  
  /**
   * Modified refreshLineUuids: if a line in lineData does not have a UUID, generate one and then set it.
   */
  public refreshLineUuids(lineData: any[]): void {
    this.coordinator.refreshLineUuids(lineData);
  }

  public forceRefreshUuids(): void {
    this.coordinator.forceRefreshUuids();
  }
  
  // Cursor position handling
  public saveCursorPosition(): void {
    this.cursorManager.saveCursorPosition();
  }
  
  public restoreCursorPosition(): void {
    this.cursorManager.restoreCursorPosition();
  }
}
