
import { LineData } from '@/types/lineTypes';

/**
 * Find matches based on DOM UUIDs
 */
export const findDomUuidMatches = (
  lineIndex: number,
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  domUuidMap?: Map<number, string>
): { index: number; similarity: number; matchStrategy: string } | null => {
  if (!domUuidMap || !domUuidMap.has(lineIndex)) {
    return null;
  }
  
  const uuid = domUuidMap.get(lineIndex);
  if (!uuid) return null;
  
  const uuidMatchIndex = prevLineData.findIndex(line => line.uuid === uuid);
  
  if (uuidMatchIndex >= 0 && !excludeIndices.has(uuidMatchIndex)) {
    return { index: uuidMatchIndex, similarity: 0.95, matchStrategy: 'dom-uuid' };
  }
  
  return null;
}
