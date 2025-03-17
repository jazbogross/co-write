
/**
 * HandlerDispatcher.ts - Dispatches operations to appropriate handlers
 */

import { LineOperationType } from '../utils/DeltaAnalyzer';
import { LineSplitHandler } from '../handlers/LineSplitHandler';
import { NewLineHandler } from '../handlers/NewLineHandler';
import { EnterAtZeroHandler } from '../handlers/EnterAtZeroHandler';
import { DeleteMergeHandler } from '../handlers/DeleteMergeHandler';

export class HandlerDispatcher {
  /**
   * Dispatch operation to appropriate handler
   */
  public static dispatchOperation(
    operationType: LineOperationType,
    affectedLineIndex: number,
    quill: any,
    linePosition: any,
    lastLineCount: number,
    contentCache: any
  ): void {
    switch(operationType) {
      case LineOperationType.SPLIT:
        LineSplitHandler.handleLineSplit(quill, affectedLineIndex, linePosition);
        break;
        
      case LineOperationType.NEW:
        NewLineHandler.handleNewLines(
          quill, 
          affectedLineIndex, 
          lastLineCount, 
          linePosition,
          contentCache
        );
        break;
        
      case LineOperationType.ENTER_AT_ZERO:
        EnterAtZeroHandler.handleEnterAtZero(quill, linePosition);
        break;
        
      case LineOperationType.DELETE:
      case LineOperationType.MERGE:
        DeleteMergeHandler.handleDeleteOrMerge(quill, linePosition);
        break;
        
      default:
        // For non-structural operations, just update line attributes
        linePosition.updateLineIndexAttributes(quill, false);
        break;
    }
  }
}
