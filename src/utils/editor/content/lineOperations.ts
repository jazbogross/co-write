
/**
 * Utilities for working with lines of text
 */

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
