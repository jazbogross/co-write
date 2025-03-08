
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { useDraftLoadingState } from './useDraftLoadingState';
import { useAdminDraftLoader } from './useAdminDraftLoader';
import { useNonAdminDraftLoader } from './useNonAdminDraftLoader';

/**
 * Main drafts management hook that orchestrates different draft loading strategies
 */
export const useDrafts = () => {
  const { draftLoadAttempted, isLoadingDrafts, markLoadingStarted, markLoadingComplete } = useDraftLoadingState();
  const { loadAdminDrafts } = useAdminDraftLoader();
  const { loadNonAdminDrafts } = useNonAdminDraftLoader();
  
  /**
   * Loads drafts for the current user based on their role
   */
  const loadDraftsForCurrentUser = useCallback(async (
    scriptId: string, 
    userId: string | null, 
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
    loadDraftsImplementation: (userId: string | null) => Promise<void>,
    isAdmin: boolean = false
  ) => {
    if (!scriptId || !userId || isLoadingDrafts) return;
    
    markLoadingStarted();
    console.log('Loading drafts for user:', userId, 'isAdmin:', isAdmin);
    
    try {
      if (isAdmin) {
        // For admin users, use the implementation from useLineDataInit
        await loadAdminDrafts(userId, loadDraftsImplementation);
      } else {
        // For non-admin users, load drafts from script_suggestions
        await loadNonAdminDrafts(scriptId, userId, contentToUuidMapRef, setLineData);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      markLoadingComplete();
    }
  }, [isLoadingDrafts, markLoadingStarted, markLoadingComplete, loadAdminDrafts, loadNonAdminDrafts]);

  return { 
    loadDraftsForCurrentUser,
    draftLoadAttempted
  };
};
