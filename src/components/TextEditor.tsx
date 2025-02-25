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
      const lines = editor.getLines(0);
      setLineCount(lines.length);
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

  return (
    <div className="flex min-h-screen bg-editor-background text-black">
      <EditorToolbar onFormat={formatText} />

      <div className="flex-1 py-8 overflow-auto">
        <div className="w-a4 mx-auto">
          <div className="bg-editor-page shadow-lg p-8 min-h-a4-page flex">
            <LineNumbers count={lineCount} />
            <div className="flex-1">
              <ReactQuill
                ref={quillRef}
                value={content}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                theme="snow"
                style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  lineHeight: '18px',
                  color: '#000000',
                }}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                isAdmin ? "Committing..." : "Submitting..."
              ) : (
                isAdmin ? "Save Changes" : "Suggest Changes"
              )}
            </Button>
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
  );
};
