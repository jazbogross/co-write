export const extractLineContents = (lines: any[], quill: any): string[] => {
  return lines.map(line => {
    if (!line.domNode) return '';
    
    // Get the index range for this line
    const startIndex = quill.getIndex(line);
    const endIndex = line.next ? quill.getIndex(line.next) : quill.getLength();
    
    // Extract the content while preserving formatting
    const delta = quill.getContents(startIndex, endIndex - startIndex);
    
    // Return the delta object directly, not as a string
    return delta;
  });
};

export const reconstructContent = (lineData: Array<{ content: string | any }>): any => {
  try {
    // For first load, if we have a single line of plain text, return it directly
    if (lineData.length === 1 && typeof lineData[0].content === 'string' && 
        !lineData[0].content.includes('\n')) {
      return lineData[0].content;
    }
    
    // Build combined ops from all lines
    const ops: any[] = [];
    
    lineData.forEach(line => {
      if (!line.content) return;
      
      try {
        // If content is a Delta object, add its ops
        if (typeof line.content === 'object' && line.content.ops) {
          ops.push(...line.content.ops);
        }
        // If content is a stringified Delta, parse and add its ops
        else if (typeof line.content === 'string' && 
                line.content.startsWith('{') && 
                line.content.includes('ops')) {
          try {
            const delta = JSON.parse(line.content);
            if (delta && delta.ops) {
              ops.push(...delta.ops);
            }
          } catch (e) {
            // If parsing fails, add as plain text
            ops.push({ insert: line.content + '\n' });
          }
        }
        // Otherwise, add as plain text
        else {
          ops.push({ insert: (typeof line.content === 'string' ? line.content : String(line.content)) + '\n' });
        }
      } catch (e) {
        // Fallback: add as plain text
        ops.push({ insert: (typeof line.content === 'string' ? line.content : String(line.content)) + '\n' });
      }
    });
    
    // Return a proper Delta object
    return { ops };
  } catch (error) {
    console.error('Error reconstructing content:', error);
    // Fallback to joining strings
    return lineData.map(line => 
      typeof line.content === 'string' ? line.content : String(line.content)
    ).join('\n');
  }
};

// Extract plain text from a Delta object or string, handling nested Deltas properly
export const extractPlainTextFromDelta = (content: string | any | null): string => {
  if (!content) return '';
  
  try {
    // If the content is already plain text (not a Delta), return it directly
    if (typeof content === 'string' && 
        (!content.startsWith('{') || !content.includes('ops'))) {
      return content;
    }
    
    // Handle Delta objects directly
    if (typeof content === 'object' && content.ops) {
      return extractTextFromDeltaOps(content.ops);
    }
    
    // Parse if it's a JSON string
    if (typeof content === 'string') {
      try {
        const delta = JSON.parse(content);
        if (delta && delta.ops) {
          return extractTextFromDeltaOps(delta.ops);
        }
      } catch (e) {
        // If it can't be parsed as JSON, it's likely already plain text
        return content;
      }
    }
    
    // Fallback: Return as string
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (e) {
    console.error('Error extracting plain text from delta:', e);
    return typeof content === 'string' ? content : JSON.stringify(content);
  }
};

// Helper function to extract text from Delta ops
function extractTextFromDeltaOps(ops: any[]): string {
  if (!Array.isArray(ops)) return '';
  
  let result = '';
  ops.forEach((op: any) => {
    if (typeof op.insert === 'string') {
      result += op.insert;
    } else if (op.insert && typeof op.insert === 'object') {
      // Handle embeds or other non-string inserts
      result += ' ';
    }
  });
  
  // Ensure the result has a proper newline if needed
  if (!result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}

// Preserve formatted content from Quill, ensuring we don't double-wrap Delta objects
export const preserveFormattedContent = (content: string | any, quill: any): any => {
  if (!quill) return content;
  
  // If content is already a Delta object, return it directly
  if (typeof content === 'object' && content.ops) {
    console.log('Content is already a Delta object, not rewrapping');
    return content;
  }
  
  // If we already have a Quill editor with content, get its contents as Delta
  if (quill.getLength() > 1) { // > 1 because empty editor has length 1 (newline)
    return quill.getContents();
  }
  
  return content;
};

// Debug utility to log delta content structure
export const logDeltaStructure = (content: string | any | null): void => {
  if (!content) {
    console.log("Delta content is null or empty");
    return;
  }
  
  try {
    let delta = null;
    
    // Handle different input types
    if (typeof content === 'object' && content.ops) {
      delta = content;
    } else if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      delta = JSON.parse(content);
    }
    
    if (delta) {
      console.log("Delta structure:", {
        hasOps: !!(delta && delta.ops),
        opsCount: delta?.ops?.length ?? 0,
        firstOp: delta?.ops?.[0] ?? null,
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
export const isDeltaObject = (content: string | any | null): boolean => {
  if (!content) return false;
  
  try {
    // If it's already an object with ops property
    if (typeof content === 'object' && content.ops && Array.isArray(content.ops)) {
      return true;
    }
    
    // If it's a string, try parsing it
    if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      const delta = JSON.parse(content);
      return !!delta && !!delta.ops && Array.isArray(delta.ops);
    }
  } catch (e) {
    // Not a valid JSON or Delta
  }
  
  return false;
};

// Safely parse a Delta object, handling double-wrapped Delta objects
export const safelyParseDelta = (content: string | any | null): any => {
  if (!content) return null;
  
  try {
    // If content is already a Delta object, return it directly
    if (typeof content === 'object' && content.ops && Array.isArray(content.ops)) {
      return content;
    }
    
    // If it's a string, try parsing it
    if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      const delta = JSON.parse(content);
      
      // Check if this is a valid Delta object
      if (delta && delta.ops && Array.isArray(delta.ops)) {
        // Check for double-wrapped Deltas (Delta objects in insert properties)
        let hasNestedDeltas = false;
        const normalizedOps = delta.ops.map((op: any) => {
          if (typeof op.insert === 'string' && op.insert.startsWith('{') && op.insert.includes('ops')) {
            hasNestedDeltas = true;
            try {
              // Try to extract the actual content from the nested Delta
              const nestedContent = extractPlainTextFromDelta(op.insert);
              return { ...op, insert: nestedContent };
            } catch (e) {
              return op; // Keep original if extraction fails
            }
          }
          return op;
        });
        
        if (hasNestedDeltas) {
          console.log('Normalized nested Deltas in content');
          return { ops: normalizedOps };
        }
        
        return delta;
      }
    }
  } catch (e) {
    console.error('Error parsing Delta:', e);
  }
  
  // Not a Delta or parsing failed
  return null;
};
