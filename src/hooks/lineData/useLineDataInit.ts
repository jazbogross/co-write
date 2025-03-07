
import { useCallback } from 'react';
import { useLineDataInit as useLineDataInitCore } from '../useLineDataInit';

export const useLineDataInitialization = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null,
  isAdmin: boolean = false
) => {
  // Use the core initialization hook
  const { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts 
  } = useLineDataInitCore(scriptId, originalContent, userId, isAdmin);
  
  // Return the initialization functionality
  return {
    lineData,
    setLineData,
    isDataReady,
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts
  };
};
