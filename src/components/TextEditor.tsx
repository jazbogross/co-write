import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EditorToolbar } from './editor/EditorToolbar';
import { LineNumbers } from './editor/LineNumbers';
import { SuggestionsPanel } from './editor/SuggestionsPanel';

const modules = {
  toolbar: false,
};

const formats = ['bold', 'italic', 'align'];

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  scriptId,
  onSuggestChange,
}) => {
  const quillRef = useRef(null);
  const [content, setContent] = useState(originalContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [lineCount, setLineCount] = useState(1);
  const { toast } = useToast();

  const handleChange = (content: string) => {
    setContent(content);
    const editor = quillRef.current?.getEditor();
    if (editor) {
      // Instead of counting all visual lines, count only deliberate block-level elements.
      // Here we assume that each <p> corresponds to a deliberate newline.
      const blocks = editor.root.querySelectorAll('p');
      setLineCount(blocks.length);
    }
  };

  const formatText = (format: string, value: any) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const format_value = editor.getFormat();
      if (format === 'align') {
        editor.format('align', value === format_value['align'] ? false : value);
      } else {
        editor.format(format, !format_value[format]);
      }
    }
  };

  const handleSubmit = async () => {
    if (content === originalContent) {
      toast({
        title: "No changes detected",
        description: "Please make some changes before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const githubAccessToken = session.provider_token;
        if (!githubAccessToken) {
          throw new Error('GitHub OAuth access token is missing');
        }

        const response = await supabase.functions.invoke('commit-script-changes', {
          body: {
            scriptId,
            content,
            githubAccessToken,
          }
        });

        if (response.error) throw response.error;

        onSuggestChange(content);
        toast({
          title: "Changes saved",
          description: "Your changes have been committed successfully",
        });
      } else {
        const response = await supabase.functions.invoke('create-change-suggestion', {
          body: {
            scriptId,
            content,
          }
        });

        if (response.error) throw response.error;

        toast({
          title: "Suggestion submitted",
          description: "Your suggestion has been submitted for review",
        });
        
        setContent(originalContent);
      }
    } catch (error: any) {
      console.error('Error submitting changes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveToSupabase = async () => {
    // This function has not yet been written.
    if (content === originalContent) {
      toast({
        title: "No changes detected",
        description: "Please make some changes before saving",
        variant: "destructive",
      });
      return;
    }
  }


    
  return (
    <>
    <div className='flex justify-between ml-16 mb-2'>
      <div className='flex space-x-2'>
        <EditorToolbar onFormat={formatText} />
      </div>
      <div className='flex space-x-2'>
        <Button
          variant="outline"
          size="sm"
          className="justify-end"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            isAdmin ? "Committing..." : "Submitting..."
          ) : (
            isAdmin ? "Save Changes" : "Suggest Changes"
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-end"
          onClick={saveToSupabase}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saveing..." : "Save Draft"}
        </Button>
      </div>
    </div>
    <div className="flex min-h-screen text-black">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto">          
          <div className="bg-editor-page p-8 min-h-a4-page flex ml-16">
            <LineNumbers count={lineCount} />
            <div className="flex-1">
              <ReactQuill
                ref={quillRef}
                value={content}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                theme="snow"
              />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <SuggestionsPanel
          isOpen={isSuggestionsOpen}
          scriptId={scriptId}
          onToggle={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
        />
      )}
    </div>
    </>
  );
};
