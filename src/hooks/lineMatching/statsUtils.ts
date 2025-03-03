
/**
 * Generate an empty stats template
 */
export const generateStatsTemplate = () => {
  return {
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  };
};

/**
 * Update global stats with line stats
 */
export const updateMatchStats = (globalStats: any, lineStats: any) => {
  if (!lineStats) return;
  
  // Update counts
  globalStats.preserved += lineStats.preserved || 0;
  globalStats.regenerated += lineStats.regenerated || 0;
  
  // Update strategy counts
  if (lineStats.matchStrategy) {
    Object.entries(lineStats.matchStrategy).forEach(([key, value]) => {
      globalStats.matchStrategy[key] = (globalStats.matchStrategy[key] || 0) + (value as number);
    });
  }
};

/**
 * Record strategy usage in stats
 */
export const recordStrategyUsage = (stats: any, strategy: string) => {
  stats.matchStrategy[strategy] = (stats.matchStrategy[strategy] || 0) + 1;
};
