import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineNumbers } from './LineNumbers';
import { isDeltaObject, parseDeltaIfPossible } from '@/utils/editor';
import { combineDeltaContents } from '@/utils/editor/operations/deltaCombination';
import { DeltaContent } from '@/utils/editor/types';

interface TextEditorContentProps {
  content: any; // Can be string or Delta object
  lineCount: number;
  quillRef: React.RefObject<ReactQuill>;
  modules: any;
  formats: string[];
  onChange: (value: any) => void;
}

export const TextEditorContent: React.FC<TextEditorContentProps> = ({
  content,
  lineCount,
  quillRef,
  modules,
  formats,
  onChange,
}) => {
  console.log('📝 TextEditorContent rendering');
  console.log('📝 Content type:', typeof content, isDeltaObject(content) ? 'isDelta' : 'notDelta');
  console.log('📝 Line count:', lineCount);
  console.log('📝 Content length:', typeof content === 'string' ? content.length : 'N/A (Delta)');
  
  // Track editor mount state
  const isEditorMountedRef = useRef(false);
  const contentChangeRef = useRef(0);
  const initialContentSetRef = useRef(false);
  
  // Process content to ensure it's properly parsed if it's a Delta
  const processedContent = (() => {
    if (!content) return '';
    
    // If content is a stringified Delta, parse it
    if (typeof content === 'string' && content.startsWith('{') && content.includes('"ops"')) {
      try {
        return parseDeltaIfPossible(content);
      } catch (e) {
        console.error('Failed to parse Delta content:', e);
        return content;
      }
    }
    
    // Otherwise return as is
    return content;
  })();
  
  // Handle editor initialization
  const handleEditorInit = () => {
    console.log('📝 TextEditorContent: Editor mounted');
    isEditorMountedRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    
    if (editor.lineTracking) {
      console.log('📝 TextEditorContent: Initializing line tracking');
      if (typeof editor.lineTracking.initialize === 'function') {
        editor.lineTracking.initialize();
      }
    }
    
    // If content is a Delta object, set it properly
    if (isDeltaObject(processedContent)) {
      console.log('📝 TextEditorContent: Setting Delta content directly on editor after mount');
      initialContentSetRef.current = true;
      
      // Turn on programmatic update mode
      if (editor.lineTracking && typeof editor.lineTracking.setProgrammaticUpdate === 'function') {
        editor.lineTracking.setProgrammaticUpdate(true);
      }
      
      // Set the Delta content
      editor.setContents(processedContent);
      
      // Turn off programmatic update mode
      if (editor.lineTracking && typeof editor.lineTracking.setProgrammaticUpdate === 'function') {
        editor.lineTracking.setProgrammaticUpdate(false);
      }
    } else if (typeof processedContent === 'object' && 'ops' in processedContent) {
      console.log('📝 TextEditorContent: Setting parsed object with ops directly on editor after mount');
      initialContentSetRef.current = true;
      
      // Turn on programmatic update mode
      if (editor.lineTracking && typeof editor.lineTracking.setProgrammaticUpdate === 'function') {
        editor.lineTracking.setProgrammaticUpdate(true);
      }
      
      // Set the Delta content
      editor.setContents(processedContent);
      
      // Turn off programmatic update mode
      if (editor.lineTracking && typeof editor.lineTracking.setProgrammaticUpdate === 'function') {
        editor.lineTracking.setProgrammaticUpdate(false);
      }
    }
  };
  
  // Only trigger onChange when content actually changes
  const handleContentChange = (newContent: any, delta: any, source: string) => {
    contentChangeRef.current++;
    const changeId = contentChangeRef.current;
    
    console.log(`📝 ReactQuill onChange - source: ${source}, delta ops: ${delta.ops.length}, changeId: ${changeId}`);
    
    // Skip programmatic changes to prevent feedback loops
    if (source === 'user') {
      onChange(newContent);
    } else {
      console.log(`📝 Skipping non-user content change, source: ${source}`);
    }
  };
  
  // Handle component mount effect
  useEffect(() => {
    if (quillRef.current && !isEditorMountedRef.current) {
      handleEditorInit();
    }
  }, [quillRef.current]);
  
  // When processed content changes and editor is already mounted, update content
  useEffect(() => {
    if (isEditorMountedRef.current && !initialContentSetRef.current) {
      const editor = quillRef.current?.getEditor();
      if (!editor || !processedContent) return;
      
      console.log('📝 TextEditorContent: Content changed, updating editor');
      
      // Turn on programmatic update mode if available
      if (editor.lineTracking && typeof editor.lineTracking.setProgrammaticUpdate === 'function') {
        editor.lineTracking.setProgrammaticUpdate(true);
      }
      
      // Set content based on type
      if (isDeltaObject(processedContent)) {
        console.log('📝 TextEditorContent: Setting Delta content on update');
        initialContentSetRef.current = true;
        editor.setContents(processedContent);
      } else if (typeof processedContent === 'object' && 'ops' in processedContent) {
        console.log('📝 TextEditorContent: Setting object with ops on update');
        initialContentSetRef.current = true;
        editor.setContents(processedContent);
      } else if (typeof processedContent === 'string') {
        console.log('📝 TextEditorContent: Setting text content on update');
        initialContentSetRef.current = true;
        
        // Check if the string might be multiple Delta objects stringified together
        if (processedContent.includes('{"ops":[') && processedContent.includes('],[')) {
          try {
            // Try to parse as multiple Delta objects
            const deltaStrings = processedContent.split(/(?<=})\s*(?=\{)/);
            const deltas = deltaStrings.map(str => {
              try {
                return JSON.parse(str);
              } catch (e) {
                return null;
              }
            }).filter(delta => delta && delta.ops);
            
            if (deltas.length > 0) {
              // Combine the Delta objects
              const combinedDelta = combineDeltaContents(deltas);
              if (combinedDelta) {
                console.log('📝 TextEditorContent: Parsed multiple Delta objects from string');
                editor.setContents(combinedDelta);
              } else {
                editor.setText(processedContent);
              }
            } else {
              editor.setText(processedContent);
            }
          } catch (e) {
            console.error('Error parsing multiple Deltas:', e);
            editor.setText(processedContent);
          }
        } else {
          editor.setText(processedContent);
        }
      }
      
      // Turn off programmatic update mode
      if (editor.lineTracking && typeof editor.lineTracking.setProgrammaticUpdate === 'function') {
        editor.lineTracking.setProgrammaticUpdate(false);
      }
    }
  }, [processedContent, isEditorMountedRef.current, quillRef.current]);
  
  // Apply line UUIDs from lineData whenever lineCount changes
  useEffect(() => {
    if (!isEditorMountedRef.current) return;
    
    const editor = quillRef.current?.getEditor();
    if (editor && editor.lineTracking) {
      if (typeof editor.lineTracking.refreshLineUuids === 'function') {
        // Give the editor a moment to update its DOM before refreshing UUIDs
        setTimeout(() => {
          // Fetch the lineData array from the editor or state
          const domUuids = editor.lineTracking.getDomUuidMap();
          console.log(`📝 TextEditorContent: After content update, found ${domUuids.size} UUIDs in DOM`);
        }, 100);
      }
    }
  }, [lineCount]);

  // Log if content changes
  useEffect(() => {
    console.log(`📝 TextEditorContent: Content updated, type:`, typeof processedContent);
    if (typeof processedContent === 'string' && processedContent.length > 0) {
      console.log(`📝 Content preview:`, processedContent.substring(0, 50) + '...');
    } else if (isDeltaObject(processedContent)) {
      console.log(`📝 Content preview (Delta):`, JSON.stringify(processedContent).substring(0, 50) + '...');
    }
  }, [processedContent]);
  
  return (
    <div className="flex min-h-screen text-black">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto">          
          <div className="bg-editor-page p-8 min-h-a4-page flex ml-16">
            <LineNumbers count={lineCount} />
            <div className="flex-1">
              <ReactQuill
                ref={quillRef}
                value={processedContent}
                onChange={handleContentChange}
                modules={modules}
                formats={formats}
                theme="snow"
                placeholder="Start typing or loading content..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
