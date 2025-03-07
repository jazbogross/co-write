
/**
 * Merge base lines with suggestion drafts
 */
export const mergeLinesWithSuggestions = (allLines: any[], suggestionDrafts: any[]) => {
  // Convert base lines
  const mergedLines = allLines.map((line: any) => {
    // Make sure line is a valid object
    if (!line || typeof line !== 'object') {
      console.log('**** LineDataService **** Skipping invalid line object');
      return line;
    }
    
    // Try to find a matching suggestion for this line
    const suggestion = suggestionDrafts?.find((s: any) => 
      s && typeof s === 'object' && s.line_uuid === line.id
    );
    
    if (suggestion) {
      // Convert line to include suggestion data
      return {
        ...line,
        // If draft exists, use it, otherwise use the suggestion content
        draft: suggestion.draft || suggestion.content,
        line_number_draft: suggestion.line_number_draft || suggestion.line_number || line.line_number
      };
    }
    
    return line;
  });
  
  // Also add any new lines from suggestions
  const newLines = findNewLines(allLines, suggestionDrafts);
  
  // Add new lines to the merged dataset
  newLines.forEach((newLine: any) => {
    // Make sure newLine is a valid object
    if (!newLine || typeof newLine !== 'object') {
      console.log('**** LineDataService **** Skipping invalid new line object');
      return;
    }
    
    const highestLineNumber = Math.max(...mergedLines.map((l: any) => 
      l && typeof l === 'object' ? (l.line_number || 0) : 0
    ), 0);
    
    mergedLines.push({
      id: newLine.id, // Use suggestion ID as line ID for new lines
      content: '', // No original content for new lines
      draft: newLine.draft || newLine.content,
      line_number: highestLineNumber + 1,
      line_number_draft: newLine.line_number_draft || newLine.line_number || (highestLineNumber + 1)
    });
  });
  
  return mergedLines;
};

/**
 * Find new lines from suggestions that don't exist in the base content
 */
export const findNewLines = (allLines: any[], suggestionDrafts: any[]) => {
  return suggestionDrafts?.filter((s: any) => 
    // Make sure s is a valid object first
    s && typeof s === 'object' && (
      // Include suggestions without line_uuid or with line_uuid that doesn't match any existing line
      !s.line_uuid || !allLines.some((line: any) => 
        line && typeof line === 'object' && line.id === s.line_uuid
      )
    )
  ) || [];
};
