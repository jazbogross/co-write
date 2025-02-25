import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SuggestionList } from './SuggestionList';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronLeft, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

// Quill configuration
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

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-editor-background text-black">
      {/* Toolbar */}
      <div className="w-48 bg-gray-800 border-r border-gray-700 p-4 space-y-2">
        <h3 className="text-sm font-semibold mb-4 text-white">Formatting</h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => formatText('bold', true)}
          >
            <Bold className="w-4 h-4 mr-2" />
            Bold
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => formatText('italic', true)}
          >
            <Italic className="w-4 h-4 mr-2" />
            Italic
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => formatText('align', false)}
          >
            <AlignLeft className="w-4 h-4 mr-2" />
            Left
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => formatText('align', 'center')}
          >
            <AlignCenter className="w-4 h-4 mr-2" />
            Center
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => formatText('align', 'right')}
          >
            <AlignRight className="w-4 h-4 mr-2" />
            Right
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 py-8 overflow-auto">
        <div className="w-a4 mx-auto">
          <div className="bg-editor-page shadow-lg p-8 min-h-a4-page flex">
            {/* Line Numbers */}
            <div className="pr-4 select-none text-right border-r border-gray-200 mr-4" style={{ minWidth: '30px' }}>
              {lineNumbers.map(num => (
                <div key={num} className="text-gray-400 text-xs" style={{ lineHeight: '1.5' }}>
                  {num}
                </div>
              ))}
            </div>
            {/* Editor */}
            <div className="flex-1">
              <ReactQuill
                ref={quillRef}
                value={content}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                className="h-full"
                theme="snow"
                style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  lineHeight: 1.5,
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

      {/* Suggestions Panel */}
      {isAdmin && (
        <div className={`transition-all duration-300 ${isSuggestionsOpen ? 'w-80' : 'w-12'}`}>
          <div className="h-full bg-gray-800 border-l border-gray-700">
            <button
              onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
              className="w-full p-3 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              {isSuggestionsOpen ? <ChevronRight /> : <ChevronLeft />}
            </button>
            {isSuggestionsOpen && (
              <div className="p-4">
                <SuggestionList scriptId={scriptId} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
