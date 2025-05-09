
/**
 * Utilities for reconstructing content from line data
 */
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from './types';
import { combineDeltaContents } from './operations/deltaCombination';
import { createEmptyDelta } from './operations/deltaOperations';
import { isDeltaObject } from '@/utils/deltaUtils';

/**
 * Reconstructs a single delta content from line data
 */
export const reconstructContent = (lineData: LineData[]): DeltaContent => {
  console.log('🔄 reconstructContent: Processing', lineData.length, 'lines');
  
  if (!lineData || lineData.length === 0) {
    console.log('🔄 reconstructContent: No line data, returning empty delta');
    return createEmptyDelta();
  }
  
  // Get content from each line
  const contents = lineData.map(line => line.content);
  
  // Log sample content types for debugging
  if (contents.length > 0) {
    const sampleContent = contents[0];
    console.log('🔄 reconstructContent: First content type:', typeof sampleContent, 
      isDeltaObject(sampleContent) ? 'isDelta' : 'notDelta');
  }
  
  // Combine the contents into a single delta
  const combinedDelta = combineDeltaContents(contents);
  
  if (!combinedDelta) {
    console.log('🔄 reconstructContent: Failed to combine delta, returning empty delta');
    return createEmptyDelta();
  }
  
  console.log('🔄 reconstructContent: Combined delta with', combinedDelta.ops.length, 'ops');
  return combinedDelta;
};
