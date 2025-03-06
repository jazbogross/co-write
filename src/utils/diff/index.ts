
/**
 * diff module index.ts - Exports all diff functionality
 */

// Define DiffOperation and DiffChange types
export type DiffOperation = 'add' | 'delete' | 'equal' | 'modify';

export interface DiffChange {
  type: DiffOperation;
  text: string;
  index: number;
  originalText?: string;
}

// Export types
export * from './diffManagerTypes';

// Re-export all diff utilities
export * from './contentDiff';
export * from './DiffManager';
export * from './changeClassification';
export * from './diffTestUtils';
export * from './changeDetection';
export * from './lineGrouping';
