
import { LineData } from '@/types/lineTypes';
import { isDeltaObject, extractPlainTextFromDelta, logDeltaStructure, safelyParseDelta } from '@/utils/editor';

/**
 * Processes raw lines data from the database into structured LineData objects
 */
export const processLinesData = (
  allLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  isAdmin: boolean = false // Added isAdmin parameter with default false
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
    // For non-admins, never use draft values
    const useLineNumberDraft = isAdmin && line.line_number_draft !== null;
    const useDraftContent = isAdmin && line.draft !== null;
    
    // Get the effective line number
    const effectiveLineNumber = useLineNumberDraft ? line.line_number_draft : line.line_number;
    
    // Process the content - always keep original Delta if available
    let finalContent: any = '';
    let originalContent: any = '';
    
    // Process original content - preserve Delta structure
    if (typeof line.content === 'string' && line.content.startsWith('{') && line.content.includes('ops')) {
      try {
        // Try to parse it as a Delta object
        const parsedContent = JSON.parse(line.content);
        if (parsedContent && Array.isArray(parsedContent.ops)) {
          console.log(`Line ${effectiveLineNumber} original content parsed as Delta`);
          originalContent = parsedContent;
        } else {
          originalContent = line.content || '';
        }
      } catch (e) {
        // If parsing fails, use as string
        originalContent = line.content || '';
      }
    } else if (isDeltaObject(line.content)) {
      originalContent = line.content; // Keep original Delta object
    } else {
      originalContent = line.content || '';
    }
    
    // Process draft content if it exists and user is admin - preserve Delta structure
    if (useDraftContent) {
      if (typeof line.draft === 'string' && line.draft.startsWith('{') && line.draft.includes('ops')) {
        try {
          // Try to parse it as a Delta object
          const parsedDraft = JSON.parse(line.draft);
          if (parsedDraft && Array.isArray(parsedDraft.ops)) {
            console.log(`Line ${effectiveLineNumber} draft content parsed as Delta`);
            finalContent = parsedDraft;
          } else {
            finalContent = line.draft || '';
          }
        } catch (e) {
          // If parsing fails, use as string
          finalContent = line.draft || '';
        }
      } else if (isDeltaObject(line.draft)) {
        finalContent = line.draft; // Keep original Delta object
        console.log(`Line ${effectiveLineNumber} preserving draft Delta`);
      } else {
        finalContent = line.draft || '';
      }
    } else {
      // Use original content if there's no draft or user is not admin
      finalContent = originalContent;
    }
    
    const lineDataItem: LineData = {
      uuid: line.id,
      content: finalContent,
      lineNumber: effectiveLineNumber,
      originalAuthor: null, // Will be populated later
      editedBy: [],
      hasDraft: isAdmin && (useLineNumberDraft || useDraftContent), // Only mark as draft for admins
      originalContent: originalContent, // Store original content for reference
      originalLineNumber: line.line_number // Store original line number for reference
    };
    
    // Add to our line map using effective line number as key
    lineMap.set(effectiveLineNumber, lineDataItem);
    
    // Update the content-to-UUID map - use plain text for mapping
    const plainTextContent = getPlainTextForMapping(finalContent);
    contentToUuidMapRef.current.set(plainTextContent, line.id);
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
    
    // Process content - preserve Delta structure if available for both draft and original content
    let finalContent: any = '';
    let originalContent: any = '';
    
    // Process original content first - Try to parse as Delta if it's a string that looks like a Delta
    if (typeof line.content === 'string' && line.content.startsWith('{') && line.content.includes('ops')) {
      try {
        const parsedContent = JSON.parse(line.content);
        if (parsedContent && Array.isArray(parsedContent.ops)) {
          console.log(`Line parsed original content as Delta`);
          originalContent = parsedContent;
        } else {
          originalContent = line.content || '';
        }
      } catch (e) {
        originalContent = line.content || '';
      }
    } else if (isDeltaObject(line.content)) {
      originalContent = line.content; // Keep original Delta object
    } else {
      originalContent = line.content || '';
    }
    
    // If no draft, we're done here - use the original content
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
      const plainTextContent = getPlainTextForMapping(originalContent);
      contentToUuidMapRef.current.set(plainTextContent, line.id);
      return;
    }
    
    // Get the effective line number
    const effectiveLineNumber = useLineNumberDraft ? line.line_number_draft : line.line_number;
    
    // Process draft content if it exists - Try to parse as Delta if it's a string that looks like a Delta
    if (useDraftContent) {
      if (typeof line.draft === 'string' && line.draft.startsWith('{') && line.draft.includes('ops')) {
        try {
          const parsedDraft = JSON.parse(line.draft);
          if (parsedDraft && Array.isArray(parsedDraft.ops)) {
            console.log(`Line parsed draft content as Delta`);
            finalContent = parsedDraft;
          } else {
            finalContent = line.draft || '';
          }
        } catch (e) {
          finalContent = line.draft || '';
        }
      } else if (isDeltaObject(line.draft)) {
        finalContent = line.draft; // Keep original Delta object
        console.log(`Line preserving draft Delta in processDraftLines`);
      } else {
        finalContent = line.draft || '';
      }
    } else {
      // Use original content if no draft content
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
    const plainTextContent = getPlainTextForMapping(finalContent);
    contentToUuidMapRef.current.set(plainTextContent, line.id);
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

/**
 * Helper function to get plain text for mapping purposes
 */
function getPlainTextForMapping(content: any): string {
  if (isDeltaObject(content)) {
    return extractPlainTextFromDelta(content);
  } else if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
    try {
      const parsedContent = JSON.parse(content);
      if (parsedContent && Array.isArray(parsedContent.ops)) {
        return extractPlainTextFromDelta(parsedContent);
      }
    } catch (e) {
      // If parsing fails, fall back to treating as string
    }
  }
  return typeof content === 'string' ? content : String(content);
}
