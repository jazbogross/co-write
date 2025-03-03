
/**
 * Utilities for debugging and logging Delta objects
 */
import { validateDelta } from '../validation/deltaValidation';
import { extractPlainTextFromDelta } from '../contentUtils';

/**
 * Logs the structure of a Delta object for debugging
 */
export const logDeltaStructure = (content: any | null): void => {
  if (!content) {
    console.log("🔶 logDeltaStructure: Delta content is null or empty");
    return;
  }
  
  try {
    const result = validateDelta(content);
    
    if (result.valid && result.parsed) {
      console.log("🔶 Delta structure:", {
        valid: true,
        opsCount: result.parsed.ops.length,
        firstOp: result.parsed.ops[0] || null,
        firstFewOps: result.parsed.ops.slice(0, 3).map(op => 
          typeof op.insert === 'string' 
            ? { insert: op.insert.substring(0, 20) + (op.insert.length > 20 ? '...' : ''), attributes: op.attributes }
            : op
        )
      });
    } else {
      console.log("🔶 Not a valid delta object:", {
        originalType: result.originalType,
        reason: result.reason,
        preview: typeof content === 'string' 
          ? content.substring(0, 40) + (content.length > 40 ? '...' : '')
          : content
      });
    }
  } catch (e) {
    console.error("🔶 Error parsing delta structure:", e);
  }
};
