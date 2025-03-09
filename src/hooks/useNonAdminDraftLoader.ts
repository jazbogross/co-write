import { useRef, useEffect } from 'react';
import { LineData } from '@/types/lineTypes';
import { loadUserDrafts } from '@/utils/suggestions/loadUserDrafts';

/**
 * Hook for non-admin draft loading with race condition protection
 */
export const useNonAdminDraftLoader = () => {
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup any pending operations on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const loadNonAdminDrafts = async (
    scriptId: string,
    userId: string | null,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>
  ) => {
    // Prevent concurrent loading attempts
    if (loadingRef.current) {
      console.log('🔍 DEBUG: Draft loading already in progress, skipping');
      return false;
    }

    // Cancel any existing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    
    console.log('🔍 DEBUG: Loading non-admin drafts from script_suggestions table');
    
    if (!scriptId || !userId) {
      console.log('🔍 DEBUG: Missing scriptId or userId, aborting draft load');
      return false;
    }

    loadingRef.current = true;
    
    try {
      // Load user drafts with abort signal
      console.log('🔍 DEBUG: Calling loadUserDrafts to fetch draft data from script_suggestions');
      const draftLines = await loadUserDrafts(
        scriptId, 
        userId, 
        contentToUuidMapRef,
        abortControllerRef.current.signal
      );
      
      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('🔍 DEBUG: Draft loading operation was aborted');
        return false;
      }
      
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
      if (error.name === 'AbortError') {
        console.log('🔍 DEBUG: Draft loading was aborted');
      } else {
        console.error('🔍 DEBUG: Error loading non-admin drafts from script_suggestions:', error);
      }
      return false;
    } finally {
      loadingRef.current = false;
      // Clear abort controller if operation completed normally
      if (!abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  };

  return { loadNonAdminDrafts };
};
