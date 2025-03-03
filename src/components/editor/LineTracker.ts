
import ReactQuill from 'react-quill';
const Quill = ReactQuill.Quill;

export class LineTracker {
  private quill: any;
  private lineUuids: Map<number, string> = new Map();
  private contentToUuid: Map<string, string> = new Map();
  private isUpdating: boolean = false;
  private isInitialized: boolean = false;
  private lastKnownLines: number = 0;
  private changeHistory: Map<string, {content: string, timestamp: number}[]> = new Map();
  private changeHistoryLimit: number = 5;
  private contentHistory: Map<string, string> = new Map();
  private lastCursorPosition: { index: number, line: number } | null = null;
  private lastOperation: { type: string, lineIndex: number, movedContent?: string } | null = null;

  constructor(quill: any) {
    this.quill = quill;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Track cursor position changes
    this.quill.on('selection-change', (range: any) => {
      if (range) {
        const lineIndex = this.getLineIndexFromPosition(range.index);
        this.lastCursorPosition = {
          index: range.index,
          line: lineIndex
        };
      }
    });

    // Handle text changes
    this.quill.on('text-change', (delta: any) => {
      if (this.isUpdating) return;
      this.isUpdating = true;
      
      try {
        // Analyze delta to detect line operations
        this.analyzeTextChange(delta);
        this.updateLineIndexAttributes();
        this.detectLineCountChanges();
      } finally {
        this.isUpdating = false;
      }
    });
    
    // Initialize UUIDs from DOM on first load
    setTimeout(() => this.initialize(), 300);
  }

  private getLineIndexFromPosition(position: number): number {
    const [line] = this.quill.getLeaf(position);
    if (!line) return 0;
    
    const lines = this.quill.getLines(0);
    return lines.findIndex((l: any) => l === line.parent);
  }

  private analyzeTextChange(delta: any): void {
    // Reset last operation
    this.lastOperation = null;
    
    if (!delta || !delta.ops || !this.lastCursorPosition) return;
    
    // Check for "\n" insertion (Enter key press)
    const isEnterPress = delta.ops.some((op: any) => 
      op.insert && op.insert === "\n"
    );
    
    if (isEnterPress) {
      const cursorLineIndex = this.lastCursorPosition.line;
      const cursorPosition = this.lastCursorPosition.index;
      const lines = this.quill.getLines(0);
      
      if (cursorLineIndex >= 0 && cursorLineIndex < lines.length) {
        const line = lines[cursorLineIndex];
        const lineStart = this.quill.getIndex(line);
        
        // Check if cursor was at position 0 of the line
        if (cursorPosition === lineStart) {
          const lineContent = this.getLineContent(line);
          
          this.lastOperation = {
            type: 'enter-at-position-0',
            lineIndex: cursorLineIndex,
            movedContent: lineContent
          };
          
          console.log(`**** LineTracker **** Detected Enter at position 0 of line ${cursorLineIndex + 1}`);
          console.log(`**** LineTracker **** Content "${lineContent}" will move to line ${cursorLineIndex + 2}`);
        }
      }
    }
  }

