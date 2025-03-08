
import { useCallback, useRef } from 'react';
import { LineData } from '@/types/lineTypes';

export const useEditorInit = (lineData: LineData[], isDataReady: boolean) => {
  // Track initialization attempts
  const initAttemptsRef = useRef(0);
  const maxInitAttempts = 5;
  const isInitializedRef = useRef(false);
  
  // This function will be called by TextEditor when it's ready to initialize
  // Returns true if data is ready, false if still loading
  const initializeEditor = useCallback((editor: any): boolean => {
    if (!isDataReady || !editor) return false;
    
    // If already initialized, just return success
    if (isInitializedRef.current) {
      console.log('**** UseEditorInit **** Editor already initialized, skipping');
      return true;
    }
    
    // Increment init attempts
    initAttemptsRef.current++;
    console.log(`**** UseEditorInit **** Initializing editor with UUIDs (attempt ${initAttemptsRef.current}/${maxInitAttempts})`);
    
    try {
      // Check if DOM is ready for initialization
      const lines = editor.getLines(0);
      const paragraphs = editor.root?.querySelectorAll('p') || [];
      
      if (lines.length !== paragraphs.length || lines.length === 0) {
        console.log(`**** UseEditorInit **** Editor DOM not ready (lines: ${lines.length}, paragraphs: ${paragraphs.length})`);
        
        // If we haven't reached max attempts, schedule another try
        if (initAttemptsRef.current < maxInitAttempts) {
          const delayMs = 200 * initAttemptsRef.current; // Increasing delay for each attempt
          console.log(`**** UseEditorInit **** Scheduling retry in ${delayMs}ms`);
          
          setTimeout(() => {
            initializeEditor(editor);
          }, delayMs);
          
          return false;
        }
        
        console.warn(`**** UseEditorInit **** Giving up initialization after ${initAttemptsRef.current} attempts, proceeding anyway`);
      }
      
      // Only assign UUIDs to DOM elements if we have them from the database
      const appliedCount = applyUuidsToEditor(editor, lineData);
      
      console.log(`**** UseEditorInit **** Applied ${appliedCount} UUIDs to DOM elements`);
      
      // Make sure line tracking is initialized
      if (editor.lineTracking && typeof editor.lineTracking.initialize === 'function') {
        editor.lineTracking.initialize();
      }
      
      // Verify that UUIDs were applied
      const uuidVerificationCount = lines.filter(
        (line: any) => line.domNode && line.domNode.getAttribute('data-line-uuid')
      ).length;
      
      console.log(`**** UseEditorInit **** UUID verification: ${uuidVerificationCount}/${lines.length} lines have UUIDs`);
      
      // If verification failed or not all lines have UUIDs, schedule a delayed refresh
      if (uuidVerificationCount < lines.length && editor.lineTracking) {
        console.log(`**** UseEditorInit **** Some UUIDs missing, scheduling delayed refresh`);
        
        setTimeout(() => {
          console.log(`**** UseEditorInit **** Running delayed UUID refresh`);
          if (typeof editor.lineTracking.refreshLineUuids === 'function') {
            editor.lineTracking.refreshLineUuids(lineData);
            
            // Verify a second time
            setTimeout(() => {
              const lines = editor.getLines(0);
              const verifiedCount = lines.filter(
                (line: any) => line.domNode && line.domNode.getAttribute('data-line-uuid')
              ).length;
              
              console.log(`**** UseEditorInit **** After delayed refresh: ${verifiedCount}/${lines.length} lines have UUIDs`);
              
              // Force another refresh if we still don't have all UUIDs
              if (verifiedCount < lines.length && editor.lineTracking.forceRefreshUuids) {
                console.log(`**** UseEditorInit **** Still missing UUIDs, forcing final refresh`);
                editor.lineTracking.forceRefreshUuids();
              }
            }, 300);
          }
        }, 500);
      }
      
      isInitializedRef.current = true;
      return true;
    } catch (error) {
      console.error('**** UseEditorInit **** Error initializing editor UUIDs:', error);
      
      // Try again if we haven't reached max attempts
      if (initAttemptsRef.current < maxInitAttempts) {
        const delayMs = 200 * initAttemptsRef.current;
        console.log(`**** UseEditorInit **** Scheduling retry after error in ${delayMs}ms`);
        
        setTimeout(() => {
          initializeEditor(editor);
        }, delayMs);
      }
      
      return false;
    }
  }, [isDataReady, lineData]);
  
  // Helper function to apply UUIDs to the editor
  const applyUuidsToEditor = (editor: any, lineData: LineData[]): number => {
    const lines = editor.getLines(0);
    let appliedCount = 0;
    
    // Check if lineData and lines arrays match in length
    if (lines.length !== lineData.length) {
      console.log(`**** UseEditorInit **** Warning: Line count mismatch - DOM lines: ${lines.length}, lineData: ${lineData.length}`);
    }
    
    // Apply UUIDs to all available lines
    const minLength = Math.min(lines.length, lineData.length);
    
    // First pass: Apply UUIDs to DOM elements
    for (let index = 0; index < minLength; index++) {
      if (lines[index].domNode && lineData[index]) {
        const uuid = lineData[index].uuid;
        // Only set if the DOM element doesn't already have a uuid or has a wrong one
        const currentUuid = lines[index].domNode.getAttribute('data-line-uuid');
        if (!currentUuid || currentUuid !== uuid) {
          console.log(`**** UseEditorInit **** Setting line ${index + 1} UUID: ${uuid}`);
          lines[index].domNode.setAttribute('data-line-uuid', uuid);
          appliedCount++;
        }
        
        // Always set the line index attribute
        lines[index].domNode.setAttribute('data-line-index', String(index + 1));
        
        // Ensure our tracking maps are updated
        if (editor.lineTracking && typeof editor.lineTracking.setLineUuid === 'function') {
          editor.lineTracking.setLineUuid(index + 1, uuid, editor);
        }
      }
    }
    
    return appliedCount;
  };

  return { initializeEditor };
};
