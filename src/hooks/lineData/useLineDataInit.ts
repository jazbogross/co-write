
import { useCallback } from 'react';
import { useLineDataInit as useLineDataInitCore } from '../useLineDataInit';
import { isDeltaObject, safelyParseDelta } from '@/utils/editor';
import { isStringifiedDelta, parseStringifiedDeltaIfPossible } from '@/utils/lineProcessing/mappingUtils';

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
  
  // Check if originalContent might be a stringified Delta
  let processedContent = originalContent;
  if (isStringifiedDelta(originalContent)) {
    try {
      console.log('📊 useLineDataInitialization: Original content appears to be a stringified Delta, attempting to parse');
      const parsedContent = parseStringifiedDeltaIfPossible(originalContent);
      if (parsedContent && Array.isArray(parsedContent.ops)) {
        console.log('📊 useLineDataInitialization: Successfully parsed Delta from original content');
        processedContent = parsedContent; // Use the parsed Delta object directly
      }
    } catch (error) {
      console.error('📊 useLineDataInitialization: Error parsing possible Delta content:', error);
    }
  }
  
  // Use the core initialization hook
  const { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts 
  } = useLineDataInitCore(scriptId, processedContent, userId, isAdmin);
  
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
