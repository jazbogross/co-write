
import React, { useRef, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EditorToolbar } from './editor/EditorToolbar';
import { LineNumbers } from './editor/LineNumbers';
import { SuggestionsPanel } from './editor/SuggestionsPanel';
import { v4 as uuidv4 } from 'uuid';

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

interface LineData {
  uuid: string;
  lineNumber: number;
  content: string;
  originalAuthor: string | null;
  editedBy: string[];
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
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user ID and existing line data on component mount
  useEffect(() => {
    const fetchUserAndLineData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }

      // Fetch line data for this script
      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('*')
          .eq('script_id', scriptId)
          .order('line_number', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Map the database data to our LineData format
          const formattedLineData = data.map(line => ({
            uuid: line.id,
            lineNumber: line.line_number,
            content: line.content,
            originalAuthor: line.original_author,
            editedBy: line.edited_by ? Array.isArray(line.edited_by) ? line.edited_by : [] : []
          }));
          setLineData(formattedLineData);
          
          // Reconstruct the content from the line data
          const reconstructedContent = formattedLineData.map(line => line.content).join('\n');
          setContent(reconstructedContent);
        } else {
          // Initialize line data from the original content
          initializeLineData();
        }
      } catch (error) {
        console.error('Error fetching line data:', error);
        // If there's an error, initialize from the original content
        initializeLineData();
      }
    };

    fetchUserAndLineData();
  }, [scriptId]);

  // Initialize line data from the original content
  const initializeLineData = () => {
    const lines = originalContent.split('\n');
    const initialLineData = lines.map((line, index) => ({
      uuid: uuidv4(),
      lineNumber: index + 1,
      content: line,
      originalAuthor: userId,
      editedBy: []
    }));
    setLineData(initialLineData);
  };

  const handleChange = (content: string) => {
    setContent(content);
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const lines = editor.getLines(0);
      setLineCount(lines.length);
      
      // Update line data based on the new content
      updateLineData(lines);
    }
  };

  const updateLineData = (quillLines: any[]) => {
    // Extract text content from each Quill line
    const newLines = quillLines.map((line, index) => {
      const lineContent = line.domNode.innerHTML;
      const existingLine = lineData.find((l, i) => i === index);
      
      if (existingLine) {
        // Update existing line
        return {
          ...existingLine,
          lineNumber: index + 1,
          content: lineContent,
          editedBy: existingLine.content !== lineContent && !existingLine.editedBy.includes(userId as string) && userId
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy
        };
      } else {
        // Create new line
        return {
          uuid: uuidv4(),
          lineNumber: index + 1,
          content: lineContent,
          originalAuthor: userId,
          editedBy: []
        };
      }
    });

    setLineData(newLines);
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

        // Save line data to database first
        await saveLinesToDatabase();

        // Then commit to GitHub
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
        // For non-admins, save suggestions
        await saveSuggestions();
        
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

  const saveLinesToDatabase = async () => {
    try {
      // Delete existing lines for this script
      await supabase
        .from('script_content')
        .delete()
        .eq('script_id', scriptId);
      
      // Insert new lines
      const linesToInsert = lineData.map(line => ({
        id: line.uuid,
        script_id: scriptId,
        line_number: line.lineNumber,
        content: line.content,
        original_author: line.originalAuthor,
        edited_by: line.editedBy,
        metadata: {}
      }));

      const { error } = await supabase
        .from('script_content')
        .insert(linesToInsert);

      if (error) throw error;

      // Update script content
      const { error: scriptError } = await supabase
        .from('scripts')
        .update({ content })
        .eq('id', scriptId);

      if (scriptError) throw scriptError;
    } catch (error) {
      console.error('Error saving lines to database:', error);
      throw error;
    }
  };

  const saveSuggestions = async () => {
    try {
      // Get changed lines
      const changedLines = lineData.filter(line => {
        const originalLine = originalContent.split('\n')[line.lineNumber - 1] || '';
        return line.content !== originalLine;
      });

      if (changedLines.length === 0) {
        throw new Error('No changes detected');
      }

      // Create suggestions for each changed line
      for (const line of changedLines) {
        const { error } = await supabase
          .from('script_suggestions')
          .insert({
            script_id: scriptId,
            content: line.content,
            user_id: userId,
            line_uuid: line.uuid
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving suggestions:', error);
      throw error;
    }
  };

  const saveToSupabase = async () => {
    if (content === originalContent) {
      toast({
        title: "No changes detected",
        description: "Please make some changes before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        // For admin, save a draft snapshot to the new script_drafts table
        const { error } = await supabase
          .from('script_drafts')
          .insert({
            script_id: scriptId,
            content: {
              lines: lineData,
              fullContent: content
            },
            user_id: userId
          });

        if (error) throw error;

        toast({
          title: "Draft saved",
          description: "Your draft has been saved successfully",
        });
      } else {
        // For non-admin, save line-by-line draft suggestions
        await saveLineDrafts();

        toast({
          title: "Draft saved",
          description: "Your draft suggestions have been saved",
        });
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveLineDrafts = async () => {
    try {
      // Delete existing line drafts for this user and script
      await supabase
        .from('script_suggestions')
        .delete()
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .eq('status', 'draft');
      
      // Insert new line drafts
      for (const line of lineData) {
        const originalLine = originalContent.split('\n')[line.lineNumber - 1] || '';
        
        if (line.content !== originalLine) {
          const { error } = await supabase
            .from('script_suggestions')
            .insert({
              script_id: scriptId,
              content: line.content,
              user_id: userId,
              line_uuid: line.uuid,
              status: 'draft'
            });

          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Error saving line drafts:', error);
      throw error;
    }
  };

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
          {isSubmitting ? "Saving..." : "Save Draft"}
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