  public initialize() {
    if (this.isInitialized) return;
    console.log('**** LineTracker **** Initializing line tracking');
    
    const lines = this.quill.getLines(0);
    this.lastKnownLines = lines.length;
    
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          this.lineUuids.set(index, uuid);
          const content = this.getLineContent(line);
          
          // Track content in both directions
          this.contentToUuid.set(content, uuid);
          this.contentHistory.set(uuid, content);
          
          console.log(`**** LineTracker **** Mapped line ${index + 1} to UUID ${uuid}`);
        }
      }
    });
    
    this.isInitialized = true;
  }

  private getLineContent(line: any): string {
    return line.cache?.delta?.ops?.[0]?.insert || '';
  }

  private updateLineIndexAttributes() {
    const lines = this.quill.getLines(0);
    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      // Always update the index attribute to reflect the current position
      const oneBasedIndex = index + 1;
      const currentIndex = line.domNode.getAttribute('data-line-index');
      if (currentIndex !== String(oneBasedIndex)) {
        line.domNode.setAttribute('data-line-index', String(oneBasedIndex));
      }
      
      // Read the UUID from DOM and update our maps
      const uuid = line.domNode.getAttribute('data-line-uuid');
      if (uuid) {
        const content = this.getLineContent(line);
        const previousContent = this.contentHistory.get(uuid);
        
        // Update our position-based map
        this.lineUuids.set(index, uuid);
        
        // Update content mapping if needed
        if (content && content.trim() !== '') {
          // Track historical association so we can find lines that move
          this.contentHistory.set(uuid, content);
          
          // If content changed, update the content-to-UUID map
          if (content !== previousContent) {
            this.contentToUuid.set(content, uuid);
            
            // If there was previous content, we might want to keep that mapping too
            // for a short period to help with line movement detection
            if (previousContent && previousContent.trim() !== '') {
              this.recordChange(uuid, content);
            }
          }
        }
      }
    });
    
    // Detect if the UUID is missing on any line and try to find it based on content
    lines.forEach((line: any, index: number) => {
      if (!line.domNode || line.domNode.getAttribute('data-line-uuid')) return;
      
      const content = this.getLineContent(line);
      if (content && content.trim() !== '') {
        const uuid = this.contentToUuid.get(content);
        if (uuid) {
          console.log(`**** LineTracker **** Restoring UUID for moved content at line ${index + 1}`);
          line.domNode.setAttribute('data-line-uuid', uuid);
          this.lineUuids.set(index, uuid);
        }
      }
    });
  }

  private detectLineCountChanges() {
    const lines = this.quill.getLines(0);
    const currentLineCount = lines.length;
    
    if (currentLineCount !== this.lastKnownLines) {
      console.log(`**** LineTracker **** Line count changed: ${this.lastKnownLines} -> ${currentLineCount}`);
      
      // Simple detection of line insertion/deletion
      if (currentLineCount > this.lastKnownLines) {
        console.log(`**** LineTracker **** Lines inserted: ${currentLineCount - this.lastKnownLines}`);
      } else {
        console.log(`**** LineTracker **** Lines deleted: ${this.lastKnownLines - currentLineCount}`);
      }
      
      this.lastKnownLines = currentLineCount;
    }
  }

  private recordChange(uuid: string, content: string) {
    if (!this.changeHistory.has(uuid)) {
      this.changeHistory.set(uuid, []);
    }
    
    const history = this.changeHistory.get(uuid)!;
    
    // Only record if content actually changed
    if (history.length === 0 || history[history.length - 1].content !== content) {
      history.push({
        content,
        timestamp: Date.now()
      });
      
      // Trim history if it exceeds limit
      if (history.length > this.changeHistoryLimit) {
        history.shift();
      }
    }
  }

  public getLineUuid(oneBasedIndex: number): string | undefined {
    const zeroBasedIndex = oneBasedIndex - 1;
    return this.lineUuids.get(zeroBasedIndex);
  }

  public setLineUuid(oneBasedIndex: number, uuid: string) {
    const zeroBasedIndex = oneBasedIndex - 1;
    this.lineUuids.set(zeroBasedIndex, uuid);
    
    // Update the DOM element if it exists
    const lines = this.quill.getLines(0);
    if (lines[zeroBasedIndex] && lines[zeroBasedIndex].domNode) {
      lines[zeroBasedIndex].domNode.setAttribute('data-line-uuid', uuid);
      
      // Also update content mapping
      const content = this.getLineContent(lines[zeroBasedIndex]);
      if (content && content.trim() !== '') {
        this.contentToUuid.set(content, uuid);
        this.contentHistory.set(uuid, content);
      }
    }
  }

  public getContentToUuidMap(): Map<string, string> {
    return this.contentToUuid;
  }

  public getDomUuidMap(): Map<number, string> {
    const map = new Map<number, string>();
    const lines = this.quill.getLines(0);
    
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          map.set(index, uuid);
        }
      }
    });
    
    return map;
  }

  public getLastOperation(): { type: string, lineIndex: number, movedContent?: string } | null {
    return this.lastOperation;
  }

  public getChangeHistory(uuid: string): {content: string, timestamp: number}[] {
    return this.changeHistory.get(uuid) || [];
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
