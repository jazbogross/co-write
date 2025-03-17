
/**
 * SelectionChangeHandler.ts - Handles selection change events
 */

import { LineTrackerState } from '../LineTrackerTypes';

export class SelectionChangeHandler {
  /**
   * Handle cursor position changes
   */
  public static handleSelectionChange(
    range: any,
    state: LineTrackerState,
    cursorTracker: any,
    quill: any
  ): void {
    if (state.isProgrammaticUpdate) return;
    cursorTracker.trackCursorChange(range, quill);
  }
}
