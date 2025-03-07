
import { useLineDataCore } from './useLineDataCore';
import { useLineDataInitialization } from './useLineDataInit';
import { useDraftManagement } from './useDraftManagement';
import { useEditorInit } from '../useEditorInit';
import { LineData } from '@/types/lineTypes';

export type { LineData } from '@/types/lineTypes';

export const useLineData = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null,
  isAdmin: boolean = false
) => {
  console.log('🔠 useLineData: Hook called with', { scriptId, userId, isAdmin });
  
  // Core line data state and functions
  const {
    lineData,
    setLineData,
    isDataReady,
    setIsDataReady,
    contentToUuidMapRef,
    lastLineCountRef,
    previousContentRef,
    uuidAssignmentStats,
    updateLineContent,
    updateLineContents
  } = useLineDataCore(scriptId, userId, isAdmin);

  // Initialization functionality
  const { 
    loadDrafts
  } = useLineDataInitialization(scriptId, originalContent, userId, isAdmin);
  
  // Draft management
  const { 
    loadDraftsForCurrentUser 
  } = useDraftManagement(
    scriptId, 
    userId, 
    setLineData, 
    contentToUuidMapRef,
    loadDrafts
  );
  
  // Editor initialization
  const { initializeEditor } = useEditorInit(lineData, isDataReady);

  return { 
    lineData, 
    setLineData, 
    updateLineContent, 
    updateLineContents,
    loadDraftsForCurrentUser,
    isDataReady,
    initializeEditor
  };
};
