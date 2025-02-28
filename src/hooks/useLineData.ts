
import { useState, useEffect, useRef } from 'react';
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
  const previousContentRef = useRef<string[]>([]);
  const isLoadingDrafts = useRef<boolean>(false);
  const originalUuidsRef = useRef<Map<string, string>>(new Map());

  // Function to load drafts for the current user
  const loadDraftsForCurrentUser = async () => {
    if (!scriptId || !userId || isLoadingDrafts.current) return;
    
    isLoadingDrafts.current = true;
    try {
      if (userId) {
        let draftData;
        
        if (userId) {
          // Try to fetch admin drafts (script_content)
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
            // Try to fetch editor drafts (script_suggestions)
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
        }
        
        // If we have draft data, update the lineData with draft content
        if (draftData && draftData.length > 0) {
          setLineData(prevData => {
            // Make a copy of the current data
            const newData = [...prevData];
            const newDataMap = new Map(newData.map(line => [line.uuid, line]));
            
            // For each draft line, update or add to the data without changing UUIDs
            draftData.forEach(draft => {
              const lineId = draft.id || draft.line_uuid;
              
              if (lineId && newDataMap.has(lineId)) {
                // Line exists - update its content if there's a draft but don't change UUID
                const line = newDataMap.get(lineId)!;
                if (draft.draft && draft.draft !== '{deleted-uuid}') {
                  line.content = draft.draft;
                  line.lineNumber = draft.line_number_draft || line.lineNumber;
                } else if (draft.draft === '{deleted-uuid}') {
                  // Mark for deletion by removing from map
                  newDataMap.delete(lineId);
                }
              } else if (draft.draft && draft.draft !== '{deleted-uuid}') {
                // This is a new line added in draft
                newDataMap.set(lineId || uuidv4(), {
                  uuid: lineId || uuidv4(),
                  lineNumber: draft.line_number_draft || newData.length + 1,
                  content: draft.draft,
                  originalAuthor: userId,
                  editedBy: []
                });
              }
            });
            
            // Convert map back to array
            const updatedData = Array.from(newDataMap.values());
            
            // Sort lines by lineNumber
            updatedData.sort((a, b) => a.lineNumber - b.lineNumber);
            
            // Update line numbers to be sequential
            updatedData.forEach((line, index) => {
              line.lineNumber = index + 1;
            });
            
            return updatedData;
          });
        }
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      isLoadingDrafts.current = false;
    }
  };

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) return;

      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('*')
          .eq('script_id', scriptId)
          .order('line_number', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedLineData = data.map(line => ({
            uuid: line.id,
            lineNumber: line.line_number,
            content: line.content,
            originalAuthor: line.original_author || null,
            // Ensure editedBy is always a string array
            editedBy: Array.isArray(line.edited_by) ? line.edited_by.map(String) : [],
            draft: line.draft,
            lineNumberDraft: line.line_number_draft
          }));
          
          // Store the original UUIDs in our ref
          formattedLineData.forEach(line => {
            originalUuidsRef.current.set(line.uuid, line.uuid);
          });
          
          setLineData(formattedLineData);
          // Store the current content lines for future reference
          previousContentRef.current = formattedLineData.map(line => line.content);
        } else {
          // Initialize with original content if no data in database
          // Create a single line to preserve the original formatting
          const initialLineData = [{
            uuid: uuidv4(),
            lineNumber: 1,
            content: originalContent,
            originalAuthor: userId,
            editedBy: []
          }];
          
          // Store the initial UUID
          originalUuidsRef.current.set(initialLineData[0].uuid, initialLineData[0].uuid);
          
          setLineData(initialLineData);
          // Store the current content for future reference
          previousContentRef.current = [originalContent];
        }
        setInitialized(true);
        
        // After initializing line data, try to load drafts
        loadDraftsForCurrentUser();
      } catch (error) {
        console.error('Error fetching line data:', error);
        setInitialized(true);
      }
    };

    fetchLineData();
  }, [scriptId, originalContent, userId, initialized]);

  // Function to find the best matching line based on content similarity
  const findBestMatchingLine = (
    content: string, 
    prevLineData: LineData[], 
    excludeIndices: Set<number>
  ): { index: number, similarity: number } | null => {
    let bestMatch = { index: -1, similarity: 0 };
    
    // Simple similarity measure (can be improved)
    const calculateSimilarity = (a: string, b: string): number => {
      if (a === b) return 1;
      if (!a || !b) return 0;
      
      // For longer strings, use a more sophisticated algorithm
      if (a.length > 10 && b.length > 10) {
        // Count matching characters at the start
        let matchLen = 0;
        const minLen = Math.min(a.length, b.length);
        while (matchLen < minLen && a[matchLen] === b[matchLen]) {
          matchLen++;
        }
        return matchLen / Math.max(a.length, b.length);
      }
      
      // For short strings, exact match or nothing
      return a === b ? 1 : 0;
    };
    
    for (let i = 0; i < prevLineData.length; i++) {
      if (excludeIndices.has(i)) continue;
      
      const similarity = calculateSimilarity(content, prevLineData[i].content);
      
      // If exact match, return immediately
      if (similarity === 1) {
        return { index: i, similarity: 1 };
      }
      
      // If better than previous match, update
      if (similarity > bestMatch.similarity && similarity > 0.6) {
        bestMatch = { index: i, similarity };
      }
    }
    
    return bestMatch.index >= 0 ? bestMatch : null;
  };

  const updateLineContents = (newContents: string[], quill: any) => {
    setLineData(prevData => {
      const usedIndices = new Set<number>();
      const newData: LineData[] = [];
      
      // For each new line, try to find a matching line in the previous state
      for (let i = 0; i < newContents.length; i++) {
        const content = newContents[i];
        
        // Try to find a match in the previous state
        const match = findBestMatchingLine(content, prevData, usedIndices);
        
        if (match) {
          // Use the existing line data with updated content
          const matchIndex = match.index;
          usedIndices.add(matchIndex);
          
          newData.push({
            ...prevData[matchIndex],
            lineNumber: i + 1,
            content,
            editedBy: content !== prevData[matchIndex].content && userId && 
                     !prevData[matchIndex].editedBy.includes(userId)
              ? [...prevData[matchIndex].editedBy, userId]
              : prevData[matchIndex].editedBy
          });
        } else {
          // Create a new line
          const newUuid = uuidv4();
          newData.push({
            uuid: newUuid,
            lineNumber: i + 1,
            content,
            originalAuthor: userId,
            editedBy: []
          });
          
          // Set the UUID on the corresponding line in the editor
          if (quill && quill.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, newUuid);
          }
        }
      }
      
      // Store the current content for future reference
      previousContentRef.current = newContents;
      
      return newData;
    });
  };

  // Legacy method for backward compatibility
  const updateLineContent = (lineIndex: number, newContent: string) => {
    setLineData(prevData => {
      const newData = [...prevData];
      
      // Ensure we're not exceeding array bounds
      while (newData.length <= lineIndex) {
        newData.push({
          uuid: uuidv4(),
          lineNumber: newData.length + 1,
          content: '',
          originalAuthor: userId,
          editedBy: []
        });
      }
      
      // Only update content and editedBy, preserve UUID and other metadata
      if (newData[lineIndex]) {
        newData[lineIndex] = {
          ...newData[lineIndex],
          content: newContent,
          editedBy: userId && !newData[lineIndex].editedBy.includes(userId)
            ? [...newData[lineIndex].editedBy, userId]
            : newData[lineIndex].editedBy
        };
      }
      
      return newData;
    });
  };

  return { lineData, setLineData, updateLineContent, updateLineContents };
};
