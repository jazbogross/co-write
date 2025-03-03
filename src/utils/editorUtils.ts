
export const extractLineContents = (lines: any[], quill: any): string[] => {
  return lines.map(line => {
    if (!line.domNode) return '';
    
    // Get the index range for this line
    const startIndex = quill.getIndex(line);
    const endIndex = line.next ? quill.getIndex(line.next) : quill.getLength();
    
    // Extract the content while preserving formatting
    const delta = quill.getContents(startIndex, endIndex - startIndex);
    return JSON.stringify(delta);
  });
};

export const reconstructContent = (lineData: Array<{ content: string }>): string => {
  try {
    // For first load, don't reconstruct at all, just return the original content
    if (lineData.length === 1 && lineData[0].content.includes('\n') === false) {
      return lineData[0].content;
    }
    
    // For edited content, create a properly formatted delta object
    const ops = lineData.flatMap(line => {
      try {
        // Try to parse the content as a delta object
        if (line.content.startsWith('{') && line.content.includes('ops')) {
          const delta = JSON.parse(line.content);
          // Return the ops array from each delta
          return delta.ops || [];
        }
      } catch (e) {
        // If parsing fails, treat as plain text
        console.error('Error parsing delta:', e);
      }
      
      // Fallback: treat as plain text
      return [{ insert: line.content + '\n' }];
    });
    
    // Create a single delta object with all ops
    return JSON.stringify({ ops });
  } catch (error) {
    console.error('Error reconstructing content:', error);
    // Fallback to original behavior
    return lineData.map(line => line.content).join('\n');
  }
};

// Extract plain text from a Delta object or string
export const extractPlainTextFromDelta = (content: string | null): string => {
  if (!content) return '';
  
  try {
    // If it's already a Delta object (JSON string)
    if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      const delta = JSON.parse(content);
      
      // Extract text from ops array
      if (delta.ops && Array.isArray(delta.ops)) {
        return delta.ops.reduce((text, op) => {
          if (typeof op.insert === 'string') {
            // Handle nested Delta objects (a Delta inside a Delta)
            if (op.insert.startsWith('{') && op.insert.includes('ops')) {
              return text + extractPlainTextFromDelta(op.insert);
            }
            return text + op.insert;
          }
          return text;
        }, '');
      }
    }
    
    // If it's not a Delta object, return as is
    return content;
  } catch (e) {
    // If parsing fails, return the original content
    console.error('Error extracting plain text from delta:', e);
    return typeof content === 'string' ? content : JSON.stringify(content);
  }
};

// Preserve formatted content from Quill
export const preserveFormattedContent = (content: string, quill: any): string => {
  if (!quill) return content;
  
  // If we already have a Quill editor with content, get its contents as Delta
  if (quill.getLength() > 1) { // > 1 because empty editor has length 1 (newline)
    return JSON.stringify(quill.getContents());
  }
  
  return content;
};

// Debug utility to log delta content structure
export const logDeltaStructure = (content: string | null): void => {
  if (!content) {
    console.log("Delta content is null or empty");
    return;
  }
  
  try {
    if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      const delta = JSON.parse(content);
      console.log("Delta structure:", {
        hasOps: !!delta.ops,
        opsCount: delta.ops?.length || 0,
        firstOp: delta.ops?.[0] || null,
        plainText: extractPlainTextFromDelta(content)
      });
    } else {
      console.log("Not a delta object:", content);
    }
  } catch (e) {
    console.error("Error parsing delta structure:", e);
  }
};

// Check if content is a Delta object
export const isDeltaObject = (content: string | null): boolean => {
  if (!content) return false;
  
  try {
    if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      const delta = JSON.parse(content);
      return !!delta.ops && Array.isArray(delta.ops);
    }
  } catch (e) {
    // Not a valid JSON or Delta
  }
  
  return false;
};
