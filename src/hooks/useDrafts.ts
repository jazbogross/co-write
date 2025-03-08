
import { useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { loadUserDrafts } from '@/utils/suggestions/loadUserDrafts';

export const useDrafts = () => {
  const isLoadingDrafts = useRef<boolean>(false);
  
  const loadDraftsForCurrentUser = async (
    scriptId: string, 
    userId: string | null, 
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
    loadDraftsImplementation: (userId: string | null) => Promise<void>,
    isAdmin: boolean = false
  ) => {
    if (!scriptId || !userId || isLoadingDrafts.current) return;
    
    isLoadingDrafts.current = true;
    console.log('Loading drafts for user:', userId, 'isAdmin:', isAdmin);
    
    try {
      if (isAdmin) {
        // For admin users, use the implementation from useLineDataInit
        // that loads drafts from script_content
        console.log('Using admin draft loading implementation');
        await loadDraftsImplementation(userId);
      } else {
        // For non-admin users, load drafts from script_suggestions
        console.log('Using non-admin draft loading from script_suggestions');
        const draftLines = await loadUserDrafts(scriptId, userId, contentToUuidMapRef);
        
        if (draftLines.length > 0) {
          console.log(`Loaded ${draftLines.length} draft lines for non-admin user`);
          setLineData(draftLines);
        } else {
          console.log('No draft lines found for non-admin user');
        }
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      isLoadingDrafts.current = false;
    }
  };

  return { loadDraftsForCurrentUser };
};
