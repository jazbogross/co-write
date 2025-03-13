
import { LineData } from '@/types/lineTypes';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import { enterAtZeroStrategy } from './enterAtZeroStrategy';
import { nonEmptyLineStrategy } from './nonEmptyLineStrategy';

/**
 * Finds matching strategy for line operations
 */
export const findMatchingStrategy = (index: number, operation: any) => {
  // Check each strategy in order
  if (enterAtZeroStrategy.applies(index, operation)) {
    return enterAtZeroStrategy;
  }
  
  // Default strategy
  return nonEmptyLineStrategy;
};

/**
 * Exports all strategies
 */
export const lineMatchingStrategies = {
  enterAtZeroStrategy,
  nonEmptyLineStrategy
};
