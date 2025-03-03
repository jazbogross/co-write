
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
          // Analyze delta to detect line operations
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, this.isProgrammaticUpdate);
          this.linePosition.detectLineCountChanges(this.quill, this.isProgrammaticUpdate);
        } else {
          console.log('🔍 LineTracker skipping line tracking for programmatic update');
        }
      } finally {
        this.isUpdating = false;
      }
    });
    
    // Initialize UUIDs from DOM on first load
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
    console.log('🔍 LineTracker initialization complete');
  }

  public setProgrammaticUpdate(value: boolean) {
    console.log(`🔍 LineTracker setting programmatic update mode: ${value}`);
    this.isProgrammaticUpdate = value;
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

// Modified module registration
export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) { // This Quill is no longer needed.
    console.log('🔍 LineTrackingModule registering with Quill');
    ReactQuill.Quill.register('modules/lineTracking', function(quill: any) { // This is now correct.
      console.log('🔍 Initializing LineTracker for Quill instance');
      const tracker = new LineTracker(quill);

      quill.lineTracking = tracker;

      return tracker;
    });
  }
};
