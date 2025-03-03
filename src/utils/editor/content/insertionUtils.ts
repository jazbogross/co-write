
import { splitContentIntoLines } from '@/hooks/lineMatching/contentUtils';

/**
 * Properly inserts content with line breaks into Quill editor
 */
export const insertContentWithLineBreaks = (editor: any, content: string) => {
  console.log('🔷 insertContentWithLineBreaks: Called with content length:', content.length);
  
  if (!content) {
    console.log('🔷 insertContentWithLineBreaks: Empty content, nothing to insert');
    return;
  }
  
  // Split content into lines
  const lines = splitContentIntoLines(content);
  console.log(`🔷 insertContentWithLineBreaks: Split content into ${lines.length} lines`);
  
  // Create a delta with proper line breaks
  const ops = [];
  for (let i = 0; i < lines.length; i++) {
    ops.push({ insert: lines[i] });
    // Add line break after each line (except maybe the last one)
    if (i < lines.length - 1 || lines[i].endsWith('\n')) {
      ops.push({ insert: '\n' });
    }
  }
  
  // If the content doesn't end with a newline and there are lines, add one
  if (lines.length > 0 && !content.endsWith('\n')) {
    ops.push({ insert: '\n' });
  }
  
  // Apply the delta to the editor
  console.log(`🔷 insertContentWithLineBreaks: Setting contents with ${ops.length} delta ops`);
  editor.setContents({ ops });
};
