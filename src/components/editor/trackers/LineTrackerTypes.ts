
/**
 * LineTrackerTypes.ts - Type definitions for line tracking functionality
 */

export interface LineOperation {
  type: string;
  lineIndex: number;
  movedContent?: string;
}

export interface LineUuidOperations {
  getLineUuid(oneBasedIndex: number): string | undefined;
  setLineUuid(oneBasedIndex: number, uuid: string): void;
  getDomUuidMap(): Map<number, string>;
}

export interface LineChangeHistory {
  content: string;
  timestamp: number;
}

export interface LineTrackerState {
  isUpdating: boolean;
  isInitialized: boolean;
  isProgrammaticUpdate: boolean;
  initAttempts: number;
}
