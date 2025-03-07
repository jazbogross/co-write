
import { useCallback } from 'react';
import { useLineDataInit as useLineDataInitCore } from '../useLineDataInit';

export const useLineDataInitialization = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null,
  isAdmin: boolean = false
) => {
  console.log('📊 useLineDataInitialization: Hook called with', { 
    scriptId, 
    originalContentLength: originalContent?.length || 0,
    userId, 
    isAdmin 
  });
  
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
