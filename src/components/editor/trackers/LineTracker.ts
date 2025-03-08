
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
  private initAttempts: number = 0;
  private maxInitAttempts: number = 5;

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

    // Listen for editor-change to detect when Quill is truly ready
    this.quill.on('editor-change', (eventName: string) => {
      if (!this.isInitialized && eventName === 'text-change') {
        console.log('🔍 LineTracker detected first text-change, editor ready for initialization');
        this.delayedInitialize();
      }
    });

    // Initialize after a small delay
    setTimeout(() => this.delayedInitialize(), 300);
  }

  private delayedInitialize() {
    if (this.isInitialized) {
      console.log('🔍 LineTracker already initialized, skipping');
      return;
    }

    this.initAttempts++;
    console.log(`🔍 LineTracker initialization attempt #${this.initAttempts}`);

    // Check if editor DOM is ready
    const lines = this.quill.getLines();
    const paragraphs = this.quill.root?.querySelectorAll('p') || [];
    
    if (lines.length !== paragraphs.length || lines.length === 0) {
      console.log(`🔍 LineTracker DOM not ready (lines: ${lines.length}, paragraphs: ${paragraphs.length})`);
      
      // Schedule another attempt if we haven't reached max attempts
      if (this.initAttempts < this.maxInitAttempts) {
        const delayMs = 200 * this.initAttempts; // Increasing delay for each attempt
        console.log(`🔍 LineTracker scheduling retry in ${delayMs}ms`);
        setTimeout(() => this.delayedInitialize(), delayMs);
        return;
      } else {
        console.warn(`🔍 LineTracker giving up after ${this.initAttempts} attempts, proceeding anyway`);
      }
    }

    console.log('🔍 LineTracker initializing line UUIDs');
    this.linePosition.initialize(this.quill);
    this.isInitialized = true;

    // Optionally, check how many lines are found initially
    console.log(`🔍 Found ${lines.length} lines on initialize`);
    
    // Ensure all lines have UUIDs
    this.uuidPreservation.ensureAllLinesHaveUuids(
      (index) => this.getLineUuid(index)
    );

    // Force a refresh to make sure all UUIDs are applied properly
    this.forceRefreshUuids();
  }

  public forceRefreshUuids() {
    console.log('🔍 LineTracker forcing refresh of all UUIDs');
    
    // Get all lines and their current UUIDs
    const lines = this.quill.getLines();
    console.log(`🔍 LineTracker refresh found ${lines.length} lines`);
    
    let missingUuidCount = 0;
    
    // Check each line for UUIDs
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (!uuid) {
          missingUuidCount++;
          
          // Try to get a UUID for this line
          const newUuid = this.getLineUuid(index + 1);
          if (newUuid) {
            line.domNode.setAttribute('data-line-uuid', newUuid);
            line.domNode.setAttribute('data-line-index', String(index + 1));
            console.log(`🔍 LineTracker applied missing UUID ${newUuid} to line ${index + 1}`);
          }
        }
      }
    });
    
    if (missingUuidCount > 0) {
      console.log(`🔍 LineTracker found and fixed ${missingUuidCount} lines with missing UUIDs`);
    }
  }

  public initialize() {
    this.delayedInitialize();
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
    
    // Check for line count mismatch
    if (lines.length !== lineData.length) {
      console.log(`🔍 LineTracker line count mismatch - editor has ${lines.length} lines, lineData has ${lineData.length} lines`);
    }
    
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
          
          // Also update our linePosition tracking
          this.setLineUuid(i + 1, newUuid);
          
          appliedCount++;
        }
      }
    }
    
    console.log(`🔍 LineTracker applied ${appliedCount} UUIDs to editor lines`);
    
    if (appliedCount === 0 && lineData.length > 0) {
      console.log('🔍 LineTracker no UUIDs applied, scheduling a retry in 200ms');
      setTimeout(() => this.refreshLineUuids(lineData), 200);
    }
  }
}
