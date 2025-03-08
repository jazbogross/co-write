
import { isDeltaObject } from '@/utils/editor';
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
  
  // Log first few lines for debugging
  lineData.slice(0, 3).forEach((line, i) => {
    // Type-safe content preview for logging
    let contentPreview: string;
    if (typeof line.content === 'string') {
      contentPreview = line.content.substring(0, 30);
    } else if (line.content && typeof line.content === 'object' && 'ops' in line.content) {
      contentPreview = 'Delta object';
    } else {
      contentPreview = '[invalid content format]';
    }
    
    console.log(`**** LineDataService **** Processed line ${i+1}:`, {
      uuid: line.uuid,
      lineNumber: line.lineNumber,
      contentPreview,
      hasDraft: line.hasDraft || false
    });
  });
};

/**
 * Utility for logging draft loading status
 */
export const logDraftLoading = (
  message: string,
  data?: any
) => {
  console.log(`**** LineDataService **** ${message}`, data || '');
};
