
/**
 * Utils for reconstructing content from line data
 */
import { LineData } from "@/hooks/useLineData";
import { DeltaContent } from "./types";
import { combineDeltaContents } from "./operations/deltaCombination";
import { parseDeltaIfPossible } from "./operations/deltaOperations";
import { isDeltaObject } from "./validation/deltaValidation";
import { safelyParseDelta } from "./validation/deltaValidation";
import { logDelta } from "./debug/deltaDebug";
import { logDeltaStructure } from "./debug/deltaDebug";

/**
 * Reconstructs Delta content from lineData
 */
export const reconstructContent = (lineData: any[]): DeltaContent | string => {
  console.log('🔄 reconstructContent: Processing', lineData.length, 'lines');
  
  if (!lineData || lineData.length === 0) {
    console.log('🔄 reconstructContent: No line data provided');
    return '';
  }
  
  try {
    // Extract Delta content from each line
    const deltaContents = lineData.map(line => {
      if (!line) return null;
      
      // Process if content is a string that looks like a Delta
      if (typeof line.content === 'string' && line.content.includes('"ops"')) {
        try {
          return parseDeltaIfPossible(line.content);
        } catch (e) {
          console.error('🔄 Error parsing Delta content:', e);
          return null;
        }
      }
      // Already a Delta object
      else if (isDeltaObject(line.content)) {
        return line.content;
      }
      // Plain text content
      else if (typeof line.content === 'string') {
        return { ops: [{ insert: line.content }] };
      }
      
      return null;
    }).filter(Boolean);
    
    if (deltaContents.length > 0) {
      console.log('🔄 reconstructContent: Combining', deltaContents.length, 'Deltas');
      return combineDeltaContents(deltaContents) || '';
    } else {
      console.log('🔄 reconstructContent: No valid Delta content found');
      return '';
    }
  } catch (error) {
    console.error('🔄 Error reconstructing content:', error);
    return '';
  }
};
