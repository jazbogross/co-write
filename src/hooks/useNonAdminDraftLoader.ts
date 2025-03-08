
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
    if (!scriptId || !userId) return;
    
    const draftLines = await loadUserDrafts(scriptId, userId, contentToUuidMapRef);
    
    if (draftLines.length > 0) {
      console.log(`Loaded ${draftLines.length} draft lines for non-admin user`);
      setLineData(draftLines);
      return true;
    } else {
      console.log('No draft lines found for non-admin user');
      return false;
    }
  };

  return { loadNonAdminDrafts };
};
