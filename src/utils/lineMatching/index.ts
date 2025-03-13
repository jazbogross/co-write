
// Export utility functions
export { isContentEmpty, getPlainTextContent } from './contentUtils';
export { handleEnterAtZero } from './enterAtZeroStrategy';
export { matchNonEmptyLines } from './nonEmptyLineStrategy';
export { matchRemainingLines } from './positionFallbackStrategy';

// Helper to generate stats template
export const generateStatsTemplate = () => ({
  preserved: 0,
  regenerated: 0,
  matchStrategy: {} as Record<string, number>
});

// Helper for special operations handling
export const handleSpecialOperations = (
  operation: any,
  contents: any[],
  prevData: any[],
  usedIndices: Set<number>,
  userId: string | null,
  editor: any
) => {
  return {
    success: false,
    stats: generateStatsTemplate()
  };
};
