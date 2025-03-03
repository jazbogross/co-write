
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { fetchLineDataFromSupabase, formatLineDataFromSupabase, createInitialLineData } from '@/utils/lineDataUtils';
import { supabase } from '@/integrations/supabase/client';

export const useLineDataInit = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null
) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  
  const originalUuidsRef = useRef<Map<string, string>>(new Map());
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) {
        console.log('**** UseLineData **** fetchLineData aborted because either no scriptId or already initialized.');
        return;
      }
      
      console.log('**** UseLineData **** fetchLineData called. scriptId:', scriptId, 'initialized:', initialized);
      setIsDataReady(false); // Reset ready state while loading
      
      try {
        // Get all lines including drafts, with improved ordering that prioritizes drafts
        const { data: allLines, error: allLinesError } = await supabase
          .from('script_content')
          .select('id, line_number, line_number_draft, content, draft')
          .eq('script_id', scriptId)
          .order('line_number_draft', { ascending: true, nullsFirst: false }); // Changed to prioritize drafts
          
        if (allLinesError) throw allLinesError;
        
        if (allLines && allLines.length > 0) {
          console.log('**** UseLineData **** Data fetched successfully. Lines count:', allLines.length);
          
          // Improved draft processing logic with clearer rules
          const processedLineData = allLines
            .filter(line => line.draft !== '{deleted-uuid}') // Filter out deleted lines
            .map(line => {
              // Enhanced draft prioritization logic
              const hasDraft = line.draft !== null && line.draft !== undefined && line.draft !== '';
              const hasDraftLineNumber = line.line_number_draft !== null && line.line_number_draft !== undefined;
              
              return {
                uuid: line.id,
                content: hasDraft ? line.draft : line.content,
                lineNumber: hasDraftLineNumber ? line.line_number_draft : line.line_number,
                originalAuthor: null, // Will be populated later
                editedBy: [],
                hasDraft: hasDraft, // Track draft state explicitly
                originalContent: line.content, // Store original content for reference
                originalLineNumber: line.line_number // Store original line number for reference
              };
            })
            // Sort by line number to ensure order
            .sort((a, b) => a.lineNumber - b.lineNumber);
          
          // Update line numbers to ensure continuity
          processedLineData.forEach((line, index) => {
            line.lineNumber = index + 1;
            
            originalUuidsRef.current.set(line.uuid, line.uuid);
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          setLineData(processedLineData);
          lastLineCountRef.current = processedLineData.length;
        } else {
          console.log('**** UseLineData **** No data found, creating initial line data');
          const initialLineData = createInitialLineData(originalContent, userId);
          
          originalUuidsRef.current.set(initialLineData[0].uuid, initialLineData[0].uuid);
          contentToUuidMapRef.current.set(originalContent, initialLineData[0].uuid);
          
          setLineData(initialLineData);
          lastLineCountRef.current = 1;
        }
        setInitialized(true);
        setIsDataReady(true); // Mark data as ready for TextEditor to use
        console.log('**** UseLineData **** Data is now ready for editor to use');
      } catch (error) {
        console.error('**** UseLineData **** Error fetching line data:', error);
        setInitialized(true);
        
        if (lineData.length === 0) {
          const initialLineData = createInitialLineData(originalContent, userId);
          setLineData(initialLineData);
          setIsDataReady(true);
          lastLineCountRef.current = 1;
        }
      }
    };

    fetchLineData();
  }, [scriptId, originalContent, userId, initialized, lineData.length]);

  // New function to handle loading drafts, moving logic from useDrafts.ts
  const loadDrafts = async (
    userId: string | null
  ) => {
    if (!scriptId || !userId) {
      console.log('**** UseLineData **** loadDrafts aborted: missing scriptId or userId');
      return;
    }
    
    console.log('**** UseLineData **** Loading drafts for user:', userId);
    
    try {
      // Get all draft content, ordered by draft line number with nulls last
      const { data: draftLines, error: draftError } = await supabase
        .from('script_content')
        .select('id, line_number, line_number_draft, content, draft')
        .eq('script_id', scriptId)
        .order('line_number_draft', { ascending: true, nullsFirst: false });
        
      if (draftError) throw draftError;
      
      if (draftLines && draftLines.length > 0) {
        // Process draft lines
        setLineData(prevData => {
          // Create maps for quick lookups
          const prevDataMap = new Map(prevData.map(line => [line.uuid, line]));
          
          // Process all draft lines
          const draftUpdates = draftLines
            .filter(line => line.draft !== null || line.line_number_draft !== null)
            .reduce((updates, dbLine) => {
              if (dbLine.draft === '{deleted-uuid}') {
                // Mark for deletion
                updates.deletedIds.add(dbLine.id);
              } else if (dbLine.id) {
                // Regular draft update
                updates.lines.push({
                  uuid: dbLine.id,
                  content: dbLine.draft !== null ? dbLine.draft : (prevDataMap.get(dbLine.id)?.content || dbLine.content),
                  lineNumber: dbLine.line_number_draft !== null ? dbLine.line_number_draft : 
                              (prevDataMap.get(dbLine.id)?.lineNumber || dbLine.line_number),
                  originalAuthor: prevDataMap.get(dbLine.id)?.originalAuthor || null,
                  editedBy: prevDataMap.get(dbLine.id)?.editedBy || [],
                  hasDraft: dbLine.draft !== null,
                  originalContent: dbLine.content,
                  originalLineNumber: dbLine.line_number
                });
              }
              return updates;
            }, { lines: [] as LineData[], deletedIds: new Set<string>() });
          
          // Create updated data, excluding deleted lines
          const updatedData = prevData
            .filter(line => !draftUpdates.deletedIds.has(line.uuid))
            .map(line => {
              // Find and apply any draft updates for this line
              const draftUpdate = draftUpdates.lines.find(draft => draft.uuid === line.uuid);
              return draftUpdate || line;
            });
          
          // Add any new draft lines not in the previous data
          const existingIds = new Set(updatedData.map(line => line.uuid));
          const newDraftLines = draftUpdates.lines
            .filter(line => !existingIds.has(line.uuid));
          
          const finalData = [...updatedData, ...newDraftLines];
          
          // Sort and renumber
          finalData.sort((a, b) => a.lineNumber - b.lineNumber);
          finalData.forEach((line, index) => {
            line.lineNumber = index + 1;
            // Update content-to-uuid map
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          console.log(`**** UseLineData **** Applied ${draftUpdates.lines.length} draft updates`);
          return finalData;
        });
      }
      
      // Also check for editor drafts in script_suggestions
      const { data: editorDrafts, error: editorError } = await supabase
        .from('script_suggestions')
        .select('id, line_uuid, line_number, line_number_draft, content, draft')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('line_number_draft', { ascending: true, nullsFirst: false });
        
      if (editorError) throw editorError;
      
      if (editorDrafts && editorDrafts.length > 0 && editorDrafts.some(draft => draft.draft !== null)) {
        console.log(`**** UseLineData **** Found ${editorDrafts.length} editor drafts`);
        
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
                line.hasDraft = true;
                
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
                editedBy: [],
                hasDraft: true,
                originalContent: '',
                originalLineNumber: 0
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
      console.error('**** UseLineData **** Error loading drafts:', error);
    }
  };

  return { 
    lineData, 
    setLineData, 
    isDataReady, 
    originalUuidsRef, 
    contentToUuidMapRef, 
    lastLineCountRef,
    loadDrafts
  };
};
