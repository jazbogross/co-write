
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';

export const useDrafts = () => {
  const isLoadingDrafts = useRef<boolean>(false);
  
  const loadDraftsForCurrentUser = async (
    scriptId: string, 
    userId: string | null, 
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
  ) => {
    if (!scriptId || !userId || isLoadingDrafts.current) return;
    
    isLoadingDrafts.current = true;
    console.log('Loading drafts for user:', userId);
    
    try {
      // Get all lines with draft content for this script
      const { data: allDraftLines, error: draftError } = await supabase
        .from('script_content')
        .select('id, line_number, line_number_draft, content, draft')
        .eq('script_id', scriptId)
        .order('line_number_draft', { ascending: true, nullsFirst: false });
        
      if (draftError) throw draftError;
      
      if (allDraftLines && allDraftLines.length > 0) {
        console.log(`Found ${allDraftLines.length} lines, checking for drafts`);
        
        // Filter to lines that have draft content or draft line numbers
        const linesWithDrafts = allDraftLines.filter(line => 
          line.draft !== null || line.line_number_draft !== null
        );
        
        if (linesWithDrafts.length > 0) {
          console.log(`Found ${linesWithDrafts.length} lines with drafts`);
          
          setLineData(prevData => {
            // Create a map of existing lines by UUID for quick lookups
            const prevDataMap = new Map(prevData.map(line => [line.uuid, line]));
            const updatedLines = new Map(prevDataMap);
            
            // Process all lines with drafts
            linesWithDrafts.forEach(dbLine => {
              const lineId = dbLine.id;
              
              if (dbLine.draft === '{deleted-uuid}') {
                // Handle deleted lines
                updatedLines.delete(lineId);
              } else if (lineId) {
                const existingLine = prevDataMap.get(lineId);
                
                if (existingLine) {
                  // Update existing line with draft content
                  updatedLines.set(lineId, {
                    ...existingLine,
                    content: dbLine.draft !== null ? dbLine.draft : existingLine.content,
                    lineNumber: dbLine.line_number_draft !== null ? dbLine.line_number_draft : existingLine.lineNumber
                  });
                  
                  if (dbLine.draft) {
                    contentToUuidMapRef.current.set(dbLine.draft, lineId);
                  }
                } else {
                  // Add new line from draft
                  const newLine = {
                    uuid: lineId,
                    lineNumber: dbLine.line_number_draft || 0,
                    content: dbLine.draft || dbLine.content || '',
                    originalAuthor: userId,
                    editedBy: []
                  };
                  
                  updatedLines.set(lineId, newLine);
                  
                  if (dbLine.draft) {
                    contentToUuidMapRef.current.set(dbLine.draft, lineId);
                  }
                }
              }
            });
            
            // Convert map back to array and sort by line number
            const result = Array.from(updatedLines.values());
            result.sort((a, b) => a.lineNumber - b.lineNumber);
            
            // Renumber lines to ensure continuity
            result.forEach((line, index) => {
              line.lineNumber = index + 1;
            });
            
            console.log(`Loaded ${result.length} lines with drafts`);
            return result;
          });
        } else {
          console.log('No draft content found');
        }
      } else {
        console.log('No lines found for this script');
      }
      
      // Also check for editor drafts in script_suggestions if user is not admin
      // This section remains similar to the original implementation for non-admin users
      const { data: editorDrafts, error: editorError } = await supabase
        .from('script_suggestions')
        .select('id, line_uuid, line_number, line_number_draft, content, draft')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('line_number_draft', { ascending: true, nullsFirst: false });
        
      if (editorError) throw editorError;
      
      if (editorDrafts && editorDrafts.length > 0 && editorDrafts.some(draft => draft.draft !== null)) {
        console.log(`Found ${editorDrafts.length} editor drafts`);
        
        setLineData(prevData => {
          const newData = [...prevData];
          const newDataMap = new Map(newData.map(line => [line.uuid, line]));
          
          editorDrafts.forEach(draft => {
            const lineId = draft.line_uuid;
            
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
              const newUuid = lineId || crypto.randomUUID();
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

  return { loadDraftsForCurrentUser };
};
