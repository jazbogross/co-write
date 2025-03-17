
/**
 * EventCoordinator.ts - Coordinates event handling for line tracking
 */

import { LineTrackerState } from '../LineTrackerTypes';

export class EventCoordinator {
  private quill: any;
  private eventHandler: any;
  private state: LineTrackerState;
  private getLineUuid: (index: number) => string | undefined;

  constructor(
    quill: any,
    eventHandler: any,
    state: LineTrackerState,
    getLineUuid: (index: number) => string | undefined
  ) {
    this.quill = quill;
    this.eventHandler = eventHandler;
    this.state = state;
    this.getLineUuid = getLineUuid;
  }

  /**
   * Set up all event listeners for the editor
   */
  public setupEventListeners(): void {
    // Handle cursor position changes
    this.quill.on('selection-change', (range: any) => {
      this.eventHandler.handleSelectionChange(range, this.state);
    });

    // Handle text changes
    this.quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
      this.state.isUpdating = true;
      try {
        console.log('EventCoordinator - text-change delta', delta);
        this.eventHandler.handleTextChange(
          delta, 
          oldDelta, 
          source, 
          this.state,
          this.getLineUuid
        );
      } finally {
        this.state.isUpdating = false;
      }
    });

    // Listen for editor-change to detect when Quill is truly ready
    this.quill.on('editor-change', (eventName: string) => {
      if (!this.state.isInitialized && eventName === 'text-change') {
        this.onEditorChange();
      }
    });
  }

  /**
   * Handle editor change events that indicate editor is ready
   */
  private onEditorChange(): void {
    // This event indicates the editor is ready for initialization
    console.log('EventCoordinator - Editor change event detected, editor may be ready');
  }
}
