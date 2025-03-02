
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
  
  constructor(quill: any) {
    this.quill = quill;
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Handle text changes
    this.quill.on('text-change', () => {
      if (this.isUpdating) return;
      this.isUpdating = true;
      
      try {
        this.updateLineIndexAttributes();
        this.detectLineCountChanges();
      } finally {
        this.isUpdating = false;
      }
    });
    
    // Initialize UUIDs from DOM on first load
    setTimeout(() => this.initialize(), 300);
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
          this.contentToUuid.set(content, uuid);
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
      
      // We don't assign UUIDs here - that's handled by the LineData system
      // We just read them from the DOM and maintain our map
      const uuid = line.domNode.getAttribute('data-line-uuid');
      if (uuid) {
        this.lineUuids.set(index, uuid);
        
        // Update content mapping if needed
        const content = this.getLineContent(line);
        if (content && content.trim() !== '') {
          this.contentToUuid.set(content, uuid);
          
          // Add to change history
          this.recordChange(uuid, content);
        }
      }
    });
  }
  
  private detectLineCountChanges() {
    const lines = this.quill.getLines(0);
    const currentLineCount = lines.length;
    
    if (currentLineCount !== this.lastKnownLines) {
      console.log(`**** LineTracker **** Line count changed: ${this.lastKnownLines} -> ${currentLineCount}`);
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
