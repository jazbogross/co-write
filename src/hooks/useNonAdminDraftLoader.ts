
import { LineData } from '@/types/lineTypes';
import { loadUserDrafts } from '@/utils/suggestions/loadUserDrafts';

/**
 * Hook for non-admin draft loading
 */
export const useNonAdminDraftLoader = () => {
  const loadNonAdminDrafts = async (
    scriptId: string,
    userId: string | null,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>
  ) => {
    console.log('🔍 DEBUG: Using non-admin draft loading from script_suggestions');
    console.log('🔍 DEBUG: Params:', { scriptId, userId, mapSize: contentToUuidMapRef.current.size });
    
    if (!scriptId || !userId) {
      console.log('🔍 DEBUG: Missing scriptId or userId, aborting draft load');
      return false;
    }
    
    try {
      // Get the current lineData before loading drafts
      setLineData(prevLineData => {
        console.log('🔍 DEBUG: Current lineData before loading drafts:', prevLineData.length, 'lines');
        
        if (prevLineData.length > 0) {
          // Log sample of current lineData
          const sample = prevLineData[0];
          console.log('🔍 DEBUG: Current lineData sample:', {
            uuid: sample.uuid,
            contentType: typeof sample.content,
            preview: typeof sample.content === 'string' 
              ? sample.content.substring(0, 30) 
              : JSON.stringify(sample.content).substring(0, 30) + '...',
            hasDraft: sample.hasDraft
          });
        }
        
        return prevLineData;
      });
      
      // Load user drafts
      const draftLines = await loadUserDrafts(scriptId, userId, contentToUuidMapRef);
      
      if (draftLines.length > 0) {
        console.log(`🔍 DEBUG: Loaded ${draftLines.length} draft lines for non-admin user`);
        
        // Log first few lines for debugging
        draftLines.slice(0, 3).forEach((line, i) => {
          console.log(`🔍 DEBUG: Draft line ${i+1}:`, {
            uuid: line.uuid,
            lineNumber: line.lineNumber,
            contentType: typeof line.content,
            hasDraft: line.hasDraft,
            preview: typeof line.content === 'string' 
              ? line.content.substring(0, 30) 
              : JSON.stringify(line.content).substring(0, 30) + '...'
          });
        });
        
        // Compare lineData before and after setting
        const beforeSetLineData = JSON.stringify(draftLines).length;
        setLineData(draftLines);
        console.log(`🔍 DEBUG: Set lineData with ${draftLines.length} lines (${beforeSetLineData} bytes)`);
        return true;
      } else {
        console.log('🔍 DEBUG: No draft lines found for non-admin user');
        return false;
      }
    } catch (error) {
      console.error('🔍 DEBUG: Error loading non-admin drafts:', error);
      return false;
    }
  };

  return { loadNonAdminDrafts };
};
