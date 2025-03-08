
/**
 * LineTrackerInitializer.ts - Handles initialization of line tracking
 */

import { LineUuidOperations } from './LineTrackerTypes';

export class LineTrackerInitializer {
  private quill: any;
  private uuidPreservation: any;
  private linePosition: any;
  private maxInitAttempts: number = 5;
  
  constructor(
    quill: any, 
    linePosition: any,
    uuidPreservation: any
  ) {
    this.quill = quill;
    this.linePosition = linePosition;
    this.uuidPreservation = uuidPreservation;
  }

  /**
   * Initialize the line tracker with multiple attempts if needed
   */
  public initialize(
    state: { isInitialized: boolean; initAttempts: number },
    getLineUuid: (index: number) => string | undefined
  ): { isInitialized: boolean; initAttempts: number } {
    // If already initialized, skip
    if (state.isInitialized) {
      return state;
    }

    const newState = { ...state };
    newState.initAttempts++;
    
    // Check if editor DOM is ready
    const lines = this.quill.getLines();
    const paragraphs = this.quill.root?.querySelectorAll('p') || [];
    
    if (lines.length !== paragraphs.length || lines.length === 0) {
      // DOM not ready, schedule another attempt if we haven't reached max attempts
      if (newState.initAttempts < this.maxInitAttempts) {
        return newState;
      }
    }

    // Initialize line UUIDs
    this.linePosition.initialize(this.quill);
    newState.isInitialized = true;
    
    // Ensure all lines have UUIDs
    this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
    
    // Force a refresh to make sure all UUIDs are applied properly
    this.forceRefreshUuids(getLineUuid);
    
    return newState;
  }

  /**
   * Force refresh all UUIDs
   */
  public forceRefreshUuids(getLineUuid: (index: number) => string | undefined): void {
    // Get all lines and their current UUIDs
    const lines = this.quill.getLines();
    let missingUuidCount = 0;
    
    // Check each line for UUIDs
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (!uuid) {
          missingUuidCount++;
          
          // Try to get a UUID for this line
          const newUuid = getLineUuid(index + 1);
          if (newUuid) {
            line.domNode.setAttribute('data-line-uuid', newUuid);
            line.domNode.setAttribute('data-line-index', String(index + 1));
          }
        }
      }
    });
  }

  /**
   * Properly schedule delayed initialization
   */
  public scheduleInitialization(
    callback: () => void,
    attemptNumber: number
  ): void {
    const delayMs = 200 * attemptNumber; // Increasing delay for each attempt
    setTimeout(callback, delayMs);
  }
}
