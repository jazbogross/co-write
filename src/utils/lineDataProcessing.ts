
import { LineData } from '@/types/lineTypes';
import { isDeltaObject, extractPlainTextFromDelta, logDeltaStructure } from '@/utils/editorUtils';

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
    
    // Process the content - extract text from Delta if needed
    let finalContent = line.content;
    
    if (useDraftContent) {
      // If we have draft content, use it (parse delta if needed)
      if (isDeltaObject(line.draft)) {
        finalContent = extractPlainTextFromDelta(line.draft);
        // Debug log Delta structure
        logDeltaStructure(line.draft);
      } else {
        finalContent = line.draft || '';
      }
    }
    
    const lineDataItem: LineData = {
      uuid: line.id,
      content: finalContent,
      lineNumber: effectiveLineNumber,
      originalAuthor: null, // Will be populated later
      editedBy: [],
      hasDraft: useLineNumberDraft || useDraftContent,
      originalContent: line.content, // Store original content for reference
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
  
  // Process all lines with simplified draft logic
  draftLines.forEach(line => {
    if (line.draft === '{deleted-uuid}') {
      // Skip deleted lines
      return;
    }
    
    // Determine if we should use the draft content and/or line number
    const useLineNumberDraft = line.line_number_draft !== null;
    const useDraftContent = line.draft !== null;
    
    if (!useLineNumberDraft && !useDraftContent) {
      // No drafts for this line, use the original content and line number
      const lineDataItem: LineData = {
        uuid: line.id,
        content: line.content,
        lineNumber: line.line_number,
        originalAuthor: null,
        editedBy: [],
        hasDraft: false,
        originalContent: line.content,
        originalLineNumber: line.line_number
      };
      
      lineMap.set(line.line_number, lineDataItem);
      contentToUuidMapRef.current.set(line.content, line.id);
      return;
    }
    
    // Get the effective line number and content
    const effectiveLineNumber = useLineNumberDraft ? line.line_number_draft : line.line_number;
    
    // Process content - extract plain text from Delta if needed
    let finalContent = line.content;
    
    if (useDraftContent) {
      if (isDeltaObject(line.draft)) {
        finalContent = extractPlainTextFromDelta(line.draft);
        console.log(`Line ${effectiveLineNumber} draft content is a Delta:`, finalContent);
      } else {
        finalContent = line.draft || '';
        console.log(`Line ${effectiveLineNumber} draft content is plain text:`, finalContent);
      }
    }
    
    const lineDataItem: LineData = {
      uuid: line.id,
      content: finalContent,
      lineNumber: effectiveLineNumber,
      originalAuthor: null,
      editedBy: [],
      hasDraft: true,
      originalContent: line.content,
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
