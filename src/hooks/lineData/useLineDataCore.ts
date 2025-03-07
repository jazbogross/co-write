
import { useState, useCallback, useRef, useEffect } from 'react';
import { LineData } from '@/types/lineTypes';
import { useLineMatching } from '../useLineMatching';
import { useLineAssignment } from './useLineAssignment';

export const useLineDataCore = (
  scriptId: string, 
  userId: string | null,
  isAdmin: boolean = false
) => {
  console.log('🔠 useLineDataCore: Hook called with', { scriptId, userId, isAdmin });
  
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [isDataReady, setIsDataReady] = useState(false);
  
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);
  const previousContentRef = useRef<string[]>([]);
  const uuidAssignmentStats = useRef({
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  });

  const { matchAndAssignLines } = useLineMatching(userId);
  const { updateLineContent, updateLineContents } = useLineAssignment(
    lineData,
    setLineData,
    contentToUuidMapRef,
    lastLineCountRef,
    previousContentRef,
    uuidAssignmentStats,
    userId,
    matchAndAssignLines
  );

  // Set data ready when we have a valid scriptId and either lineData or initialization is complete
  useEffect(() => {
    if (scriptId && !isDataReady) {
      console.log('🔠 useLineDataCore: Setting initial data ready state');
      setIsDataReady(true);
    }
  }, [scriptId, isDataReady]);

  return {
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
  };
};
