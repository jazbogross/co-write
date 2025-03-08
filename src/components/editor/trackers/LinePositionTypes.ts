
/**
 * LinePositionTypes.ts - Type definitions for line position tracking
 */

export interface LineContentMapping {
  getUuidByContent(content: string): string | undefined;
  mapContentToUuid(content: string, uuid: string): void;
  trackContentHistory(uuid: string, content: string): void;
  hasContentChanged(uuid: string, newContent: string): boolean;
  getContentToUuidMap(): Map<string, string>;
}

export interface LineCountState {
  lastKnownLines: number;
  detectLineCountChanges(quill: any, isProgrammaticUpdate: boolean): void;
  resetLineCount(count: number): void;
  getLineCount(): number;
}

export interface LinePositionState {
  quill: any;
  lineUuidManager: any;
  contentTracker: any;
  countTracker: any;
  uuidRefresher: any;
  initializer: any;
  attributeUpdater: any;
}
