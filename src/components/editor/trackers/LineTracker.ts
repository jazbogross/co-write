
// File: src/components/editor/trackers/LineTracker.ts

import { LinePosition } from './LinePosition';
import { CursorTracker } from './CursorTracker';
import { ChangeHistory } from './ChangeHistory';
import { UuidPreservationService } from './UuidPreservationService';

export class LineTracker {
  private quill: any;
  private linePosition: LinePosition;
  private cursorTracker: CursorTracker;
  private changeHistory: ChangeHistory;
  private uuidPreservation: UuidPreservationService;
  private isUpdating: boolean = false;
  private isInitialized: boolean = false;
  private isProgrammaticUpdate: boolean = false;

  constructor(quill: any) {
    this.quill = quill;
    this.linePosition = new LinePosition();
    this.cursorTracker = new CursorTracker();
    this.changeHistory = new ChangeHistory();
    this.uuidPreservation = new UuidPreservationService(quill);
    console.log('🔍 LineTracker constructor initialized');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Handle cursor position changes
    this.quill.on('selection-change', (range: any) => {
      if (this.isProgrammaticUpdate) return; // Skip tracking during programmatic updates
      console.log('🔍 LineTracker selection-change event', range ? 'Range exists' : 'Range null');
      this.cursorTracker.trackCursorChange(range, this.quill);
    });

    // Handle text changes
    this.quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
      console.log('🔍 LineTracker text-change event, isProgrammaticUpdate:', this.isProgrammaticUpdate, 'source:', source);

      if (this.isUpdating) {
        console.log('🔍 LineTracker is already updating, skipping');
        return;
      }
      this.isUpdating = true;

      try {
        // Skip line tracking operations if it's a programmatic update
        if (!this.isProgrammaticUpdate) {
          console.log('🔍 LineTracker analyzing user-driven text change');
          // Preserve UUIDs before changes
          this.uuidPreservation.preserveLineUuids();

          // Analyze delta to detect line operations, update line positions, etc.
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, false);
          this.linePosition.detectLineCountChanges(this.quill, false);

          // Restore UUIDs after changes
          this.uuidPreservation.restoreLineUuids();
          
          // Make sure all lines have UUIDs
          this.uuidPreservation.ensureAllLinesHaveUuids(
            (index) => this.getLineUuid(index)
          );
        } else {
          console.log('🔍 LineTracker skipping line tracking for programmatic update');
          // Still update line indices
          this.linePosition.updateLineIndexAttributes(this.quill, true);
        }
      } finally {
        this.isUpdating = false;
      }
    });

    // Initialize after a small delay
    setTimeout(() => this.initialize(), 300);
  }

  public initialize() {
    if (this.isInitialized) {
      console.log('🔍 LineTracker already initialized, skipping');
      return;
    }
    console.log('🔍 LineTracker initializing line UUIDs');
    this.linePosition.initialize(this.quill);
    this.isInitialized = true;

    // Optionally, check how many lines are found initially
    const lines = this.quill.getLines();
    console.log(`🔍 Found ${lines.length} lines on initialize`);
    
    // Ensure all lines have UUIDs
    this.uuidPreservation.ensureAllLinesHaveUuids(
      (index) => this.getLineUuid(index)
    );
  }

  public setProgrammaticUpdate(value: boolean) {
    console.log(`🔍 LineTracker setProgrammaticUpdate: ${value}`);
    this.isProgrammaticUpdate = value;
    if (value) {
      // If turning on programmatic mode, preserve current UUIDs
      this.uuidPreservation.preserveLineUuids();
    } else if (this.uuidPreservation.hasPreservedUuids()) {
      // When turning off, restore them
      this.uuidPreservation.restoreLineUuids();
      // Ensure all lines have UUIDs after programmatic updates
      this.uuidPreservation.ensureAllLinesHaveUuids(
        (index) => this.getLineUuid(index)
      );
    }
  }

  // Get UUID for a specific line index
  public getLineUuid(oneBasedIndex: number): string | undefined {
    return this.linePosition.getLineUuid(oneBasedIndex);
  }

  // Set UUID for a specific line
  public setLineUuid(oneBasedIndex: number, uuid: string) {
    this.linePosition.setLineUuid(oneBasedIndex, uuid, this.quill);
  }

  // Get mapping of line indices to UUIDs from DOM
  public getDomUuidMap(): Map<number, string> {
    return this.linePosition.getDomUuidMap(this.quill);
  }

  // Get last operation
  public getLastOperation(): { type: string; lineIndex: number; movedContent?: string } | null {
    return this.cursorTracker.getLastOperation();
  }

  // Get change history for a UUID
  public getChangeHistory(uuid: string): { content: string; timestamp: number }[] {
    return this.changeHistory.getChangeHistory(uuid);
  }
  
  // Refresh UUIDs from lineData
  public refreshLineUuids(lineData: any[]) {
    console.log('🔍 LineTracker refreshing UUIDs from lineData');
    console.log('🔍 LineTracker received', lineData.length, 'lines to refresh');
    
    // Make sure all lines in the editor match the UUIDs from lineData
    const lines = this.quill.getLines();
    console.log('🔍 LineTracker found', lines.length, 'lines in editor');
    
    // Log first few lines from editor and lineData
    lineData.slice(0, 3).forEach((line, i) => {
      console.log(`🔍 LineTracker lineData line ${i+1}: uuid=${line.uuid}, lineNumber=${line.lineNumber}`);
    });
    
    // Map each line in the editor to the corresponding lineData by position
    let appliedCount = 0;
    for (let i = 0; i < Math.min(lines.length, lineData.length); i++) {
      const line = lines[i];
      const lineDataItem = lineData[i];
      
      if (line.domNode && lineDataItem && lineDataItem.uuid) {
        const currentUuid = line.domNode.getAttribute('data-line-uuid');
        const newUuid = lineDataItem.uuid;
        
        // Apply the UUID if it's different or missing
        if (currentUuid !== newUuid) {
          line.domNode.setAttribute('data-line-uuid', newUuid);
          line.domNode.setAttribute('data-line-index', String(i + 1));
          console.log(`🔍 LineTracker applied UUID ${newUuid} to line ${i+1} in editor`);
          appliedCount++;
        }
      }
    }
    
    console.log(`🔍 LineTracker applied ${appliedCount} UUIDs to editor lines`);
    
    if (this.linePosition && typeof this.linePosition.refreshLineUuids === 'function') {
      this.linePosition.refreshLineUuids(lineData);
    } else {
      console.error('🔍 LineTracker missing linePosition or refreshLineUuids method');
    }
  }
}
