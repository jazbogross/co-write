
import { useRef, useState } from 'react';

/**
 * Hook for managing draft loading state
 */
export const useDraftLoadingState = () => {
  const [draftLoadAttempted, setDraftLoadAttempted] = useState<boolean>(false);
  const isLoadingDrafts = useRef<boolean>(false);
  
  const markLoadingStarted = () => {
    isLoadingDrafts.current = true;
  };
  
  const markLoadingComplete = () => {
    isLoadingDrafts.current = false;
    setDraftLoadAttempted(true);
  };
  
  const resetLoadingState = () => {
    isLoadingDrafts.current = false;
    setDraftLoadAttempted(false);
  };
  
  return {
    draftLoadAttempted,
    isLoadingDrafts: isLoadingDrafts.current,
    markLoadingStarted,
    markLoadingComplete,
    resetLoadingState
  };
};
