
/**
 * TextChangeHandler.ts - Handles text change events in the editor
 */

import { LineTrackerState } from '../LineTrackerTypes';
import { StructuralChangeAnalyzer } from '../operations/StructuralChangeAnalyzer';
import { EventPreProcessor } from '../operations/EventPreProcessor';
import { HandlerDispatcher } from '../operations/HandlerDispatcher';
import { LineOperationType } from '../utils/DeltaAnalyzer';

export interface TextChangeResult {
  lastOperationType: LineOperationType | string;
  lastAffectedIndex: number;
}

export class TextChangeHandler {
  /**
   * Process text change events
   */
  public static handleTextChange(
    delta: any,
    oldDelta: any,
    source: string,
    state: LineTrackerState,
    quill: any,
    linePosition: any,
    cursorTracker: any,
    uuidPreservation: any,
    contentCache: any, 
    getLineUuid: (index: number) => string | undefined
  ): TextChangeResult {
    if (state.isUpdating) return { lastOperationType: 'skipped', lastAffectedIndex: -1 };
    
    const lines = quill.getLines(0);
    const currentLineCount = lines.length;
    const lastLineCount = contentCache.getLastLineCount();
    
    // Determine if this change affects the document structure
    const isStructuralChange = StructuralChangeAnalyzer.needsStructuralHandling(
      delta, currentLineCount, lastLineCount
    );
    
    if (isStructuralChange) {
      console.log('**** TextChangeHandler **** Detected structural change, handling line operations');
      
      // Prepare for changes (save cursor, preserve UUIDs)
      EventPreProcessor.prepareForChanges(
        cursorTracker, 
        uuidPreservation,
        quill
      );
      
      // Analyze the type of structural change
      const { operationType, affectedLineIndex } = StructuralChangeAnalyzer.analyzeChange(
        delta, 
        currentLineCount, 
        lastLineCount,
        quill
      );
      
      // Store last operation for debugging (pass through to dispatcher)
      let lastOperationType = operationType;
      let lastAffectedIndex = affectedLineIndex;
      
      // Dispatch to appropriate handler
      HandlerDispatcher.dispatchOperation(
        operationType,
        affectedLineIndex,
        quill,
        linePosition,
        lastLineCount,
        contentCache
      );
      
      // Detect line count changes and update line indices
      linePosition.detectLineCountChanges(quill, false);
      
      // Finalize changes (restore UUIDs, cursor position)
      EventPreProcessor.finalizeChanges(
        uuidPreservation,
        getLineUuid,
        cursorTracker,
        quill,
        lines
      );
      
      // Update content cache for future change detection
      contentCache.cacheLineContents(quill.getLines(0));
      
      return { lastOperationType, lastAffectedIndex };
    } else {
      // For non-structural changes, just analyze cursor position and update line indices
      cursorTracker.analyzeTextChange(delta, quill);
      linePosition.updateLineIndexAttributes(quill, false);
      return { lastOperationType: 'non-structural', lastAffectedIndex: -1 };
    }
  }
}
