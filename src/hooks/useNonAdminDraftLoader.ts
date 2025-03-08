
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
    console.log('Using non-admin draft loading from script_suggestions');
    if (!scriptId || !userId) return false;
    
    try {
      const draftLines = await loadUserDrafts(scriptId, userId, contentToUuidMapRef);
      
      if (draftLines.length > 0) {
        console.log(`Loaded ${draftLines.length} draft lines for non-admin user`);
        
        // Log first few lines for debugging
        draftLines.slice(0, 3).forEach((line, i) => {
          console.log(`Draft line ${i+1}:`, {
            uuid: line.uuid,
            lineNumber: line.lineNumber,
            contentType: typeof line.content,
            preview: typeof line.content === 'string' 
              ? line.content.substring(0, 30) 
              : JSON.stringify(line.content).substring(0, 30) + '...'
          });
        });
        
        setLineData(draftLines);
        return true;
      } else {
        console.log('No draft lines found for non-admin user');
        return false;
      }
    } catch (error) {
      console.error('Error loading non-admin drafts:', error);
      return false;
    }
  };

  return { loadNonAdminDrafts };
};
