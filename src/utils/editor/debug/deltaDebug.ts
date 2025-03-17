
/**
 * Debug utilities for Delta objects
 */
import { DeltaContent } from '../types';
import { extractPlainTextFromDelta } from '../content/textExtraction';
import { validateDelta } from '../validation/deltaValidation';

/**
 * Log Delta structure for debugging
 */
export const logDeltaStructure = (delta: any, label = 'Delta'): void => {
  console.log(`---- ${label} Structure ----`);
  if (!delta) {
    console.log('Null or undefined delta');
    return;
  }
  
  console.log(`Type: ${typeof delta}`);
  
  const validation = validateDelta(delta);
  console.log(`Is valid Delta: ${validation.valid}`);
  
  if (validation.valid && validation.parsed) {
    const parsed = validation.parsed;
    console.log(`Operations count: ${parsed.ops.length}`);
    console.log('First 3 operations:', parsed.ops.slice(0, 3));
    
    // Log plain text content
    const text = extractPlainTextFromDelta(parsed);
    console.log(`Content (first 100 chars): ${text.substring(0, 100)}`);
    console.log(`Line count: ${text.split('\n').length}`);
  } else {
    console.log('Not a valid Delta:');
    console.log(delta);
  }
  
  console.log('---------------------------');
};

/**
 * Create a simple string representation of a Delta for logging
 */
export const deltaToString = (delta: DeltaContent): string => {
  if (!delta || !delta.ops) {
    return '[Invalid Delta]';
  }
  
  return `Delta: ${delta.ops.length} ops, content: "${extractPlainTextFromDelta(delta).substring(0, 50)}${
    extractPlainTextFromDelta(delta).length > 50 ? '...' : ''
  }"`;
};

/**
 * Format Delta changes for logging
 */
export const formatDeltaChanges = (delta: DeltaContent): string => {
  if (!delta || !delta.ops) {
    return '[Invalid Delta]';
  }
  
  return delta.ops.map(op => {
    if (op.insert) {
      const content = typeof op.insert === 'string' 
        ? op.insert.replace(/\n/g, '\\n') 
        : JSON.stringify(op.insert);
      return `INSERT: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`;
    }
    if (op.delete) {
      return `DELETE: ${op.delete} chars`;
    }
    if (op.retain) {
      return `RETAIN: ${op.retain} chars`;
    }
    return '[Unknown op]';
  }).join(', ');
};
