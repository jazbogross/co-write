
/**
 * Utilities for reconstructing content from various data formats
 */
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from './types';
import { 
  isDeltaObject, 
  safelyParseDelta,
  logDeltaStructure,
  combineDeltaContents 
} from './deltaUtils';

/**
 * Reconstructs full content from an array of line data
 * Can produce either a string or a Delta object depending on the content type
 */
export const reconstructContent = (lineData: LineData[]): string | DeltaContent => {
  console.log(`🔄 reconstructContent: Reconstructing content from ${lineData.length} lines`);
  
  // Check if we have Delta objects in lineData
  const hasDeltaContent = lineData.some(line => isDeltaObject(line.content));
  
  if (hasDeltaContent) {
    console.log('🔄 reconstructContent: Found Delta content, combining as Delta objects');
    
    // Map each line to a Delta object if possible
    const deltaContents = lineData.map(line => {
      // If already a Delta object, use it directly
      if (isDeltaObject(line.content)) {
        return line.content;
      }
      
      // If it's a string that looks like a Delta, try to parse it
      if (typeof line.content === 'string' && 
          line.content.startsWith('{') && 
          line.content.includes('"ops"')) {
        try {
          const parsed = safelyParseDelta(line.content);
          if (parsed) {
            return parsed;
          }
        } catch (e) {
          console.error('Error parsing Delta string:', e);
        }
      }
      
      // If not a Delta, create a simple text Delta
      return {
        ops: [
          { insert: typeof line.content === 'string' ? line.content : String(line.content) }
        ]
      };
    });
    
    // Combine all Deltas into one
    const combinedDelta = combineDeltaContents(deltaContents);
    if (combinedDelta) {
      // Log the combined Delta for debugging
      logDeltaStructure(combinedDelta, '🔄 Combined Delta');
      return combinedDelta;
    }
  }
  
  // Fallback to plain text if Delta approach fails
  console.log('🔄 reconstructContent: Using plain text reconstruction');
  return lineData
    .map(line => typeof line.content === 'string' ? line.content : String(line.content))
    .join('\n');
};
