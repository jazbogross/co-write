
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
    // For formatted content, just use the original content from the script
    // This avoids unnecessary reconstruction which strips formatting
    return lineData.map(line => {
      // If the content is a stringified Delta object, parse it back
      if (line.content.startsWith('{') && line.content.includes('ops')) {
        try {
          return JSON.parse(line.content);
        } catch (e) {
          // If it's not valid JSON, return as is
          return line.content;
        }
      }
      return line.content;
    }).join('\n');
  } catch (error) {
    console.error('Error reconstructing content:', error);
    // Fallback to original behavior
    return lineData.map(line => line.content).join('\n');
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
