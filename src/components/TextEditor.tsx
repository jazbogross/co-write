
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
import { LineTrackingModule, EDITOR_MODULES } from './editor/LineTrackingModule';

// Register the module
LineTrackingModule.register(ReactQuill.Quill);

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

  useEffect(() => {
    const fetchUserAndLineData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }

      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('*')
          .eq('script_id', scriptId)
          .order('line_number', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedLineData = data.map(line => {
            let editedBy: string[] = [];
            if (line.edited_by) {
              if (Array.isArray(line.edited_by)) {
                editedBy = line.edited_by.map(id => String(id));
              }
            }
            
            return {
              uuid: line.id,
              lineNumber: line.line_number,
              content: line.content,
              originalAuthor: line.original_author || null,
              editedBy: editedBy
            };
          });
          
          setLineData(formattedLineData);
          
          const reconstructedContent = formattedLineData.map(line => line.content).join('\n');
          setContent(reconstructedContent);
        } else {
          initializeLineData();
        }
      } catch (error) {
        console.error('Error fetching line data:', error);
        initializeLineData();
      }
    };

    fetchUserAndLineData();
  }, [scriptId, originalContent]);

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

  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        lines.forEach((line, index) => {
          if (line.domNode && index < lineData.length) {
            line.domNode.setAttribute('data-line-uuid', lineData[index].uuid);
          }
        });
      }
    }
  }, [lineData, content]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const lines = editor.getLines(0);
      setLineCount(lines.length);
      
      const currentLineContents = lines.map(line => {
        return line.domNode ? line.domNode.textContent || '' : '';
      });
      
      updateLineData(currentLineContents);
    }
  };

  const updateLineData = (currentLineContents: string[]) => {
    const originalLines = originalContent.split('\n');
    
    const matchedOriginalLines = new Set<number>();
    
    const newLineData: LineData[] = currentLineContents.map((content, index) => {
      const trimmedContent = content.trim();
      let foundMatch = false;
      let matchedLineIndex = -1;
      
      for (let i = 0; i < originalLines.length; i++) {
        if (originalLines[i].trim() === trimmedContent && !matchedOriginalLines.has(i)) {
          matchedLineIndex = i;
          matchedOriginalLines.add(i);
          foundMatch = true;
          break;
        }
      }
      
      if (foundMatch && matchedLineIndex >= 0 && matchedLineIndex < lineData.length) {
        return {
          ...lineData[matchedLineIndex],
          lineNumber: index + 1,
          content: content
        };
      } else {
        return {
          uuid: uuidv4(),
          lineNumber: index + 1,
          content: content,
          originalAuthor: userId,
          editedBy: userId ? [userId] : []
        };
      }
    });
    
    setLineData(newLineData);
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

        await saveLinesToDatabase();

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
      await supabase
        .from('script_content')
        .delete()
        .eq('script_id', scriptId);
      
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
      const originalLines = originalContent.split('\n');
      
      const changes: Array<{
        type: 'modified' | 'added' | 'deleted';
        lineNumber: number;
        originalLineNumber?: number;
        content: string;
        uuid?: string;
      }> = [];
      
      for (let i = 0; i < lineData.length; i++) {
        const currentLine = lineData[i];
        
        if (i < originalLines.length) {
          if (currentLine.content.trim() !== originalLines[i].trim()) {
            changes.push({
              type: 'modified',
              lineNumber: currentLine.lineNumber,
              originalLineNumber: i + 1,
              content: currentLine.content,
              uuid: currentLine.uuid
            });
          }
        } else {
          changes.push({
            type: 'added',
            lineNumber: currentLine.lineNumber,
            content: currentLine.content,
            uuid: currentLine.uuid
          });
        }
      }
      
      if (lineData.length < originalLines.length) {
        const matchedOriginalLines = new Set<number>();
        
        for (let i = 0; i < lineData.length; i++) {
          const currentLine = lineData[i].content.trim();
          
          for (let j = 0; j < originalLines.length; j++) {
            if (!matchedOriginalLines.has(j) && currentLine === originalLines[j].trim()) {
              matchedOriginalLines.add(j);
              break;
            }
          }
        }
        
        for (let i = 0; i < originalLines.length; i++) {
          if (!matchedOriginalLines.has(i)) {
            changes.push({
              type: 'deleted',
              lineNumber: i + 1,
              originalLineNumber: i + 1,
              content: '',
            });
          }
        }
      }

      if (changes.length === 0) {
        throw new Error('No changes detected');
      }

      console.log('Detected changes:', changes);

      for (const change of changes) {
        const suggestionData = {
          script_id: scriptId,
          content: change.content,
          user_id: userId,
          line_uuid: change.uuid,
          status: 'pending',
          metadata: { 
            changeType: change.type,
            lineNumber: change.lineNumber,
            originalLineNumber: change.originalLineNumber
          }
        };

        const { error } = await supabase
          .from('script_suggestions')
          .insert(suggestionData);

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
        const serializableData = {
          lines: lineData.map(line => ({
            uuid: line.uuid,
            lineNumber: line.lineNumber,
            content: line.content,
            originalAuthor: line.originalAuthor,
            editedBy: line.editedBy
          })),
          fullContent: content
        };

        const { error } = await supabase
          .from('script_drafts')
          .insert({
            script_id: scriptId,
            content: serializableData,
            user_id: userId
          });

        if (error) throw error;

        toast({
          title: "Draft saved",
          description: "Your draft has been saved successfully",
        });
      } else {
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
      await supabase
        .from('script_suggestions')
        .delete()
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .eq('status', 'draft');
      
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
                modules={EDITOR_MODULES}
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
