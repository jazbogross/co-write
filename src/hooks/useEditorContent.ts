
import { useState, useEffect, useRef } from 'react';
import { DeltaStatic } from 'quill';
import { supabase } from '@/integrations/supabase/client';
import { loadContent } from '@/utils/saveLineUtils';
import ReactQuill from 'react-quill';

export function useEditorContent(scriptId: string, isAdmin: boolean) {
  const [content, setContent] = useState<DeltaStatic>({ ops: [{ insert: '\n' }] } as unknown as DeltaStatic);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Fetch user and initial content
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Check for user's draft
          if (!isAdmin) {
            const { data: draftData } = await supabase
              .from('script_drafts')
              .select('draft_content')
              .eq('script_id', scriptId)
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (draftData?.draft_content) {
              setContent(draftData.draft_content as unknown as DeltaStatic);
              setHasDraft(true);
              setIsLoading(false);
              return;
            }
          }
          
          // Load main content if no draft found or user is admin
          const contentData = await loadContent(scriptId);
          if (contentData) {
            setContent(contentData as unknown as DeltaStatic);
          }
        }
      } catch (error) {
        console.error('Error loading editor content:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [scriptId, isAdmin]);

  return {
    content,
    setContent,
    userId,
    isLoading,
    hasDraft,
    setHasDraft,
    isSaving,
    setIsSaving,
    quillRef
  };
}
