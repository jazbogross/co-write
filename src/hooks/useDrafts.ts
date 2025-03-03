
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';

export const useDrafts = () => {
  const isLoadingDrafts = useRef<boolean>(false);
  const [lastLoadedTimestamp, setLastLoadedTimestamp] = useState<number>(0);
  
  const loadDraftsForCurrentUser = async (
    scriptId: string, 
    userId: string | null, 
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
  ) => {
    if (!scriptId || !userId) {
      console.log('Cannot load drafts: missing scriptId or userId');
      return false;
    }
    
    if (isLoadingDrafts.current) {
      console.log('Draft loading operation already in progress');
      return false;
    }
    
    isLoadingDrafts.current = true;
    console.log('Loading drafts for user:', userId);
    
    try {
      // Fetching admin drafts (direct edits to the script)
      const { data: adminDrafts, error: adminError } = await supabase
        .from('script_content')
        .select('id, line_number, line_number_draft, content, draft')
        .eq('script_id', scriptId)
        .not('draft', 'is', null)  // Only load records with drafts
        .order('line_number_draft', { ascending: true, nullsFirst: false });
        
      if (adminError) throw adminError;
      
      let hasDrafts = false;
      
      // Process admin drafts if available
      if (adminDrafts && adminDrafts.length > 0) {
        console.log(`Found ${adminDrafts.length} admin draft lines`);
        hasDrafts = true;
        
        // Apply drafts to the current line data
        setLineData(prevData => {
          console.log('Applying admin drafts to editor');
          
          // Create a map of the current lines for easy lookup and modification
          const newLineMap = new Map(prevData.map(line => [line.uuid, { ...line }]));
          const newLines: LineData[] = [];
          const deletedLines = new Set<string>();
          
          // Process each draft line
          adminDrafts.forEach(draft => {
            if (draft.draft === '{deleted-uuid}') {
              // Mark line for deletion
              deletedLines.add(draft.id);
            } else {
              // Update existing line or add new line
              if (newLineMap.has(draft.id)) {
                // Update existing line
                const line = newLineMap.get(draft.id)!;
                line.content = draft.draft;
                line.lineNumber = draft.line_number_draft || line.lineNumber;
                
                // Update content-to-UUID mapping
                contentToUuidMapRef.current.set(draft.draft, draft.id);
              } else {
                // Create new line
                const lineNumber = draft.line_number_draft || newLines.length + 1;
                const newLine: LineData = {
                  uuid: draft.id,
                  lineNumber: lineNumber,
                  content: draft.draft,
                  originalAuthor: userId,
                  editedBy: []
                };
                newLineMap.set(draft.id, newLine);
                
                // Update content-to-UUID mapping
                contentToUuidMapRef.current.set(draft.draft, draft.id);
              }
            }
          });
          
          // Build the final line array, excluding deleted lines
          newLineMap.forEach((line, uuid) => {
            if (!deletedLines.has(uuid)) {
              newLines.push(line);
            }
          });
          
          // Sort lines by line number
          newLines.sort((a, b) => a.lineNumber - b.lineNumber);
          
          // Renumber lines to ensure contiguous numbering
          newLines.forEach((line, index) => {
            line.lineNumber = index + 1;
          });
          
          console.log(`Applied drafts: ${newLines.length} lines in editor (${deletedLines.size} deleted)`);
          return newLines;
        });
      } else {
        console.log('No admin drafts found, checking for editor suggestions');
        
        // If no admin drafts, check for editor suggestion drafts
        const { data: editorDrafts, error: editorError } = await supabase
          .from('script_suggestions')
          .select('id, line_uuid, line_number, line_number_draft, content, draft')
          .eq('script_id', scriptId)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .not('draft', 'is', null)  // Only load records with drafts
          .order('line_number_draft', { ascending: true, nullsFirst: false });
          
        if (editorError) throw editorError;
        
        if (editorDrafts && editorDrafts.length > 0) {
          console.log(`Found ${editorDrafts.length} editor draft suggestions`);
          hasDrafts = true;
          
          // Apply editor drafts
          setLineData(prevData => {
            console.log('Applying editor draft suggestions to editor');
            
            // Create a map of the current lines for easy lookup and modification
            const newLineMap = new Map(prevData.map(line => [line.uuid, { ...line }]));
            const newLines: LineData[] = [];
            const deletedLines = new Set<string>();
            
            // Process each editor draft
            editorDrafts.forEach(draft => {
              if (draft.draft === '{deleted-uuid}') {
                // Mark line for deletion
                if (draft.line_uuid) {
                  deletedLines.add(draft.line_uuid);
                }
              } else {
                const lineId = draft.line_uuid || draft.id;
                
                // Update existing line or add new line
                if (draft.line_uuid && newLineMap.has(draft.line_uuid)) {
                  // Update existing line
                  const line = newLineMap.get(draft.line_uuid)!;
                  line.content = draft.draft;
                  line.lineNumber = draft.line_number_draft || line.lineNumber;
                  
                  // Update content-to-UUID mapping
                  contentToUuidMapRef.current.set(draft.draft, draft.line_uuid);
                } else {
                  // Create new line
                  const lineNumber = draft.line_number_draft || newLines.length + 1;
                  const newLine: LineData = {
                    uuid: lineId,
                    lineNumber: lineNumber,
                    content: draft.draft,
                    originalAuthor: userId,
                    editedBy: []
                  };
                  newLineMap.set(lineId, newLine);
                  
                  // Update content-to-UUID mapping
                  contentToUuidMapRef.current.set(draft.draft, lineId);
                }
              }
            });
            
            // Build the final line array, excluding deleted lines
            newLineMap.forEach((line, uuid) => {
              if (!deletedLines.has(uuid)) {
                newLines.push(line);
              }
            });
            
            // Sort lines by line number
            newLines.sort((a, b) => a.lineNumber - b.lineNumber);
            
            // Renumber lines to ensure contiguous numbering
            newLines.forEach((line, index) => {
              line.lineNumber = index + 1;
            });
            
            console.log(`Applied editor drafts: ${newLines.length} lines in editor (${deletedLines.size} deleted)`);
            return newLines;
          });
        }
      }
      
      // Update timestamp of successful load
      setLastLoadedTimestamp(Date.now());
      return hasDrafts;
    } catch (error) {
      console.error('Error loading drafts:', error);
      return false;
    } finally {
      isLoadingDrafts.current = false;
    }
  };

  return { 
    loadDraftsForCurrentUser,
    lastLoadedTimestamp
  };
};
