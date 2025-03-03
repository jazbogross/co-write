
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

  constructor(quill: any) {
    this.quill = quill;
    this.linePosition = new LinePosition();
    this.cursorTracker = new CursorTracker();
    this.changeHistory = new ChangeHistory();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Track cursor position changes
    this.quill.on('selection-change', (range: any) => {
      this.cursorTracker.trackCursorChange(range, this.quill);
    });

    // Handle text changes
    this.quill.on('text-change', (delta: any) => {
      if (this.isUpdating) return;
      this.isUpdating = true;
      
      try {
        // Analyze delta to detect line operations
        this.cursorTracker.analyzeTextChange(delta, this.quill);
        this.linePosition.updateLineIndexAttributes(this.quill);
        this.linePosition.detectLineCountChanges(this.quill);
      } finally {
        this.isUpdating = false;
      }
    });
    
    // Initialize UUIDs from DOM on first load
    setTimeout(() => this.initialize(), 300);
  }

  public initialize() {
    if (this.isInitialized) return;
    this.linePosition.initialize(this.quill);
    this.isInitialized = true;
  }

  public getLineUuid(oneBasedIndex: number): string | undefined {
    return this.linePosition.getLineUuid(oneBasedIndex);
  }

  public setLineUuid(oneBasedIndex: number, uuid: string) {
    this.linePosition.setLineUuid(oneBasedIndex, uuid, this.quill);
  }

  public getContentToUuidMap(): Map<string, string> {
    return this.linePosition.getContentToUuidMap();
  }

  public getDomUuidMap(): Map<number, string> {
    return this.linePosition.getDomUuidMap(this.quill);
  }

  public getLastOperation(): { type: string, lineIndex: number, movedContent?: string } | null {
    return this.cursorTracker.getLastOperation();
  }

  public getChangeHistory(uuid: string): {content: string, timestamp: number}[] {
    return this.changeHistory.getChangeHistory(uuid);
  }
}

// Modified module registration
export const LineTrackingModule = {
  name: 'lineTracking',
  register: function(Quill: any) {
    Quill.register('modules/lineTracking', function(quill: any) {
      const tracker = new LineTracker(quill);
      
      quill.lineTracking = tracker;
      
      return tracker;
    });
  }
};
