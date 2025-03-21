
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { toast } from 'sonner';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';

export const useTextEditor = (
  scriptId: string,
  isAdmin: boolean
) => {
  const [content, setContent] = useState<DeltaContent>({ ops: [{ insert: '\n' }] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const editorRef = useRef<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    getUserId();
  }, []);
  
  // Load content from database
  useEffect(() => {
    const loadContent = async () => {
      if (!scriptId) {
        setError(new Error('No script ID provided'));
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Check for draft first if user is logged in
        if (userId) {
          const { data: draft } = await supabase
            .from('script_drafts')
            .select('draft_content')
            .eq('script_id', scriptId)
            .eq('user_id', userId)
            .maybeSingle();
          
          if (draft?.draft_content) {
            setContent(draft.draft_content as unknown as DeltaContent);
            setIsLoading(false);
            return;
          }
        }
        
        // If no draft or no user, load main content
        const { data, error } = await supabase
          .from('script_content')
          .select('content_delta')
          .eq('script_id', scriptId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (!data || !data.content_delta) {
          // Content not found, create empty content
          const emptyDelta = { ops: [{ insert: '\n' }] };
          setContent(emptyDelta);
          
          // For admins, save the empty content
          if (isAdmin) {
            await supabase
              .from('script_content')
              .insert({
                script_id: scriptId,
                content_delta: emptyDelta,
                version: 1
              });
          }
        } else {
          // Parse Delta content if needed
          const deltaContent = typeof data.content_delta === 'string'
            ? JSON.parse(data.content_delta)
            : data.content_delta;
          
          setContent(deltaContent as DeltaContent);
        }
      } catch (error) {
        console.error('Error loading content:', error);
        setError(error as Error);
        toast.error('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContent();
  }, [scriptId, userId, isAdmin]);
  
  return {
    content,
    setContent,
    isLoading,
    error,
    editorRef,
    userId
  };
};
