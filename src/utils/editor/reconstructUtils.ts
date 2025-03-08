
/**
 * Utilities for reconstructing Delta content from LineData
 */
import { LineData } from '@/types/lineTypes';
import { DeltaContent, DeltaOp } from './types';
import { 
  validateDelta, 
  safelyParseDelta, 
  combineDeltaContents,
  createEmptyDelta,
  logDeltaStructure
} from './deltaUtils';

/**
 * Reconstructs a combined Delta object from an array of LineData
 */
export const reconstructContent = (lineData: LineData[]): DeltaContent => {
  console.log('🔹 reconstructContent: Processing', lineData.length, 'lines');
  
  if (!lineData || lineData.length === 0) {
    console.log('🔹 reconstructContent: No line data, returning empty Delta');
    return createEmptyDelta();
  }
  
  try {
    // Extract and validate content from each line
    const deltaContents: any[] = lineData.map((line, index) => {
      console.log(`🔹 reconstructContent: Processing line ${index + 1}, content type:`, typeof line.content);
      
      const validation = validateDelta(line.content);
      
      if (validation.valid && validation.parsed) {
        console.log(`🔹 reconstructContent: Line ${index + 1} is a valid Delta with ${validation.parsed.ops.length} ops`);
        return validation.parsed;
      } else {
        console.log(`🔹 reconstructContent: Line ${index + 1} is not a valid Delta:`, validation.reason);
        
        // If it's a string, ensure it ends with a newline
        if (typeof line.content === 'string') {
          const content = line.content.endsWith('\n') ? line.content : line.content + '\n';
          console.log(`🔹 reconstructContent: Created simple Delta for line ${index + 1}`);
          return { ops: [{ insert: content }] };
        } else {
          // Default empty line with newline
          console.log(`🔹 reconstructContent: Created empty Delta for line ${index + 1}`);
          return { ops: [{ insert: '\n' }] };
        }
      }
    });
    
    // Combine all Delta contents
    const combined = combineDeltaContents(deltaContents);
    
    if (combined) {
      console.log('🔹 reconstructContent: Successfully combined all lines into Delta with', combined.ops.length, 'ops');
      logDeltaStructure(combined);
      return combined;
    } else {
      console.log('🔹 reconstructContent: Failed to combine lines, returning empty Delta');
      return createEmptyDelta();
    }
  } catch (e) {
    console.error('🔹 reconstructContent: Error reconstructing content:', e);
    return createEmptyDelta();
  }
};

/**
 * Ensures a Delta has the correct structure with newlines
 */
export const normalizeDelta = (content: any): DeltaContent => {
  console.log('🔹 normalizeDelta: Normalizing content of type', typeof content);
  
  const validation = validateDelta(content);
  
  if (validation.valid && validation.parsed) {
    console.log('🔹 normalizeDelta: Content is valid Delta, ensuring newlines');
    
    const ops = [...validation.parsed.ops];
    
    // Ensure the last insert ends with a newline
    if (ops.length > 0) {
      const lastOp = ops[ops.length - 1];
      if (typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n')) {
        ops.push({ insert: '\n' });
        console.log('🔹 normalizeDelta: Added trailing newline');
      }
    } else {
      // Empty Delta, add a newline
      ops.push({ insert: '\n' });
      console.log('🔹 normalizeDelta: Added newline to empty Delta');
    }
    
    console.log('🔹 normalizeDelta: Normalized Delta has', ops.length, 'ops');
    return { ops };
  }
  
  // Not a valid Delta, create a simple one
  console.log('🔹 normalizeDelta: Not a valid Delta, creating simple Delta');
  const text = typeof content === 'string' ? content : String(content);
  const normalizedText = text.endsWith('\n') ? text : text + '\n';
  
  return { ops: [{ insert: normalizedText }] };
};

/**
 * Creates a Delta from a plain text string
 */
export const createDeltaFromText = (text: string): DeltaContent => {
  console.log('🔹 createDeltaFromText: Creating Delta from text of length', text?.length || 0);
  
  if (!text) {
    return createEmptyDelta();
  }
  
  const normalizedText = text.endsWith('\n') ? text : text + '\n';
  return { ops: [{ insert: normalizedText }] };
};
