import { LineData } from '@/types/lineTypes';
import { isDeltaObject } from '@/utils/editor';
import { getPlainTextForMapping } from './mappingUtils';

/**
 * Processes raw lines data from the database into structured LineData objects
 */
export const processLinesData = (
  allLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  isAdmin: boolean = false
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
