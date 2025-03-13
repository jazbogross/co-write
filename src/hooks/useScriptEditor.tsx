
import { useState, useEffect, useRef, useCallback } from 'react';
import { DeltaStatic } from 'quill';
import ReactQuill from 'react-quill';
import { 
  fetchScriptContent, 
  saveScriptContent, 
  saveDraft, 
  loadDraft 
} from '@/services/scriptService';
import { toast } from 'sonner';
import Delta from 'quill-delta';

interface UseScriptEditorProps {
  scriptId: string;
  isAdmin: boolean;
  onSuggestChange?: (delta: DeltaStatic) => void;
}

export const useScriptEditor = ({ 
  scriptId, 
  isAdmin, 
  onSuggestChange 
}: UseScriptEditorProps) => {
  // Editor state
  const [content, setContent] = useState<DeltaStatic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  // Refs
  const quillRef = useRef<ReactQuill>(null);
  const draftTimerRef = useRef<number | null>(null);
  const originalContentRef = useRef<DeltaStatic | null>(null);
  
  // Initialize editor with content
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      
      try {
        // Try to load draft first (for non-admins)
        if (!isAdmin) {
          const draft = await loadDraft(scriptId);
          if (draft) {
            setContent(draft.draftContent);
            setHasDraft(true);
            originalContentRef.current = null; // We'll load the original later
            console.log('Loaded draft content');
          }
        }
        
        // Load original content
        const scriptContent = await fetchScriptContent(scriptId);
        if (scriptContent) {
          if (!hasDraft) {
            setContent(scriptContent.contentDelta);
          }
          
          // Store original for diffs
          originalContentRef.current = scriptContent.contentDelta;
          console.log('Loaded original content');
        } else if (!hasDraft) {
          // Set empty content if we have neither original nor draft
          // Use Delta constructor to create a proper Delta object
          const emptyDelta = new Delta([{ insert: '\n' }]) as unknown as DeltaStatic;
          setContent(emptyDelta);
        }
      } catch (error) {
        console.error('Error loading content:', error);
        toast.error('Failed to load script content');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (scriptId) {
      loadContent();
    }
    
    return () => {
      // Clean up draft timer when unmounting
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [scriptId, isAdmin, hasDraft]);
  
  // Save content (for admins) or create draft (for non-admins)
  const saveContent = useCallback(async () => {
    if (!content || !scriptId) return false;
    
    setIsSaving(true);
    
    try {
      let success = false;
      
      if (isAdmin) {
        // Admins save to main content
        success = await saveScriptContent(scriptId, content);
        if (success) {
          toast.success('Script saved successfully');
          // Update original content ref
          originalContentRef.current = content;
        } else {
          toast.error('Failed to save script');
        }
      } else {
        // Non-admins save as draft
        success = await saveDraft(scriptId, content);
        if (success) {
          toast.success('Draft saved successfully');
          setHasDraft(true);
        } else {
          toast.error('Failed to save draft');
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('An error occurred while saving');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [content, scriptId, isAdmin]);
  
  // Auto-save draft for non-admins
  useEffect(() => {
    if (!isAdmin && content && scriptId) {
      // Clear previous timer
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
      
      // Set new timer for auto-save
      draftTimerRef.current = window.setTimeout(async () => {
        console.log('Auto-saving draft...');
        await saveDraft(scriptId, content);
        setHasDraft(true);
      }, 5000); // Auto-save after 5 seconds of inactivity
    }
    
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [content, scriptId, isAdmin]);
  
  // Handle content change
  const handleChange = useCallback((newContent: DeltaStatic) => {
    setContent(newContent);
  }, []);
  
  // Submit changes (for non-admins)
  const submitChanges = useCallback(async () => {
    if (!content || !originalContentRef.current || !onSuggestChange) {
      return false;
    }
    
    try {
      // Submit the changes to the parent component
      onSuggestChange(content);
      return true;
    } catch (error) {
      console.error('Error submitting changes:', error);
      toast.error('Failed to submit changes');
      return false;
    }
  }, [content, onSuggestChange]);
  
  // Configurations for the Quill editor
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };
  
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align'
  ];
  
  return {
    content,
    isLoading,
    isSaving,
    hasDraft,
    quillRef,
    saveContent,
    handleChange,
    submitChanges,
    modules,
    formats
  };
};
