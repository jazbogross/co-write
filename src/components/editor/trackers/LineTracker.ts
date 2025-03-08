
// File: src/components/editor/trackers/LineTracker.ts

import { LineTrackerManager } from './LineTrackerManager';

/**
 * LineTracker - Main entry point for line tracking functionality
 * This class maintains the original API while delegating to the new refactored components
 */
export class LineTracker {
  private manager: LineTrackerManager;

  constructor(quill: any) {
    this.manager = new LineTrackerManager(quill);
  }

  // Public API methods - these maintain the original interface

  public initialize(): void {
    this.manager.initialize();
  }

  public setProgrammaticUpdate(value: boolean): void {
    this.manager.setProgrammaticUpdate(value);
  }

  public getLineUuid(oneBasedIndex: number): string | undefined {
    return this.manager.getLineUuid(oneBasedIndex);
  }

  public setLineUuid(oneBasedIndex: number, uuid: string): void {
    this.manager.setLineUuid(oneBasedIndex, uuid);
  }

  public getDomUuidMap(): Map<number, string> {
    return this.manager.getDomUuidMap();
  }

  public getLastOperation(): { type: string; lineIndex: number; movedContent?: string } | null {
    return this.manager.getLastOperation();
  }

  public getChangeHistory(uuid: string): { content: string; timestamp: number }[] {
    return this.manager.getChangeHistory(uuid);
  }
  
  public refreshLineUuids(lineData: any[]): void {
    this.manager.refreshLineUuids(lineData);
  }

  public forceRefreshUuids(): void {
    this.manager.forceRefreshUuids();
  }
}
