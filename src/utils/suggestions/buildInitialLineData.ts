
import { LineData } from '@/types/lineTypes';

/**
 * Build initial line data structure
 */
export const buildInitialLineData = (
  originalLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
): {
  lineDataMap: Map<string, LineData>;
  initialLineData: LineData[];
} => {
  // Initialize maps and arrays
  const lineDataMap = new Map<string, LineData>();
  let initialLineData: LineData[] = [];
  
  // Process original lines
  originalLines.forEach((line, index) => {
    const lineUuid = line.uuid;
    
    // Create LineData entry
    const lineDataItem: LineData = {
      uuid: lineUuid,
      lineNumber: index + 1,
      content: line.content,
      originalAuthor: null,
      editedBy: [],
      hasDraft: false
    };
    
    // Add to map and array
    lineDataMap.set(lineUuid, lineDataItem);
    initialLineData.push(lineDataItem);
  });
  
  return { lineDataMap, initialLineData };
};
