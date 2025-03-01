
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
