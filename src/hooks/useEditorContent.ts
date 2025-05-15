
import { useState, useEffect, useRef } from 'react';
import { DeltaStatic } from '@/utils/editor/quill-types';
import { supabase } from '@/integrations/supabase/client';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';
import { ensureDeltaContent } from '@/utils/deltaUtils';

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
              const deltaContent = ensureDeltaContent(draftData.draft_content);
              setContent(deltaContent as unknown as DeltaStatic);
              setHasDraft(true);
              setIsLoading(false);
              return;
            }
          }
          
          // Load content directly from scripts table
          const { data: scriptData, error } = await supabase
            .from('scripts')
            .select('content')
            .eq('id', scriptId)
            .single();
          
          if (error) {
            console.error('Error loading script content:', error);
            return;
          }
          
          if (scriptData?.content) {
            const deltaContent = ensureDeltaContent(scriptData.content);
            setContent(deltaContent as unknown as DeltaStatic);
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
