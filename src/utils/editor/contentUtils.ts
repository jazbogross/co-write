
/**
 * Utilities for working with content extraction and transformation
 */
import { DeltaContent, DeltaOp } from './types';
import { validateDelta, safelyParseDelta } from './deltaUtils';

/**
 * Extracts plain text from a Delta object or returns the string directly
 */
export const extractPlainTextFromDelta = (content: any | null): string => {
  console.log('🔷 extractPlainTextFromDelta: Processing content of type', typeof content);
  
  if (!content) {
    console.log('🔷 extractPlainTextFromDelta: Content is null or undefined, returning empty string');
    return '';
  }
  
  try {
    // For plain strings that don't look like Delta JSON, return directly
    if (typeof content === 'string' && 
        (!content.startsWith('{') || !content.includes('ops'))) {
      console.log('🔷 extractPlainTextFromDelta: Content is plain text, returning directly');
      return content;
    }
    
    // Try to parse as Delta
    const result = validateDelta(content);
    
    if (result.valid && result.parsed) {
      console.log('🔷 extractPlainTextFromDelta: Content is valid Delta, extracting text');
      return extractTextFromDeltaOps(result.parsed.ops);
    }
    
    // Fallback: If not Delta, return as string
    console.log('🔷 extractPlainTextFromDelta: Not a valid Delta, returning as string');
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (e) {
    console.error('🔷 extractPlainTextFromDelta: Error extracting text:', e);
    return typeof content === 'string' ? content : String(content);
  }
};

/**
 * Extracts text content from Delta operations
 */
export function extractTextFromDeltaOps(ops: DeltaOp[]): string {
  if (!Array.isArray(ops)) {
    console.log('🔷 extractTextFromDeltaOps: Ops is not an array, returning empty string');
    return '';
  }
  
  console.log('🔷 extractTextFromDeltaOps: Processing', ops.length, 'ops');
  
  let result = '';
  ops.forEach((op: DeltaOp) => {
    if (typeof op.insert === 'string') {
      result += op.insert;
    } else if (op.insert && typeof op.insert === 'object') {
      // Handle embeds or other non-string inserts
      result += ' ';
    }
  });
  
  // Ensure the result has a proper newline if needed
  if (result.length > 0 && !result.endsWith('\n')) {
    result += '\n';
  }
  
  console.log('🔷 extractTextFromDeltaOps: Extracted', result.length, 'characters');
  return result;
}

/**
 * Safely check if content is empty (handles both strings and Delta objects)
 */
export const isContentEmpty = (content: any): boolean => {
  console.log('🔷 isContentEmpty: Checking content of type', typeof content);
  
  const result = validateDelta(content);
  
  if (result.valid && result.parsed) {
    const plainText = extractTextFromDeltaOps(result.parsed.ops);
    const isEmpty = !plainText || !plainText.trim();
    console.log('🔷 isContentEmpty: Valid Delta, is empty:', isEmpty);
    return isEmpty;
  }
  
  // Handle strings
  if (typeof content === 'string') {
    const isEmpty = !content || !content.trim();
    console.log('🔷 isContentEmpty: String content, is empty:', isEmpty);
    return isEmpty;
  }
  
  // For other types (undefined, null, etc.)
  console.log('🔷 isContentEmpty: Other content type, treating as empty');
  return true;
};

/**
 * Get trimmed content regardless of content type (string or Delta)
 */
export const getTrimmedContent = (content: any): string => {
  console.log('🔷 getTrimmedContent: Processing content of type', typeof content);
  
  const result = validateDelta(content);
  
  if (result.valid && result.parsed) {
    const text = extractTextFromDeltaOps(result.parsed.ops).trim();
    console.log('🔷 getTrimmedContent: Valid Delta, trimmed text length:', text.length);
    return text;
  }
  
  const trimmed = typeof content === 'string' ? content.trim() : '';
  console.log('🔷 getTrimmedContent: String content, trimmed length:', trimmed.length);
  return trimmed;
};

/**
 * Split content into lines, preserving line breaks
 */
export const splitContentIntoLines = (content: string): string[] => {
  if (!content) {
    console.log('🔷 splitContentIntoLines: Empty content, returning empty array');
    return [];
  }
  
  const lines = content.split('\n');
  console.log('🔷 splitContentIntoLines: Split into', lines.length, 'lines');
  return lines;
};

/**
 * Join lines with proper line breaks
 */
export const joinLinesWithBreaks = (lines: string[]): string => {
  if (!lines || lines.length === 0) {
    console.log('🔷 joinLinesWithBreaks: No lines to join');
    return '';
  }
  
  const joined = lines.join('\n');
  console.log('🔷 joinLinesWithBreaks: Joined', lines.length, 'lines');
  return joined;
};
