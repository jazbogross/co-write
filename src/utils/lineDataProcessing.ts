import { LineData } from '@/types/lineTypes';
import { isDeltaObject, extractPlainTextFromDelta, logDeltaStructure, safelyParseDelta } from '@/utils/editor';

/**
 * Processes raw lines data from the database into structured LineData objects
 */
export const processLinesData = (
  allLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
): LineData[] => {
  if (!allLines || allLines.length === 0) {
    return [];
  }
  
  // Create a map to store the final line data by line number
  const lineMap = new Map<number, LineData>();
  
  // Process all lines
  allLines.forEach(line => {
    if (line.draft === '{deleted-uuid}') {
      // Skip deleted lines
      return;
    }
    
    // Determine the effective line number and content to use
    const useLineNumberDraft = line.line_number_draft !== null;
    const useDraftContent = line.draft !== null;
    
    // Get the effective line number
    const effectiveLineNumber = useLineNumberDraft ? line.line_number_draft : line.line_number;
    
    // Process the content - always extract text from Delta if needed
    let finalContent = '';
    let originalContent = '';
    
    // Process original content
    if (isDeltaObject(line.content)) {
      originalContent = extractPlainTextFromDelta(line.content);
    } else {
      originalContent = line.content || '';
    }
    
    // Process draft content if it exists
    if (useDraftContent) {
      if (isDeltaObject(line.draft)) {
        finalContent = extractPlainTextFromDelta(line.draft);
        console.log(`Line ${effectiveLineNumber} draft content extracted:`, finalContent.substring(0, 50));
      } else {
        finalContent = line.draft || '';
      }
    } else {
      // Use original content if there's no draft
      finalContent = originalContent;
    }
    
    const lineDataItem: LineData = {
      uuid: line.id,
      content: finalContent,
      lineNumber: effectiveLineNumber,
      originalAuthor: null, // Will be populated later
      editedBy: [],
      hasDraft: useLineNumberDraft || useDraftContent,
      originalContent: originalContent, // Store processed original content for reference
      originalLineNumber: line.line_number // Store original line number for reference
    };
    
    // Add to our line map using effective line number as key
    lineMap.set(effectiveLineNumber, lineDataItem);
    
    // Update the content-to-UUID map
    contentToUuidMapRef.current.set(finalContent, line.id);
  });
  
  // Convert map to array and sort by line number
  const processedLines = Array.from(lineMap.values())
    .sort((a, b) => a.lineNumber - b.lineNumber);
  
  // Renumber lines to ensure continuity (1, 2, 3, ...)
  processedLines.forEach((line, index) => {
    line.lineNumber = index + 1;
  });
  
  return processedLines;
};

/**
 * Processes draft lines data from the database
 */
export const processDraftLines = (
  draftLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
): LineData[] => {
  if (!draftLines || draftLines.length === 0) {
    return [];
  }

  // Create a map to store the final line data by line number
  const lineMap = new Map<number, LineData>();
  
  // Process all lines with consistent draft logic
  draftLines.forEach(line => {
    if (line.draft === '{deleted-uuid}') {
      // Skip deleted lines
      return;
    }
    
    // Determine if we should use the draft content and/or line number
    const useLineNumberDraft = line.line_number_draft !== null;
    const useDraftContent = line.draft !== null;
    
    // Process content - extract plain text from Delta if needed for both draft and original content
    let finalContent = '';
    let originalContent = '';
    
    // Process original content first
    if (isDeltaObject(line.content)) {
      originalContent = extractPlainTextFromDelta(line.content);
    } else {
      originalContent = line.content || '';
    }
    
    // If no draft, we're done here - use the processed original content
    if (!useLineNumberDraft && !useDraftContent) {
      const lineDataItem: LineData = {
        uuid: line.id,
        content: originalContent,
        lineNumber: line.line_number,
        originalAuthor: null,
        editedBy: [],
        hasDraft: false,
        originalContent: originalContent,
        originalLineNumber: line.line_number
      };
      
      lineMap.set(line.line_number, lineDataItem);
      contentToUuidMapRef.current.set(originalContent, line.id);
      return;
    }
    
    // Get the effective line number
    const effectiveLineNumber = useLineNumberDraft ? line.line_number_draft : line.line_number;
    
    // Process draft content if it exists
    if (useDraftContent) {
      // Check if draft content is a Delta object
      if (isDeltaObject(line.draft)) {
        // Using the improved extractor to handle nested Deltas
        finalContent = extractPlainTextFromDelta(line.draft);
        console.log(`Line ${effectiveLineNumber} draft Delta extracted to:`, finalContent.substring(0, 50));
      } else {
        // Use plain text draft content
        finalContent = line.draft || '';
      }
    } else {
      // Use processed original content if no draft content
      finalContent = originalContent;
    }
    
    const lineDataItem: LineData = {
      uuid: line.id,
      content: finalContent,
      lineNumber: effectiveLineNumber,
      originalAuthor: null,
      editedBy: [],
      hasDraft: true,
      originalContent: originalContent,
      originalLineNumber: line.line_number
    };
    
    lineMap.set(effectiveLineNumber, lineDataItem);
    contentToUuidMapRef.current.set(finalContent, line.id);
  });
  
  // Convert map to array and sort by line number
  const updatedLines = Array.from(lineMap.values())
    .sort((a, b) => a.lineNumber - b.lineNumber);
  
  // Renumber lines to ensure continuity (1, 2, 3, ...)
  updatedLines.forEach((line, index) => {
    line.lineNumber = index + 1;
  });
  
  return updatedLines;
};
