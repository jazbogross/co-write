
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface LineData {
  uuid: string;
  lineNumber: number;
  content: string;
  originalAuthor: string | null;
  editedBy: string[];
  draft?: string | null;
  lineNumberDraft?: number | null;
}

export const useLineData = (scriptId: string, originalContent: string, userId: string | null) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const previousContentRef = useRef<string[]>([]);
  const isLoadingDrafts = useRef<boolean>(false);
  
  const originalUuidsRef = useRef<Map<string, string>>(new Map());
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());

  // This function will be called by TextEditor when it's ready to initialize
  // Returns true if data is ready, false if still loading
  const initializeEditor = useCallback((editor: any): boolean => {
    if (!isDataReady || !editor) return false;
    
    console.log('**** UseLineData.ts **** Initializing editor with UUIDs from database');
    
    try {
      // Only assign UUIDs to DOM elements if we have them from the database
      const lines = editor.getLines(0);
      lines.forEach((line: any, index: number) => {
        if (line.domNode && index < lineData.length) {
          const uuid = lineData[index].uuid;
          // Only set if the DOM element doesn't already have a uuid or has a wrong one
          const currentUuid = line.domNode.getAttribute('data-line-uuid');
          if (!currentUuid || currentUuid !== uuid) {
            console.log(`**** UseLineData.ts **** Setting line ${index + 1} UUID: ${uuid}`);
            line.domNode.setAttribute('data-line-uuid', uuid);
            
            // Also set the line index attribute
            line.domNode.setAttribute('data-line-index', String(index + 1));
          }
          
          // Ensure our tracking maps are updated
          if (editor.lineTracking) {
            editor.lineTracking.setLineUuid(index + 1, uuid);
          }
        }
      });
      return true;
    } catch (error) {
      console.error('**** UseLineData.ts **** Error initializing editor UUIDs:', error);
      return false;
    }
  }, [isDataReady, lineData]);

  const loadDraftsForCurrentUser = async () => {
    if (!scriptId || !userId || isLoadingDrafts.current) return;
    
    isLoadingDrafts.current = true;
    console.log('Loading drafts for user:', userId);
    
    try {
      let draftData;
      
      const { data: adminDrafts, error: adminError } = await supabase
        .from('script_content')
        .select('id, line_number, line_number_draft, content, draft')
        .eq('script_id', scriptId)
        .eq('original_author', userId)
        .order('line_number_draft', { ascending: true, nullsFirst: false });
        
      if (adminError) throw adminError;
      
      if (adminDrafts && adminDrafts.length > 0 && adminDrafts.some(draft => draft.draft !== null)) {
        draftData = adminDrafts;
      } else {
        const { data: editorDrafts, error: editorError } = await supabase
          .from('script_suggestions')
          .select('id, line_uuid, line_number, line_number_draft, content, draft')
          .eq('script_id', scriptId)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('line_number_draft', { ascending: true, nullsFirst: false });
          
        if (editorError) throw editorError;
        
        if (editorDrafts && editorDrafts.length > 0 && editorDrafts.some(draft => draft.draft !== null)) {
          draftData = editorDrafts;
        }
      }
      
      if (draftData && draftData.length > 0) {
        setLineData(prevData => {
          const newData = [...prevData];
          const newDataMap = new Map(newData.map(line => [line.uuid, line]));
          
          draftData.forEach(draft => {
            const lineId = draft.id || draft.line_uuid;
            
            if (lineId && newDataMap.has(lineId)) {
              const line = newDataMap.get(lineId)!;
              if (draft.draft && draft.draft !== '{deleted-uuid}') {
                line.content = draft.draft;
                line.lineNumber = draft.line_number_draft || line.lineNumber;
                
                contentToUuidMapRef.current.set(draft.draft, lineId);
              } else if (draft.draft === '{deleted-uuid}') {
                newDataMap.delete(lineId);
              }
            } else if (draft.draft && draft.draft !== '{deleted-uuid}') {
              const newUuid = lineId || uuidv4();
              newDataMap.set(newUuid, {
                uuid: newUuid,
                lineNumber: draft.line_number_draft || newData.length + 1,
                content: draft.draft,
                originalAuthor: userId,
                editedBy: []
              });
              
              contentToUuidMapRef.current.set(draft.draft, newUuid);
            }
          });
          
          const updatedData = Array.from(newDataMap.values());
          updatedData.sort((a, b) => a.lineNumber - b.lineNumber);
          updatedData.forEach((line, index) => {
            line.lineNumber = index + 1;
          });
          
          return updatedData;
        });
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      isLoadingDrafts.current = false;
    }
  };

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) {
        console.log('**** UseLineData.ts **** fetchLineData aborted because either no scriptId or already initialized.');
        return;
      }
      
      console.log('**** UseLineData.ts **** fetchLineData called. scriptId:', scriptId, 'initialized:', initialized);
      setIsDataReady(false); // Reset ready state while loading
      
      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('*')
          .eq('script_id', scriptId)
          .order('line_number', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          console.log('**** UseLineData.ts **** Data fetched successfully. Lines count:', data.length);
          const formattedLineData = data.map(line => ({
            uuid: line.id,
            lineNumber: line.line_number,
            content: line.content,
            originalAuthor: line.original_author || null,
            editedBy: Array.isArray(line.edited_by) ? line.edited_by.map(String) : [],
            draft: line.draft,
            lineNumberDraft: line.line_number_draft
          }));
          
          formattedLineData.forEach(line => {
            console.log(`**** UseLineData.ts **** Fetched data for line ${line.lineNumber} (zero-indexed): ${JSON.stringify(line)}`);
            originalUuidsRef.current.set(line.uuid, line.uuid);
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          setLineData(formattedLineData);
          previousContentRef.current = formattedLineData.map(line => line.content);
        } else {
          console.log('**** UseLineData.ts **** No data found, creating initial line data');
          const initialUuid = uuidv4();
          const initialLineData = [{
            uuid: initialUuid,
            lineNumber: 1,
            content: originalContent,
            originalAuthor: userId,
            editedBy: []
          }];
          
          originalUuidsRef.current.set(initialUuid, initialUuid);
          contentToUuidMapRef.current.set(originalContent, initialUuid);
          
          setLineData(initialLineData);
          previousContentRef.current = [originalContent];
        }
        setInitialized(true);
        setIsDataReady(true); // Mark data as ready for TextEditor to use
        console.log('**** UseLineData.ts **** Data is now ready for editor to use');
      } catch (error) {
        console.error('**** UseLineData.ts **** Error fetching line data:', error);
        setInitialized(true);
        
        // Even if there's an error, try to initialize with some data
        if (lineData.length === 0) {
          const initialUuid = uuidv4();
          setLineData([{
            uuid: initialUuid,
            lineNumber: 1,
            content: originalContent,
            originalAuthor: userId,
            editedBy: []
          }]);
          setIsDataReady(true);
        }
      }
    };

    fetchLineData();
  }, [scriptId, originalContent, userId, initialized]);

  const findBestMatchingLine = (
    content: string, 
    prevLineData: LineData[], 
    excludeIndices: Set<number>
  ): { index: number, similarity: number } | null => {
    const existingUuid = contentToUuidMapRef.current.get(content);
    if (existingUuid) {
      const exactMatchIndex = prevLineData.findIndex(line => line.uuid === existingUuid);
      if (exactMatchIndex >= 0 && !excludeIndices.has(exactMatchIndex)) {
        return { index: exactMatchIndex, similarity: 1 };
      }
    }
    
    let bestMatch = { index: -1, similarity: 0 };
    
    const calculateSimilarity = (a: string, b: string): number => {
      if (a === b) return 1;
      if (!a || !b) return 0;
      
      if (a.length > 10 && b.length > 10) {
        let matchLen = 0;
        const minLen = Math.min(a.length, b.length);
        while (matchLen < minLen && a[matchLen] === b[matchLen]) {
          matchLen++;
        }
        return matchLen / Math.max(a.length, b.length);
      }
      
      return a === b ? 1 : 0;
    };
    
    for (let i = 0; i < prevLineData.length; i++) {
      if (excludeIndices.has(i)) continue;
      
      const similarity = calculateSimilarity(content, prevLineData[i].content);
      
      if (similarity === 1) {
        return { index: i, similarity: 1 };
      }
      
      if (similarity > bestMatch.similarity && similarity > 0.5) {
        bestMatch = { index: i, similarity };
      }
    }
    
    return bestMatch.index >= 0 ? bestMatch : null;
  };

  const updateLineContents = (newContents: string[], quill: any) => {
    setLineData(prevData => {
      const usedIndices = new Set<number>();
      const newData: LineData[] = [];
      
      for (let i = 0; i < newContents.length; i++) {
        const content = newContents[i];
        
        const match = findBestMatchingLine(content, prevData, usedIndices);
        
        if (match) {
          const matchIndex = match.index;
          usedIndices.add(matchIndex);
          
          const existingLine = prevData[matchIndex];
          newData.push({
            ...existingLine,
            lineNumber: i + 1,
            content,
            editedBy: content !== existingLine.content && userId && 
                     !existingLine.editedBy.includes(userId)
              ? [...existingLine.editedBy, userId]
              : existingLine.editedBy
          });
          
          contentToUuidMapRef.current.set(content, existingLine.uuid);
        } else {
          const newUuid = uuidv4();
          newData.push({
            uuid: newUuid,
            lineNumber: i + 1,
            content,
            originalAuthor: userId,
            editedBy: []
          });
          
          contentToUuidMapRef.current.set(content, newUuid);
          
          if (quill && quill.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, newUuid);
          }
        }
      }
      
      previousContentRef.current = newContents;
      
      return newData;
    });
  };

  const updateLineContent = (lineIndex: number, newContent: string) => {
    setLineData(prevData => {
      const newData = [...prevData];
      
      while (newData.length <= lineIndex) {
        const newUuid = uuidv4();
        newData.push({
          uuid: newUuid,
          lineNumber: newData.length + 1,
          content: '',
          originalAuthor: userId,
          editedBy: []
        });
        contentToUuidMapRef.current.set('', newUuid);
      }
      
      if (newData[lineIndex]) {
        const existingLine = newData[lineIndex];
        newData[lineIndex] = {
          ...existingLine,
          content: newContent,
          editedBy: userId && !existingLine.editedBy.includes(userId)
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy
        };
        
        contentToUuidMapRef.current.set(newContent, existingLine.uuid);
      }
      
      return newData;
    });
  };

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
