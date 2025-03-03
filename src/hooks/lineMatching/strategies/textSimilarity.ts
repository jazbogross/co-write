
/**
 * Calculates text similarity between two strings
 * Uses a combination of exact match, prefix matching, and simple overlap detection
 */
export const calculateTextSimilarity = (a: string, b: string): number => {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  // For longer content, check for prefix matching
  if (a.length > 10 && b.length > 10) {
    // Check for common prefix
    let prefixLen = 0;
    const minLen = Math.min(a.length, b.length);
    while (prefixLen < minLen && a[prefixLen] === b[prefixLen]) {
      prefixLen++;
    }
    
    // If we have a substantial prefix match (at least 70% of the shorter string),
    // consider it a good match
    if (prefixLen >= minLen * 0.7) {
      return 0.9;
    }
    
    // If we have a decent prefix match, it's still a good signal
    if (prefixLen >= 10) {
      return 0.7 + (prefixLen / Math.max(a.length, b.length) * 0.3);
    }
  }
  
  // For shorter strings or if prefix matching fails, check for content overlap
  if (a.includes(b) || b.includes(a)) {
    const overlapScore = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.5 + (overlapScore * 0.4);
  }
  
  // Fall back to character-by-character comparison for very short strings
  let sameChars = 0;
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) sameChars++;
  }
  
  return sameChars / maxLen;
};
