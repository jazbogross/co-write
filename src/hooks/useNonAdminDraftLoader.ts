
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
    console.log('🔍 DEBUG: Loading non-admin drafts from script_suggestions table');
    
    if (!scriptId || !userId) {
      console.log('🔍 DEBUG: Missing scriptId or userId, aborting draft load');
      return false;
    }
    
    try {
      // Load user drafts - enhanced error handling
      console.log('🔍 DEBUG: Calling loadUserDrafts to fetch draft data from script_suggestions');
      const draftLines = await loadUserDrafts(scriptId, userId, contentToUuidMapRef);
      
      if (!draftLines || !Array.isArray(draftLines)) {
        console.log('🔍 DEBUG: No valid draft lines returned from loadUserDrafts');
        return false;
      }
      
      if (draftLines.length > 0) {
        console.log(`🔍 DEBUG: Successfully loaded ${draftLines.length} draft lines from script_suggestions`);
        
        // Set the line data with the sorted draft lines
        setLineData(draftLines);
        return true;
      } else {
        console.log('🔍 DEBUG: No draft lines found in script_suggestions table');
        return false;
      }
    } catch (error) {
      console.error('🔍 DEBUG: Error loading non-admin drafts from script_suggestions:', error);
      return false;
    }
  };

  return { loadNonAdminDrafts };
};
