
export const extractLineContents = (lines: any[], quill: any): string[] => {
  return lines.map(line => {
    if (!line.domNode) return '';
    
    // Get the index range for this line
    const startIndex = quill.getIndex(line);
    const endIndex = line.next ? quill.getIndex(line.next) : quill.getLength();
    
    // Extract the content while preserving formatting
    return quill.getContent(startIndex, endIndex - startIndex).trim();
  });
};

export const reconstructContent = (lineData: Array<{ content: string }>): string => {
  return lineData.map(line => line.content).join('\n');
};
