
/**
 * UuidOperationsCoordinator.ts - Coordinates UUID operations for line tracking
 */

export class UuidOperationsCoordinator {
  private quill: any;
  private linePosition: any;
  private eventHandler: any;

  constructor(
    quill: any,
    linePosition: any,
    eventHandler: any
  ) {
    this.quill = quill;
    this.linePosition = linePosition;
    this.eventHandler = eventHandler;
  }

  /**
   * Get UUID for a line by index
   */
  public getLineUuid(oneBasedIndex: number): string | undefined {
    return this.linePosition.getLineUuid(oneBasedIndex);
  }

  /**
   * Set UUID for a line by index
   */
  public setLineUuid(oneBasedIndex: number, uuid: string): void {
    this.linePosition.setLineUuid(oneBasedIndex, uuid, this.quill);
  }

  /**
   * Get mapping of DOM line indices to UUIDs
   */
  public getDomUuidMap(): Map<number, string> {
    return this.linePosition.getDomUuidMap(this.quill);
  }

  /**
   * Refresh line UUIDs based on provided line data
   */
  public refreshLineUuids(lineData: any[]): void {
    this.eventHandler.refreshLineUuids(lineData);
    
    // Update our linePosition tracking and assign new UUIDs if missing
    for (let i = 0; i < lineData.length; i++) {
      if (lineData[i]) {
        if (!lineData[i].uuid) {
          const newUuid = crypto.randomUUID();
          lineData[i].uuid = newUuid;
          console.log(`UuidOperationsCoordinator - Assigned new UUID for line ${i + 1}: ${newUuid}`);
        }
        this.setLineUuid(i + 1, lineData[i].uuid);
      }
    }
    
    // If there is content, try refreshing again after a delay to catch late updates
    if (lineData.length > 0) {
      setTimeout(() => this.eventHandler.refreshLineUuids(lineData), 200);
    }
  }

  /**
   * Handle programmatic update mode
   */
  public handleProgrammaticUpdate(
    value: boolean, 
    getLineUuid: (index: number) => string | undefined
  ): void {
    this.eventHandler.handleProgrammaticUpdate(value, getLineUuid);
  }
}
