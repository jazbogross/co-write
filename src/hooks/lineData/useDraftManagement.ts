
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { useDrafts } from '../useDrafts';

export const useDraftManagement = (
  scriptId: string,
  userId: string | null,
  setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  loadDraftsFunction: (userId: string | null) => Promise<void>
) => {
  const { loadDraftsForCurrentUser } = useDrafts();

  // Create the function to load user drafts
  const loadUserDrafts = useCallback(() => {
    console.log('🔠 useDraftManagement: loadUserDrafts called');
    return loadDraftsForCurrentUser(
      scriptId, 
      userId, 
      setLineData, 
      contentToUuidMapRef,
      loadDraftsFunction
    );
  }, [scriptId, userId, loadDraftsForCurrentUser, contentToUuidMapRef, loadDraftsFunction, setLineData]);

  return {
    loadDraftsForCurrentUser: loadUserDrafts
  };
};
