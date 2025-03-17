
import { useState, useEffect, useRef } from 'react';
import { DeltaStatic } from 'quill';
import { supabase } from '@/integrations/supabase/client';
import { loadContent } from '@/utils/deltaUtils';
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
          
          const result = await loadContent(scriptId, user.id);
          
          setContent(result.contentDelta);
          setHasDraft(result.hasDraft);
        }
      } catch (error) {
        console.error('Error loading editor content:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [scriptId]);

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
