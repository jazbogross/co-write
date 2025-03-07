
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { useLineMatching } from '../useLineMatching';
import { useLineAssignment } from './useLineAssignment';
import { isDeltaObject } from '@/utils/editor';

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
