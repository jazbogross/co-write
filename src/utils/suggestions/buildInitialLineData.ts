
import { LineData } from '@/types/lineTypes';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Builds initial line data from original script content lines
 */
export const buildInitialLineData = (
  originalLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
): { 
  lineDataMap: Map<string, LineData>,
  uuidToLineNumberMap: Map<string, number>,
  initialLineData: LineData[] 
} => {
  const lineDataMap = new Map<string, LineData>();
  const uuidToLineNumberMap = new Map<string, number>();
  
  const initialLineData = originalLines.map((line: any) => {
    const uuid = line.id;
    const lineData: LineData = {
      uuid: uuid,
      lineNumber: line.line_number,
      content: line.content,
      originalAuthor: null,
      editedBy: [],
      hasDraft: false
    };
    
    // Add to maps for later lookup
    lineDataMap.set(uuid, lineData);
    uuidToLineNumberMap.set(uuid, line.line_number);
    
    // Store content to UUID mapping for later line tracking
    if (typeof line.content === 'string') {
      contentToUuidMapRef.current.set(line.content, uuid);
    }
    
    return lineData;
  });
  
  logDraftLoading(`Created ${initialLineData.length} initial line data objects`);
  
  return { 
    lineDataMap, 
    uuidToLineNumberMap, 
    initialLineData 
  };
};
