import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TextEditorActions } from './editor/TextEditorActions';
import { loadContent, saveContent } from '@/utils/deltaUtils';
import { normalizeContentForStorage } from '@/utils/suggestions/contentUtils';

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

  // Track whether we’re submitting (saving) changes
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Save a draft version to your "script_drafts" table
  const handleSaveDraft = async () => {
    if (!quillRef.current || !session?.user?.id) {
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

  // Save a new version (admin-only)
  const handleSaveVersion = () => {
    if (!quillRef.current || !onSaveVersion) return;
    const editor = quillRef.current.getEditor();
    const delta = editor.getContents();
    const content = JSON.stringify(delta);
    onSaveVersion(content);
  };

  return (
    <div className="space-y-0">
      {/* Toolbar & actions */}
      <TextEditorActions
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        currentFormat={currentFormat}     /* pass down current formatting */
        onFormat={handleFormat}
        onSubmit={handleSubmit}
        onSave={handleSaveDraft}
        onSaveVersion={handleSaveVersion}
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
  );
};
