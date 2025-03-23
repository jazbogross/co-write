
import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TextEditorActions } from './editor/TextEditorActions';
import { loadContent, saveContent } from '@/utils/deltaUtils';
import { normalizeContentForStorage } from '@/utils/suggestions/contentUtils';
import { SuggestionsPanel } from './editor/SuggestionsPanel';

interface DeltaTextEditorProps {
  scriptId: string;
  isAdmin: boolean;
  onCommitToGithub?: (content: string) => Promise<boolean>;
  onSaveVersion?: (content: string) => void;
}

export const DeltaTextEditor: React.FC<DeltaTextEditorProps> = ({ 
  scriptId, 
  isAdmin,
  onCommitToGithub,
  onSaveVersion
}) => {
  const session = useSession();
  const quillRef = useRef<ReactQuill>(null);

  // Track whether we're submitting (saving) changes
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track whether the suggestions panel is open
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false);
  
  // Track pending suggestions count
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(0);

  // Track the current formatting at the cursor (e.g. { bold: true, italic: false, align: 'right', ... })
  const [currentFormat, setCurrentFormat] = useState<Record<string, any>>({});

  // Load content on component mount
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const content = await loadContent(scriptId);
        if (content && quillRef.current) {
          quillRef.current.getEditor().setContents(content);
        }
      } catch (error) {
        console.error('Error loading content:', error);
        toast.error('Failed to load script content');
      }
    };
    fetchContent();
  }, [scriptId]);

  // Load pending suggestions count for admins
  useEffect(() => {
    if (isAdmin) {
      const fetchPendingSuggestions = async () => {
        try {
          const { count, error } = await supabase
            .from('script_suggestions')
            .select('id', { count: 'exact' })
            .eq('script_id', scriptId)
            .eq('status', 'pending');

          if (error) throw error;
          setPendingSuggestionsCount(count || 0);
        } catch (error) {
          console.error('Error fetching pending suggestions:', error);
        }
      };

      fetchPendingSuggestions();
      
      // Subscribe to changes in suggestions
      const suggestionChannel = supabase
        .channel(`script_suggestions_${scriptId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'script_suggestions',
          filter: `script_id=eq.${scriptId}`
        }, () => {
          fetchPendingSuggestions();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(suggestionChannel);
      };
    }
  }, [scriptId, isAdmin]);

  // Attach listeners after the editor mounts to track selection changes & text changes
  useEffect(() => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();

    // Fires when user moves cursor or changes selection
    quill.on('selection-change', (range) => {
      if (range) {
        const format = quill.getFormat(range);
        setCurrentFormat(format);
      } else {
        setCurrentFormat({});
      }
    });

    // Fires on every text change (typing, etc.)
    quill.on('text-change', () => {
      const range = quill.getSelection();
      if (range) {
        const format = quill.getFormat(range);
        setCurrentFormat(format);
      } else {
        setCurrentFormat({});
      }
    });
  }, []);

  // Handle direct formatting from the toolbar
  const handleFormat = (format: string, value: any) => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    quill.format(format, value);
  };

  // Submit changes to the database (and possibly GitHub)
  const handleSubmit = async () => {
    if (!quillRef.current || !session?.user?.id) {
      toast.error('You must be logged in to save changes');
      return;
    }
    setIsSubmitting(true);

    try {
      const editor = quillRef.current.getEditor();
      const delta = editor.getContents();
      const content = JSON.stringify(delta);

      // Save to database
      const success = await saveContent(scriptId, delta);
      if (!success) {
        toast.error('Failed to save content');
        return;
      }

      // If admin and commit to GitHub
      if (isAdmin && onCommitToGithub) {
        const githubSuccess = await onCommitToGithub(content);
        if (!githubSuccess) {
          toast.warning('Content saved to database but not to GitHub');
        } else {
          toast.success('Content saved and committed to GitHub');
        }
      } else {
        toast.success('Content saved successfully');
      }
    } catch (error) {
      console.error('Error submitting content:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save a draft version to the "script_drafts" table
  const handleSaveDraft = async () => {
    if (!quillRef.current || !session?.user?.id || isAdmin) {
      if (isAdmin) {
        // Admins don't need drafts
        return;
      }
      toast.error('You must be logged in to save drafts');
      return;
    }
    try {
      const editor = quillRef.current.getEditor();
      const delta = editor.getContents();

      // Prepare content for storage
      const normalizedContent = normalizeContentForStorage(delta);

      // Save to drafts table
      const { error } = await supabase
        .from('script_drafts')
        .upsert({
          script_id: scriptId,
          user_id: session.user.id,
          draft_content: normalizedContent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'script_id,user_id'
        });

      if (error) {
        console.error('Error saving draft:', error);
        toast.error('Failed to save draft');
        return;
      }
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('An error occurred while saving draft');
    }
  };

  // Submit a suggestion from non-admin user
  const handleSubmitSuggestion = async () => {
    if (!quillRef.current || !session?.user?.id || isAdmin) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const editor = quillRef.current.getEditor();
      const suggestedContent = editor.getContents();
      
      // First, save as draft
      await handleSaveDraft();
      
      // Get original content for comparison
      const { data } = await supabase
        .from('script_content')
        .select('content_delta')
        .eq('script_id', scriptId)
        .single();
      
      if (!data?.content_delta) {
        toast.error('Could not load original content to compare');
        return;
      }
      
      // Create the suggestion and save to script_suggestions table
      const normalizedSuggestion = normalizeContentForStorage(suggestedContent);
      
      const { error } = await supabase
        .from('script_suggestions')
        .insert({
          script_id: scriptId,
          user_id: session.user.id,
          delta_diff: normalizedSuggestion,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error saving suggestion:', error);
        toast.error('Failed to save suggestion');
        return;
      }
      
      toast.success('Your suggestion has been submitted for review');
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('An error occurred while submitting suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save a new version (admin-only)
  const handleSaveVersion = () => {
    if (!quillRef.current || !onSaveVersion) return;
    const editor = quillRef.current.getEditor();
    const delta = editor.getContents();
    const content = JSON.stringify(delta);
    onSaveVersion(content);
  };

  return (
    <div className="space-y-0 flex">
      {/* Main editor area */}
      <div className={`flex-1 transition-all ${isSuggestionsPanelOpen ? 'mr-12' : ''}`}>
        {/* Toolbar & actions */}
        <TextEditorActions
          isAdmin={isAdmin}
          isSubmitting={isSubmitting}
          hasPendingSuggestions={pendingSuggestionsCount > 0}
          currentFormat={currentFormat}
          onFormat={handleFormat}
          onSubmit={handleSubmit}
          onSave={handleSaveDraft}
          onSaveVersion={isAdmin ? handleSaveVersion : undefined}
          onSubmitSuggestion={!isAdmin ? handleSubmitSuggestion : undefined}
          onToggleSuggestions={isAdmin ? () => setIsSuggestionsPanelOpen(!isSuggestionsPanelOpen) : undefined}
          pendingSuggestionsCount={pendingSuggestionsCount}
        />

        {/* Quill editor */}
        <div className="border rounded-md">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            modules={{
              toolbar: false, // We hide the default toolbar since we have our own
              history: {
                delay: 2000,
                maxStack: 500,
                userOnly: true
              }
            }}
          />
        </div>
      </div>
      
      {/* Suggestions panel for admins */}
      {isAdmin && (
        <SuggestionsPanel 
          isOpen={isSuggestionsPanelOpen}
          scriptId={scriptId}
          onToggle={() => setIsSuggestionsPanelOpen(!isSuggestionsPanelOpen)}
        />
      )}
    </div>
  );
};
