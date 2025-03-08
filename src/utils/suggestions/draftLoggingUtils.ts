import { isDeltaObject, logDeltaStructure } from '@/utils/editor';
import { LineData } from '@/types/lineTypes';

/**
 * Utility for logging draft loading operations
 */
export const logDraftLineData = (
  label: string,
  lineData: LineData[]
) => {
  console.log(`**** LineDataService **** ${label} ${lineData.length} lines`);
  
  if (lineData.length === 0) {
    console.log(`**** LineDataService **** No lines to log for ${label}`);
    return;
  }
  
  // Log first few lines for debugging - keep this for draft debugging
  const draftLines = lineData.filter(line => line.hasDraft);
  if (draftLines.length > 0) {
    console.log(`**** LineDataService **** Found ${draftLines.length} draft lines`);
    draftLines.slice(0, 2).forEach((line, i) => {
      let contentPreview: string;
      if (typeof line.content === 'string') {
        contentPreview = line.content.substring(0, 30);
      } else if (line.content && typeof line.content === 'object' && 'ops' in line.content) {
        contentPreview = 'Delta object';
      } else {
        contentPreview = '[invalid content format]';
      }
      
      console.log(`**** LineDataService **** Draft line ${i+1}:`, {
        uuid: line.uuid,
        lineNumber: line.lineNumber,
        contentPreview,
        hasDraft: line.hasDraft || false
      });
    });
  }
};

/**
 * Utility for logging draft loading status - keep only important messages
 */
export const logDraftLoading = (
  message: string,
  data?: any
) => {
  // Only log messages containing keywords related to script_suggestions or drafts
  if (message.includes('script_suggestions') || 
      message.includes('draft') || 
      message.includes('suggestion') ||
      message.includes('Found') ||
      message.includes('Error')) {
    console.log(`**** LineDataService **** ${message}`, data || '');
  }
};

// Re-export logDeltaStructure for convenience
export { logDeltaStructure };
