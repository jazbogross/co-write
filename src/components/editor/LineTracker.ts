
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
    // Track cursor position changes
    this.quill.on('selection-change', (range: any) => {
      if (this.isProgrammaticUpdate) return; // Skip tracking during programmatic updates
      console.log('🔍 LineTracker selection-change event', range ? 'Range exists' : 'Range null');
      this.cursorTracker.trackCursorChange(range, this.quill);
    });

    // Handle text changes
    this.quill.on('text-change', (delta: any) => {
      console.log('🔍 LineTracker text-change event, isProgrammaticUpdate:', this.isProgrammaticUpdate);
      
      if (this.isUpdating) {
        console.log('🔍 LineTracker already updating, skipping this text change');
        return;
      }
      this.isUpdating = true;
      
      try {
        // Skip line tracking operations during programmatic updates
        if (!this.isProgrammaticUpdate) {
          console.log('🔍 LineTracker analyzing non-programmatic text change');
          // Preserve UUIDs before changes
          this.preserveLineUuids();
          
          // Analyze delta to detect line operations
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, this.isProgrammaticUpdate);
          this.linePosition.detectLineCountChanges(this.quill, this.isProgrammaticUpdate);
          
          // Restore UUIDs after changes
          this.restoreLineUuids();
        } else {
          console.log('🔍 LineTracker skipping line tracking for programmatic update');
          // Still update line indices for programmatic updates
          this.linePosition.updateLineIndexAttributes(this.quill, true);
        }
      } finally {
        this.isUpdating = false;
      }
    });
    
    // Initialize UUIDs from DOM on first load
    setTimeout(() => this.initialize(), 300);
  }

  // Preserve line UUIDs before text changes
  private preserveLineUuids() {
    console.log('🔍 LineTracker preserving line UUIDs');
    this.preservedUuids.clear();
    
    const lines = this.quill.getLines(0);
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          this.preservedUuids.set(index, uuid);
          console.log(`🔍 LineTracker preserved UUID for line ${index+1}: ${uuid}`);
        }
      }
    });
  }
  
  // Restore line UUIDs after text changes
  private restoreLineUuids() {
    console.log('🔍 LineTracker restoring line UUIDs');
    
    const lines = this.quill.getLines(0);
    let restoredCount = 0;
    
    // Try to match lines by index first
    lines.forEach((line: any, index: number) => {
      if (line.domNode && this.preservedUuids.has(index)) {
        const uuid = this.preservedUuids.get(index);
        line.domNode.setAttribute('data-line-uuid', uuid || '');
        line.domNode.setAttribute('data-line-index', (index + 1).toString());
        restoredCount++;
      }
    });
    
    console.log(`🔍 LineTracker restored ${restoredCount} UUIDs based on index`);
  }

  public initialize() {
    if (this.isInitialized) {
      console.log('🔍 LineTracker already initialized, skipping');
      return;
    }
    console.log('🔍 LineTracker initializing line UUIDs');
    this.linePosition.initialize(this.quill);
    this.isInitialized = true;
    
    // Ensure all lines have UUIDs
    const lines = this.quill.getLines(0);
    console.log(`🔍 LineTracker initialization: Found ${lines.length} lines`);
    
    let missingUuidCount = 0;
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (!uuid) {
          missingUuidCount++;
        }
      }
    });
    
    console.log(`🔍 LineTracker initialization complete. Missing UUIDs: ${missingUuidCount}`);
  }

  public setProgrammaticUpdate(value: boolean) {
    console.log(`🔍 LineTracker setting programmatic update mode: ${value}`);
    this.isProgrammaticUpdate = value;
    
    // If turning on programmatic mode, preserve UUIDs
    if (value) {
      this.preserveLineUuids();
    } 
    // If turning off programmatic mode, restore UUIDs
    else if (this.preservedUuids.size > 0) {
      this.restoreLineUuids();
    }
  }

  public getLineUuid(oneBasedIndex: number): string | undefined {
    const uuid = this.linePosition.getLineUuid(oneBasedIndex);
    console.log(`🔍 LineTracker getLineUuid for index ${oneBasedIndex}: ${uuid || 'undefined'}`);
    return uuid;
  }

  public setLineUuid(oneBasedIndex: number, uuid: string) {
    console.log(`🔍 LineTracker setLineUuid for index ${oneBasedIndex}: ${uuid}`);
    this.linePosition.setLineUuid(oneBasedIndex, uuid, this.quill);
  }

  public getContentToUuidMap(): Map<string, string> {
    const map = this.linePosition.getContentToUuidMap();
    console.log(`🔍 LineTracker getContentToUuidMap, size: ${map.size}`);
    return map;
  }

  public getDomUuidMap(): Map<number, string> {
    const map = this.linePosition.getDomUuidMap(this.quill);
    console.log(`🔍 LineTracker getDomUuidMap, size: ${map.size}`);
    return map;
  }

  public getLastOperation(): { type: string, lineIndex: number, movedContent?: string } | null {
    const op = this.cursorTracker.getLastOperation();
    console.log(`🔍 LineTracker getLastOperation: ${op ? op.type : 'null'}`);
    return op;
  }

  public getChangeHistory(uuid: string): {content: string, timestamp: number}[] {
    const history = this.changeHistory.getChangeHistory(uuid);
    console.log(`🔍 LineTracker getChangeHistory for ${uuid}, entries: ${history.length}`);
    return history;
  }
}

// Modified module registration with singular instantiation check
export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) {
    console.log('🔍 LineTrackingModule registering with Quill');
    
    // Check if already registered to prevent duplicate registrations
    if (ReactQuill.Quill.import('modules/lineTracking')) {
      console.log('🔍 LineTrackingModule already registered, skipping');
      return;
    }
    
    ReactQuill.Quill.register('modules/lineTracking', function(quill: any) {
      console.log('🔍 Initializing LineTracker for Quill instance');
      const tracker = new LineTracker(quill);
      quill.lineTracking = tracker;
      return tracker;
    });
  }
};
