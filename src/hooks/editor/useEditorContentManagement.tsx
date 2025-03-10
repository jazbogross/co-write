
import { useState, useEffect, useCallback, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';
import { useLineMatching } from '@/hooks/useLineMatching';

export const useEditorContentManagement = (
  initialContent: string,
  scriptId: string,
  lineData: LineData[],
  setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
  editorReady: boolean,
  refreshEditor: () => void
) => {
  // State
  const [content, setContent] = useState<string | DeltaContent>(initialContent);
  const [lineCount, setLineCount] = useState(1);
  const [mounted, setMounted] = useState(false);
  const isUpdatingEditorRef = useRef(false);
  
  // Utilities for line matching
  const { findBestMatchingLine } = useLineMatching();
  
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }
  }, []);

  // Mark the editor for full content update
  const markForFullContentUpdate = useCallback(() => {
    isUpdatingEditorRef.current = true;
  }, []);
  
  // Update line contents based on changes
  const updateLineContents = useCallback((lineData: LineData[], newText: string) => {
    let lines = newText.split('\n');
    setLineCount(lines.length);
    
    // If there are no existing lines, create initial ones
    if (lineData.length === 0) {
      return lineData;
    }
    
    // Apply changes to existing lines
    const updatedLineData = [...lineData];
    
    // Ensure we have the right number of lines
    while (updatedLineData.length < lines.length) {
      // Create a new line with UUID
      const newLineIndex = updatedLineData.length;
      updatedLineData.push({
        uuid: crypto.randomUUID(),
        lineNumber: newLineIndex + 1,
        content: lines[newLineIndex],
        originalAuthor: null,
        editedBy: []
      });
    }
    
    // Remove excess lines if needed
    if (updatedLineData.length > lines.length) {
      updatedLineData.splice(lines.length);
    }
    
    // Update content of each line
    for (let i = 0; i < lines.length; i++) {
      updatedLineData[i].lineNumber = i + 1;
      updatedLineData[i].content = lines[i];
    }
    
    return updatedLineData;
  }, []);
  
  // Enable content flushing to line data
  const flushContentToLineData = useCallback(() => {
    if (!editorReady) return false;
    
    // Handle different content formats
    let plainText: string;
    
    if (typeof content === 'string') {
      plainText = content;
    } else if (isDeltaObject(content)) {
      plainText = extractPlainTextFromDelta(content);
    } else {
      console.error('Unknown content format:', content);
      return false;
    }
    
    const updatedLines = updateLineContents(lineData, plainText);
    setLineData(updatedLines);
    
    return true;
  }, [content, lineData, setLineData, updateLineContents, editorReady]);
  
  // Call this to update editor content
  const updateEditorContent = useCallback((newContent: string | DeltaContent) => {
    setContent(newContent);
    
    // If it's a string, also update line data
    if (typeof newContent === 'string') {
      const updatedLines = updateLineContents(lineData, newContent);
      setLineData(updatedLines);
    }
    
    // Refresh the editor view if needed
    refreshEditor();
    
    return true;
  }, [lineData, setLineData, updateLineContents, refreshEditor]);
  
  // Called when content changes in the editor
  const handleChange = useCallback((newContent: string | DeltaContent) => {
    // Update content state
    setContent(newContent);
    
    // If it's a Delta object, we extract plain text for line data
    if (isDeltaObject(newContent)) {
      const plainText = extractPlainTextFromDelta(newContent);
      const lines = plainText.split('\n');
      setLineCount(lines.length);
    } else if (typeof newContent === 'string') {
      const lines = newContent.split('\n');
      setLineCount(lines.length);
    }
  }, []);
  
  return {
    content,
    setContent,
    lineCount,
    updateLineContents,
    flushContentToLineData,
    updateEditorContent,
    handleChange,
    isUpdatingEditorRef,
    markForFullContentUpdate
  };
};
