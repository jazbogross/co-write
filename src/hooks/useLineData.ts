
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { useDrafts } from './useDrafts';
import { useEditorInit } from './useEditorInit';
import { useLineDataInit } from './useLineDataInit';
import { useLineMatching } from './useLineMatching';
import { isDeltaObject } from '@/utils/editor';

export type { LineData } from '@/types/lineTypes';

export const useLineData = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null,
  isAdmin: boolean = false
) => {
  console.log('🔠 useLineData: Hook called with', { scriptId, userId, isAdmin });
  
  const previousContentRef = useRef<string[]>([]);
  const uuidAssignmentStats = useRef({
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  });

  // Use the updated modularized hooks and pass isAdmin flag
  const { 
    lineData, 
    setLineData, 
    isLoading,
    error,
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts,
    isInitialized
  } = useLineDataInit({
    scriptId,
    initialContent: originalContent,
    userId,
    isAdmin
  });
  
  const { matchAndAssignLines } = useLineMatching(userId);
  const { loadDraftsForCurrentUser } = useDrafts();
  const { initializeEditor } = useEditorInit(lineData, isInitialized);

  const updateLineContents = useCallback((newContents: any[], quill: any) => {
    console.log('🔠 useLineData: updateLineContents called with', { 
      newContentsLength: newContents.length, 
      hasQuill: !!quill
    });
    
    setLineData(prevData => {
      if (newContents.length === 0) {
        console.log('🔠 useLineData: Empty content received, preserving existing data');
        return prevData;
      }

      console.log(`🔠 useLineData: Prev data length: ${prevData.length}, new contents length: ${newContents.length}`);
      
      // Log first few content items
      newContents.slice(0, 3).forEach((content, i) => {
        console.log(`🔠 Content ${i+1} type:`, 
          typeof content, 
          isDeltaObject(content) ? 'isDelta' : 'notDelta',
          'ops:', content.ops ? content.ops.length : 'N/A'
        );
      });

      // In the Delta approach, we only need one line that contains the full Delta
      const newData: LineData[] = [{
        uuid: prevData.length > 0 ? prevData[0].uuid : uuidv4(),
        lineNumber: 1,
        content: newContents[0] || { ops: [{ insert: '\n' }] },
        originalAuthor: userId,
        editedBy: prevData.length > 0 ? prevData[0].editedBy || [] : [],
        hasDraft: true
      }];
      
      console.log(`🔠 useLineData: Returning ${newData.length} updated lines`);
      
      // Log the first few new data items
      newData.slice(0, 3).forEach((item, i) => {
        console.log(`🔠 New data item ${i+1}:`, {
          uuid: item.uuid,
          lineNumber: item.lineNumber,
          contentType: typeof item.content,
          isDelta: isDeltaObject(item.content),
          preview: typeof item.content === 'string' 
            ? item.content.substring(0, 30)
            : JSON.stringify(item.content).substring(0, 30) + '...'
        });
      });
      
      return newData;
    });
  }, [setLineData, userId]);

  const updateLineContent = useCallback((lineIndex: number, newContent: string) => {
    console.log(`🔠 useLineData: updateLineContent for line ${lineIndex}`);
    
    setLineData(prevData => {
      const newData = [...prevData];
      
      // For Delta approach, we just update the single line content
      if (newData.length === 0) {
        const newUuid = uuidv4();
        console.log(`🔠 useLineData: Creating new line with UUID ${newUuid}`);
        
        newData.push({
          uuid: newUuid,
          lineNumber: 1,
          content: newContent,
          originalAuthor: userId,
          editedBy: [],
          hasDraft: true
        });
      } else {
        const existingLine = newData[0];
        console.log(`🔠 useLineData: Updating line with UUID ${existingLine.uuid}`);
        
        newData[0] = {
          ...existingLine,
          content: newContent,
          hasDraft: true,
          editedBy: userId && existingLine.editedBy && !existingLine.editedBy.includes(userId)
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy || []
        };
      }
      
      return newData;
    });
  }, [userId]);

  // Updated to use the new function from useLineDataInit
  const loadUserDrafts = useCallback(() => {
    console.log('🔠 useLineData: loadUserDrafts called');
    return loadDrafts();
  }, [loadDrafts]);

  return { 
    lineData, 
    setLineData, 
    updateLineContent, 
    updateLineContents,
    loadDraftsForCurrentUser: loadUserDrafts,
    isDataReady: isInitialized && !isLoading,
    initializeEditor
  };
};
