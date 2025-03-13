import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { v4 as uuidv4 } from 'uuid';

interface UseLineDataInitProps {
  scriptId: string;
  initialContent: string | null;
  userId?: string | null;
  isAdmin?: boolean;
}

export const useLineDataInit = ({
  scriptId,
  initialContent,
  userId,
  isAdmin = false
}: UseLineDataInitProps) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);

  useEffect(() => {
    const initializeLineData = async () => {
      if (isInitialized) return;
      
      setIsLoading(true);
      
      try {
        const { data: existingScript, error: fetchError } = await supabase
          .from('script_content')
          .select('*')
          .eq('script_id', scriptId)
          .maybeSingle();
          
        if (fetchError) throw fetchError;
        
        if (existingScript && existingScript.content_delta) {
          console.log('Using existing script content from database');
          
          const dummyLineData: LineData[] = [{
            uuid: uuidv4(),
            lineNumber: 1,
            content: existingScript.content_delta,
            originalAuthor: null,
            editedBy: []
          }];
          
          setLineData(dummyLineData);
        } 
        else if (initialContent) {
          console.log('Creating new line data from initial content');
          
          const deltaContent = {
            ops: [{ insert: initialContent }]
          };
          
          const newLineData: LineData[] = [{
            uuid: uuidv4(),
            lineNumber: 1,
            content: deltaContent,
            originalAuthor: userId || null,
            editedBy: []
          }];
          
          setLineData(newLineData);
          
          await supabase.from('script_content').insert({
            script_id: scriptId,
            content_delta: deltaContent,
            version: 1
          });
        } else {
          console.log('Creating empty line data');
          
          const emptyDelta = {
            ops: [{ insert: '\n' }]
          };
          
          const emptyLineData: LineData[] = [{
            uuid: uuidv4(),
            lineNumber: 1,
            content: emptyDelta,
            originalAuthor: userId || null,
            editedBy: []
          }];
          
          setLineData(emptyLineData);
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Error initializing line data:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (scriptId && !isInitialized) {
      initializeLineData();
    }
  }, [scriptId, initialContent, userId, isInitialized]);
  
  const updateLineDataFromContent = (content: string, domUuidMap?: Map<number, string>) => {
    if (!content) return [];
    
    const updatedLines: LineData[] = [...lineData];
    
    if (updatedLines.length === 0) {
      updatedLines.push({
        uuid: uuidv4(),
        lineNumber: 1,
        content: content,
        originalAuthor: userId || null,
        editedBy: []
      });
    } else {
      updatedLines[0] = {
        ...updatedLines[0],
        content: content
      };
    }
    
    setLineData(updatedLines);
    return updatedLines;
  };
  
  const saveLineData = async () => {
    if (!scriptId || !lineData.length) return false;
    
    try {
      const deltaContent = lineData[0].content;
      
      const { data: existingContent } = await supabase
        .from('script_content')
        .select('version')
        .eq('script_id', scriptId)
        .maybeSingle();
      
      if (existingContent) {
        await supabase
          .from('script_content')
          .update({
            content_delta: deltaContent,
            version: existingContent.version + 1,
            updated_at: new Date().toISOString()
          })
          .eq('script_id', scriptId);
      } else {
        await supabase
          .from('script_content')
          .insert({
            script_id: scriptId,
            content_delta: deltaContent,
            version: 1
          });
      }
      
      return true;
    } catch (err) {
      console.error('Error saving line data:', err);
      return false;
    }
  };
  
  const loadDrafts = async () => {
    if (!scriptId || !userId) return false;
    
    try {
      const { data: draft, error } = await supabase
        .from('script_drafts')
        .select('draft_content')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (!draft || !draft.draft_content) {
        console.log('No draft found for current user');
        return false;
      }
      
      const updatedLineData = [...lineData];
      
      if (updatedLineData.length > 0) {
        updatedLineData[0] = {
          ...updatedLineData[0],
          content: draft.draft_content,
          hasDraft: true,
          originalContent: updatedLineData[0].content
        };
      } else {
        updatedLineData.push({
          uuid: uuidv4(),
          lineNumber: 1,
          content: draft.draft_content,
          hasDraft: true,
          originalAuthor: userId || null,
          editedBy: []
        });
      }
      
      setLineData(updatedLineData);
      return true;
    } catch (err) {
      console.error('Error loading draft:', err);
      return false;
    }
  };
  
  const loadDraftsForCurrentUser = async () => {
    return loadDrafts();
  };
  
  return {
    lineData,
    setLineData,
    isLoading,
    error,
    updateLineDataFromContent,
    saveLineData,
    loadDraftsForCurrentUser,
    isInitialized,
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts
  };
};
