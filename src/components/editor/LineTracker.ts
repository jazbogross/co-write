
// File: src/components/editor/LineTracker.ts

import ReactQuill from 'react-quill';
import { LinePosition } from './trackers/LinePosition';
import { CursorTracker } from './trackers/CursorTracker';
import { ChangeHistory } from './trackers/ChangeHistory';

const Quill = ReactQuill.Quill;

export class LineTracker {
  private quill: any;
  private linePosition: LinePosition;
  private cursorTracker: CursorTracker;
  private changeHistory: ChangeHistory;
  private isUpdating: boolean = false;
  private isInitialized: boolean = false;
  private isProgrammaticUpdate: boolean = false;
  private preservedUuids: Map<number, string> = new Map();

  constructor(quill: any) {
    this.quill = quill;
    this.linePosition = new LinePosition();
    this.cursorTracker = new CursorTracker();
    this.changeHistory = new ChangeHistory();
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
          this.preserveLineUuids();

          // Analyze delta to detect line operations, update line positions, etc.
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, false);
          this.linePosition.detectLineCountChanges(this.quill, false);

          // Restore UUIDs after changes
          this.restoreLineUuids();
          
          // Make sure all lines have UUIDs
          this.ensureAllLinesHaveUuids();
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

  // Preserve line UUIDs before text changes
  private preserveLineUuids() {
    console.log('🔍 LineTracker preserving line UUIDs');
    this.preservedUuids.clear();

    const lines = this.quill.getLines();
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          this.preservedUuids.set(index, uuid);
          console.log(`🔍 Preserved UUID for line ${index + 1}: ${uuid}`);
        }
      }
    });
  }

  // Restore line UUIDs after text changes
  private restoreLineUuids() {
    console.log('🔍 LineTracker restoring line UUIDs');

    const lines = this.quill.getLines();
    let restoredCount = 0;

    lines.forEach((line: any, index: number) => {
      if (line.domNode && this.preservedUuids.has(index)) {
        const uuid = this.preservedUuids.get(index);
        line.domNode.setAttribute('data-line-uuid', uuid || '');
        line.domNode.setAttribute('data-line-index', (index + 1).toString());
        restoredCount++;
      }
    });

    console.log(`🔍 LineTracker restored ${restoredCount} line UUIDs`);
  }
  
  // Ensure all lines have UUIDs
  private ensureAllLinesHaveUuids() {
    console.log('🔍 LineTracker ensuring all lines have UUIDs');
    
    const lines = this.quill.getLines();
    let missingCount = 0;
    let assignedCount = 0;
    
    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      if (!line.domNode.getAttribute('data-line-uuid')) {
        missingCount++;
        
        // Try to get UUID from our tracking class
        const uuid = this.getLineUuid(index + 1);
        
        if (uuid) {
          line.domNode.setAttribute('data-line-uuid', uuid);
          assignedCount++;
          console.log(`🔍 LineTracker assigned UUID ${uuid} to line ${index + 1}`);
        }
      }
    });
    
    if (missingCount > 0) {
      console.log(`🔍 LineTracker found ${missingCount} lines without UUIDs, assigned ${assignedCount}`);
    }
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
    this.ensureAllLinesHaveUuids();
  }

  public setProgrammaticUpdate(value: boolean) {
    console.log(`🔍 LineTracker setProgrammaticUpdate: ${value}`);
    this.isProgrammaticUpdate = value;
    if (value) {
      // If turning on programmatic mode, preserve current UUIDs
      this.preserveLineUuids();
    } else if (this.preservedUuids.size > 0) {
      // When turning off, restore them
      this.restoreLineUuids();
      // Ensure all lines have UUIDs after programmatic updates
      this.ensureAllLinesHaveUuids();
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
}

/**
 * Singleton module definition for line tracking. We mark
 * _lineTrackingModuleRegistered on ReactQuill.Quill to avoid multiple registration.
 */
export const LineTrackingModule = {
  name: 'lineTracking',
  register: function (Quill: any) {
    console.log('🔍 [LineTrackingModule] registering with Quill');

    // If we've already registered, skip
    if ((ReactQuill.Quill as any)._lineTrackingModuleRegistered) {
      console.log('🔍 [LineTrackingModule] already registered, skipping');
      return;
    }

    // Mark as registered
    (ReactQuill.Quill as any)._lineTrackingModuleRegistered = true;

    // Register as a Quill module named 'lineTracking'
    ReactQuill.Quill.register('modules/lineTracking', function (quill: any) {
      console.log('🔍 [LineTrackingModule] initializing new LineTracker for Quill instance');
      const tracker = new LineTracker(quill);
      quill.lineTracking = tracker;
      return tracker;
    });
  },
};
