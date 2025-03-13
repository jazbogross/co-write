
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { toast } from 'sonner';
import { isDeltaObject } from '@/utils/editor';

export const useLineDataInit = ({
  scriptId,
  initialContent,
  userId,
  isAdmin = false
}: {
  scriptId: string;
  initialContent: string;
  userId: string | null;
  isAdmin: boolean;
}) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);

  /**
   * Initial data loading
   */
  useEffect(() => {
    const loadInitialData = async () => {
      if (!scriptId) {
        setError(new Error('No script ID provided'));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch script content from script_content table
        const { data: contentData, error: contentError } = await supabase
          .from('script_content')
          .select('content_delta')
          .eq('script_id', scriptId)
          .single();

        if (contentError) {
          console.error('Error fetching script content:', contentError);
          
          // For new scripts, create an empty content entry
          if (contentError.code === 'PGRST116') {
            console.log('Script content not found, creating new entry');
            const emptyDelta = { ops: [{ insert: '\n' }] };
            
            // Create new script content
            await supabase
              .from('script_content')
              .insert({
                script_id: scriptId,
                content_delta: emptyDelta,
                version: 1
              });
            
            // Set initial line data with empty Delta
            const initialLine: LineData = {
              uuid: scriptId,
              lineNumber: 1,
              content: emptyDelta,
              originalAuthor: userId,
              editedBy: [],
              hasDraft: false
            };
            
            setLineData([initialLine]);
            setIsInitialized(true);
            setIsLoading(false);
            return;
          }
          
          throw contentError;
        }

        // Extract content Delta from response
        const contentDelta = contentData?.content_delta || { ops: [{ insert: '\n' }] };
        
        // Create a single LineData entry with the full Delta
        const initialLine: LineData = {
          uuid: scriptId,
          lineNumber: 1,
          content: contentDelta,
          originalAuthor: null,
          editedBy: [],
          hasDraft: false
        };
        
        setLineData([initialLine]);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing line data:', error);
        setError(error as Error);
        toast.error('Failed to load script content');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [scriptId, userId]);

  /**
   * Load drafts for the current user
   */
  const loadDrafts = useCallback(async () => {
    if (!scriptId || !userId) {
      console.log('Cannot load drafts: missing scriptId or userId');
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch user's draft from script_drafts table
      const { data: draftData, error: draftError } = await supabase
        .from('script_drafts')
        .select('draft_content')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .single();
      
      if (draftError) {
        if (draftError.code !== 'PGRST116') { // Not found error
          console.error('Error fetching draft:', draftError);
        }
        return;
      }
      
      if (!draftData || !draftData.draft_content) {
        console.log('No draft found');
        return;
      }
      
      // Create a LineData entry with the draft content
      const draftLine: LineData = {
        uuid: scriptId,
        lineNumber: 1,
        content: draftData.draft_content,
        originalAuthor: userId,
        editedBy: [],
        hasDraft: true
      };
      
      setLineData([draftLine]);
      console.log('Loaded draft for user:', userId);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, userId]);

  return {
    lineData,
    setLineData,
    isLoading,
    error,
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts,
    isInitialized
  };
};
