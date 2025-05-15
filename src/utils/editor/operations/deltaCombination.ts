
/**
 * Functions for combining multiple Delta contents
 */
import { DeltaContent, DeltaOp } from '../types';
import { createEmptyDelta, sanitizeDeltaOps } from './deltaOperations';
import { validateDelta } from '../validation/deltaValidation';
import { DeltaOperation } from '../quill-types';

/**
 * Combines multiple Delta contents into a single Delta
 */
export const combineDeltaContents = (contents: any[]): DeltaContent | null => {
  console.log('🔶 combineDeltaContents: Combining', contents.length, 'contents');
  
  if (!contents || contents.length === 0) {
    console.log('🔶 combineDeltaContents: No contents to combine');
    return createEmptyDelta();
  }
  
  // Initialize combined ops array
  const combinedOps: DeltaOp[] = [];
  
  // Process each content
  for (const content of contents) {
    try {
      // Validate the content as a Delta
      const validation = validateDelta(content);
      
      if (validation.valid && validation.parsed) {
        // Add ops from valid Delta
        if (validation.parsed.ops && Array.isArray(validation.parsed.ops)) {
          console.log('🔶 combineDeltaContents: Added', validation.parsed.ops.length, 'ops from valid Delta');
          // Cast to DeltaOp[] to ensure type compatibility
          combinedOps.push(...(validation.parsed.ops as DeltaOp[]));
        }
      } else if (typeof content === 'string') {
        // Convert string content to Delta op
        console.log('🔶 combineDeltaContents: Added string content as Delta op');
        combinedOps.push({ insert: content });
        
        // Ensure string content ends with newline if it doesn't have one
        if (!content.endsWith('\n')) {
          combinedOps.push({ insert: '\n' });
        }
      }
    } catch (error) {
      console.error('🔶 combineDeltaContents: Error processing content:', error);
    }
  }
  
  // Make sure at least one op exists
  if (combinedOps.length === 0) {
    console.log('🔶 combineDeltaContents: No valid ops found, returning empty Delta');
    return createEmptyDelta();
  }
  
  // Ensure the last op ends with a newline
  const lastOp = combinedOps[combinedOps.length - 1];
  if (typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n')) {
    combinedOps.push({ insert: '\n' });
  }
  
  // Create the combined Delta
  const result: DeltaContent = {
    ops: sanitizeDeltaOps(combinedOps)
  };
  
  console.log('🔶 combineDeltaContents: Successfully combined into Delta with', result.ops.length, 'ops');
  return result;
};

/**
 * Creates a combined Delta from lineData objects
 */
export const createDeltaFromLineData = (lineData: any[]): DeltaContent => {
  console.log('🔶 createDeltaFromLineData: Creating Delta from', lineData.length, 'lines');
  
  // Extract content from lineData
  const contents = lineData
    .filter(line => line && line.content)
    .map(line => line.content);
  
  // Combine the contents
  const combinedDelta = combineDeltaContents(contents);
  
  if (!combinedDelta) {
    console.log('🔶 createDeltaFromLineData: Failed to create combined Delta, returning empty Delta');
    return createEmptyDelta();
  }
  
  return combinedDelta;
};
