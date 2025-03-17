/**
 * Utilities for managing line UUIDs during editing operations
 */

import { LineUuidMap } from './LineUuidMap';
import { LineUuidPreserver } from './LineUuidPreserver';

// Re-export imported classes for backward compatibility
export { LineUuidMap } from './LineUuidMap';
export { LineUuidPreserver } from './LineUuidPreserver';

/**
 * Ensures all lines have UUIDs, generating new ones as needed
 */
export const ensureAllLinesHaveUuids = (
  elements: HTMLElement[],
  getExistingUuid?: (lineIndex: number) => string | undefined
): void => {
  elements.forEach((element, index) => {
    if (!element.hasAttribute('data-line-uuid')) {
      let uuid: string;
      
      // Try to get UUID from existing data if provided
      if (getExistingUuid) {
        const existingUuid = getExistingUuid(index);
        if (existingUuid) {
          uuid = existingUuid;
        } else {
          uuid = crypto.randomUUID();
        }
      } else {
        uuid = crypto.randomUUID();
      }
      
      element.setAttribute('data-line-uuid', uuid);
    }
  });
};

/**
 * Generate a UUID for a new line
 */
export const generateLineUuid = (): string => {
  return crypto.randomUUID();
};

/**
 * Handle UUID assignment for line split operations
 */
export const handleLineSplit = (
  originalElement: HTMLElement,
  newElement: HTMLElement
): void => {
  // Original line keeps its UUID
  const originalUuid = originalElement.getAttribute('data-line-uuid');
  
  // New line gets a new UUID
  const newUuid = generateLineUuid();
  newElement.setAttribute('data-line-uuid', newUuid);
  
  // Log for debugging
  console.log(`Line split: Original UUID ${originalUuid}, new line UUID ${newUuid}`);
};

/**
 * Handle UUID assignment when lines are merged
 */
export const handleLineMerge = (
  remainingElement: HTMLElement,
  removedElementUuid: string
): void => {
  // The remaining element keeps its UUID
  const remainingUuid = remainingElement.getAttribute('data-line-uuid');
  
  // Log the merge for debugging
  console.log(`Line merge: Keeping UUID ${remainingUuid}, removed line UUID ${removedElementUuid}`);
};
