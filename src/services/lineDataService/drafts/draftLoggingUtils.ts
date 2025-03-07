
import { LineData } from '@/types/lineTypes';

/**
 * Logs debug information about the first few drafts
 */
export const logDraftDebuggingInfo = (suggestionDrafts: any[]) => {
  suggestionDrafts.slice(0, 3).forEach((draft: any, i) => {
    // Make sure 'draft' is an object before accessing properties
    if (draft && typeof draft === 'object') {
      // Safely access properties with optional chaining and type checking
      const contentPreview = typeof draft.content === 'string' 
        ? draft.content.substring(0, 30) + '...' 
        : 'Non-string content';
        
      const draftPreview = typeof draft.draft === 'string' 
        ? draft.draft.substring(0, 30) + '...' 
        : 'Non-string draft';
      
      console.log(`**** LineDataService **** Draft ${i+1}:`, {
        id: draft.id,
        line_uuid: draft.line_uuid,
        content: contentPreview,
        draft: draftPreview,
        line_number: draft.line_number,
        line_number_draft: draft.line_number_draft
      });
    } else {
      console.log(`**** LineDataService **** Draft ${i+1} is not a valid object`);
    }
  });
};

/**
 * Logs information about the first few processed lines
 */
export const logProcessedLinesInfo = (updatedLines: LineData[]) => {
  updatedLines.slice(0, 3).forEach((line, i) => {
    // Type safety is guaranteed here since this is our own LineData type
    const contentPreview = typeof line.content === 'string' 
      ? line.content.substring(0, 30) + '...' 
      : 'Delta object';
      
    console.log(`**** LineDataService **** Processed line ${i+1}:`, {
      uuid: line.uuid,
      lineNumber: line.lineNumber,
      contentPreview: contentPreview,
      hasDraft: line.hasDraft
    });
  });
};
