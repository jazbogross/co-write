
/**
 * LinePosition.ts - Handles tracking of line positions and content
 * Refactored to use smaller, focused utility classes
 */

import { LineUuidManager } from './LineUuidManager';
import { LineContentTracker } from './LineContentTracker';
import { LineCountTracker } from './LineCountTracker';
import { LineUuidRefresher } from './LineUuidRefresher';
import { LinePositionInitializer } from './LinePositionInitializer';
import { LineAttributeUpdater } from './LineAttributeUpdater';

export class LinePosition {
  private lineUuidManager = new LineUuidManager();
  private contentTracker = new LineContentTracker();
  private countTracker = new LineCountTracker();
  private uuidRefresher: LineUuidRefresher;
  private initializer: LinePositionInitializer;
  private attributeUpdater: LineAttributeUpdater;
  private quill: any = null;

  constructor() {
    this.uuidRefresher = new LineUuidRefresher(this.lineUuidManager);
    this.initializer = new LinePositionInitializer(this.lineUuidManager, this.contentTracker);
    this.attributeUpdater = new LineAttributeUpdater(this.lineUuidManager, this.contentTracker);
  }

  // Initialize line position tracking
  initialize(quill: any): void {
    this.quill = quill;
    this.uuidRefresher.setQuill(quill);
    
    // Initialize components
    this.initializer.initialize(quill);
    
    // Set initial line count
    const lines = quill.getLines(0);
    this.countTracker.resetLineCount(lines.length);
    
    // Check for missing UUIDs after initialization
    this.uuidRefresher.checkForMissingUuids(lines);
  }

  // Update line index attributes in the DOM
  updateLineIndexAttributes(quill: any, isProgrammaticUpdate: boolean = false): void {
    this.quill = quill;
    this.attributeUpdater.updateLineIndexAttributes(quill, isProgrammaticUpdate);
  }

  // Apply UUIDs from an external data source to the DOM
  applyLineDataUuids(lineData: any[]): number {
    return this.uuidRefresher.applyLineDataUuids(lineData);
  }

  // Detect changes in line count
  detectLineCountChanges(quill: any, isProgrammaticUpdate: boolean = false): void {
    this.quill = quill;
    this.countTracker.detectLineCountChanges(quill, isProgrammaticUpdate);
  }

  // Get UUID for a line by index
  getLineUuid(oneBasedIndex: number): string | undefined {
    return this.lineUuidManager.getLineUuid(oneBasedIndex);
  }

  // Set UUID for a line by index
  setLineUuid(oneBasedIndex: number, uuid: string, quill: any): void {
    this.lineUuidManager.setLineUuid(oneBasedIndex, uuid, quill);
    this.quill = quill;
  }

  // Get content to UUID map
  getContentToUuidMap(): Map<string, string> {
    return this.contentTracker.getContentToUuidMap();
  }

  // Get DOM UUID map
  getDomUuidMap(quill?: any): Map<number, string> {
    return this.lineUuidManager.getDomUuidMap(quill || this.quill);
  }

  // Explicitly refresh all UUIDs from lineData
  refreshLineUuids(lineData: any[]): void {
    this.uuidRefresher.refreshLineUuids(lineData);
  }
}
