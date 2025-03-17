
/**
 * LineTrackerInitializationService.ts - Manages initialization of line tracking
 */

import { LineTrackerState } from '../LineTrackerTypes';

export class LineTrackerInitializationService {
  private quill: any;
  private initializer: any;
  private state: LineTrackerState;
  private getLineUuid: (index: number) => string | undefined;

  constructor(
    quill: any,
    initializer: any,
    state: LineTrackerState,
    getLineUuid: (index: number) => string | undefined
  ) {
    this.quill = quill;
    this.initializer = initializer;
    this.state = state;
    this.getLineUuid = getLineUuid;
  }

  /**
   * Initialize line tracking
   */
  public initialize(): void {
    this.delayedInitialize();
  }

  /**
   * Initialize with a delay to ensure editor is ready
   */
  public delayedInitialize(): void {
    console.log('LineTrackerInitializationService - Starting delayed initialization');
    const newState = this.initializer.initialize(
      this.state,
      this.getLineUuid
    );
    
    // Update state
    this.state.isInitialized = newState.isInitialized;
    this.state.initAttempts = newState.initAttempts;
    
    // If not initialized yet and under max attempts, schedule another try
    if (!this.state.isInitialized && this.state.initAttempts < 5) {
      this.scheduleNextInitAttempt();
    }
  }

  /**
   * Schedule the next initialization attempt
   */
  private scheduleNextInitAttempt(): void {
    this.initializer.scheduleInitialization(
      () => this.delayedInitialize(),
      this.state.initAttempts
    );
  }

  /**
   * Perform an immediate initialization attempt
   */
  public forceRefreshUuids(): void {
    this.initializer.forceRefreshUuids(this.getLineUuid);
  }
}
