import React, { useRef, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SuggestionsPanel } from './editor/SuggestionsPanel';
import { LineTrackingModule, EDITOR_MODULES } from './editor/LineTrackingModule';
import { EditorContainer } from './editor/EditorContainer';
import { EditorActions } from './editor/EditorActions';
import { useLineData, type LineData } from '@/hooks/useLineData';
import { extractLineContents, reconstructContent } from '@/utils/editorUtils';

// Register the module
LineTrackingModule.register(ReactQuill.Quill);

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
  const quillRef = useRef<ReactQuill>(null);
  const [content, setContent] = useState(originalContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [lineCount, setLineCount] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const { lineData, setLineData, updateLineContent } = useLineData(scriptId, originalContent, userId);

  useEffect(() => {
    if (lineData.length > 0) {
      const reconstructedContent = reconstructContent(lineData);
      setContent(reconstructedContent);
    }
  }, [lineData]);

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
  }, [lineData]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const lines = editor.getLines(0);
      setLineCount(lines.length);
      
      const currentLineContents = extractLineContents(lines);
      currentLineContents.forEach((content, index) => {
        // Only update the content of the line, preserving the UUID
        updateLineContent(index, content);
      });
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
      // Delete all existing line content
      await supabase
        .from('script_content')
        .delete()
        .eq('script_id', scriptId);
      
      // Create batch of lines to insert
      const linesToInsert = lineData.map(line => ({
        id: line.uuid, // Preserve the UUIDs
        script_id: scriptId,
        line_number: line.lineNumber,
        content: line.content,
        original_author: line.originalAuthor,
        edited_by: line.editedBy,
        metadata: {}
      }));

      // Insert all lines
      const { error } = await supabase
        .from('script_content')
        .insert(linesToInsert);

      if (error) throw error;

      // Update the script content as a whole
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
      // Get original content lines
      const originalLines = originalContent.split('\n');
      
      // Track all changes: additions, modifications, deletions
      const changes: Array<{
        type: 'modified' | 'added' | 'deleted';
        lineNumber: number;
        originalLineNumber?: number;
        content: string;
        uuid?: string;
      }> = [];
      
      // Find modified lines and added lines
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
      
      // Find deleted lines
      if (lineData.length < originalLines.length) {
        // Create a map of all line UUIDs currently in use
        const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
        
        // Get original line data from Supabase to find UUIDs of deleted lines
        const { data: originalLineData, error } = await supabase
          .from('script_content')
          .select('id, line_number, content')
          .eq('script_id', scriptId)
          .order('line_number', { ascending: true });
          
        if (error) throw error;
        
        if (originalLineData) {
          for (const line of originalLineData) {
            // If a line UUID from the database is not in our current line UUIDs, it was deleted
            if (!currentLineUUIDs.has(line.id)) {
              changes.push({
                type: 'deleted',
                lineNumber: line.line_number,
                originalLineNumber: line.line_number,
                content: '', // Empty content for deletion
                uuid: line.id
              });
            }
          }
        }
      }

      if (changes.length === 0) {
        throw new Error('No changes detected');
      }

      console.log('Detected changes:', changes);

      // Submit all changes as suggestions
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
      <EditorActions
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={formatText}
        onSubmit={handleSubmit}
        onSave={saveToSupabase}
      />
      
      <EditorContainer
        content={content}
        lineCount={lineCount}
        quillRef={quillRef}
        modules={EDITOR_MODULES}
        formats={formats}
        onChange={handleChange}
      />

      {isAdmin && (
        <SuggestionsPanel
          isOpen={isSuggestionsOpen}
          scriptId={scriptId}
          onToggle={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
        />
      )}
    </>
  );
};
