
import { LineData } from '@/types/lineTypes';

// Placeholder for non-empty line matching strategy
export const matchNonEmptyLines = (
  contents: any[],
  prevData: LineData[],
  usedIndices: Set<number>,
  newData: LineData[],
  contentToUuidMap: Map<string, string>,
  domUuidMap: Map<number, string>,
  editor: any,
  stats: any,
  userId: string | null
) => {
  return newData;
};
