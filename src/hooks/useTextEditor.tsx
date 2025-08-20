
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isDeltaObject } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';
import { DeltaStatic } from 'quill';
import { ensureDeltaContent, toDelta } from '@/utils/deltaUtils';

export const useTextEditor = (
  scriptId: string,
  isAdmin: boolean
) => {
  const [content, setContent] = useState<DeltaContent | DeltaStatic>({ ops: [{ insert: '\n' }] });
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
            console.log('Found draft content:', draft.draft_content);
            
            // Check if the draft content is HTML
            if (typeof draft.draft_content === 'string' && draft.draft_content.includes('<')) {
              console.warn('HTML detected in draft - converting to plain text');
              const plainText = draft.draft_content.replace(/<[^>]*>/g, '');
              setContent(toDelta({ ops: [{ insert: plainText + '\n' }] }));
            } else {
              // Ensure content is a proper Delta object
              setContent(toDelta(draft.draft_content));
            }
            
            setIsLoading(false);
            return;
          }
        }
        
        // If no draft or no user, load main content from scripts table
        const { data, error } = await supabase
          .from('scripts')
          .select('content')
          .eq('id', scriptId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (!data || !data.content) {
          // Content not found, create empty content
          const emptyDelta = { ops: [{ insert: '\n' }] };
          setContent(toDelta(emptyDelta));
          
          // For admins, save the empty content
          if (isAdmin) {
            await supabase
              .from('scripts')
              .update({
                content: emptyDelta
              })
              .eq('id', scriptId);
          }
        } else {
          // Parse Delta content if needed
          console.log('Found content:', data.content);
          
          // Check for HTML in content
          if (typeof data.content === 'string' && data.content.includes('<')) {
            console.warn('HTML detected in content - converting to plain text');
            const plainText = data.content.replace(/<[^>]*>/g, '');
            setContent(toDelta({ ops: [{ insert: plainText + '\n' }] }));
          } else {
            // Ensure it's a proper Delta object
            setContent(toDelta(data.content));
          }
        }
      } catch (error) {
        console.error('Error loading content:', error);
        setError(error as Error);
        toast.error('Failed to load content');
        
        // Set empty content as fallback
        setContent(toDelta({ ops: [{ insert: '\n' }] }));
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
